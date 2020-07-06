var express = require('express');
var router = express.Router();

const R = require('ramda');

const mongoose = require('mongoose');
const Course = require('./models/course');

const puppeteer = require('puppeteer');
const { clear } = require('console');

const COURSE_SELECTOR = '#courseCode';
const SESSION_SELECTOR = '#js-modal-page > div > div.topHalf > div.wrapper > div.filterControls > div.primary > div.form-group.filterSec > div.selectize-control.form-control.multi.plugin-remove_button > div.selectize-input.items.not-full.has-options';
const SESSION_SELECTOR_FINAL = '#js-modal-page > div > div.topHalf > div.wrapper > div.filterControls > div.primary > div.form-group.filterSec > div.selectize-control.form-control.multi.plugin-remove_button > div.selectize-dropdown.multi.form-control.plugin-remove_button > div';
const BUTTON_SELECTOR = '#searchButton';

const SECTION_SELECTOR = '#courses > div > table > tbody > tr:nth-child(SECTION_INDEX) > td > table > tbody > tr:nth-child(2) > td.colCode';
const DAY_SELECTOR = '#courses > div > table > tbody > tr:nth-child(SECTION_INDEX) > td > table > tbody > tr:nth-child(2) > td.colTime > ul > li:nth-child(CLASS_INDEX) > span.weekDay';
const START_SELECTOR = '#courses > div > table > tbody > tr:nth-child(SECTION_INDEX) > td > table > tbody > tr:nth-child(2) > td.colTime > ul > li:nth-child(CLASS_INDEX) > span.dayInfo > time:nth-child(1)';
const END_SELECTOR = '#courses > div > table > tbody > tr:nth-child(SECTION_INDEX) > td > table > tbody > tr:nth-child(2) > td.colTime > ul > li:nth-child(CLASS_INDEX) > span.dayInfo > time:nth-child(2)';
const LENGTH_SELECTOR = 'tbody';
const LEN_CLASS_SELECTOR = '#courses > div > table > tbody > tr:nth-child(SECTION_INDEX) > td > table > tbody > tr:nth-child(2) > td.colTime > ul >li';


// webscrap course info from utoronto official website
async function run(course_arr, session_arr, collection) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox'], // for heroku app
    headless: true // when upload to server, set to true
  });
  const page = await browser.newPage();

  await page.goto('https://timetable.iit.artsci.utoronto.ca');
  // await page.screenshot({ path: 'archive/utoronto.png' });

  for (let k = 0; k < course_arr.length; k++) {
      await page.goto('https://timetable.iit.artsci.utoronto.ca');
      
      await page.click(COURSE_SELECTOR);
      await page.keyboard.type(course_arr[k]);

      await page.click(SESSION_SELECTOR);
      await page.keyboard.type(session_arr[k]);
      await page.click(SESSION_SELECTOR_FINAL);

      await page.click(BUTTON_SELECTOR);

      await page.waitFor(1000);

      let listLength = await page.evaluate((sel) => {
          return document.getElementsByTagName(sel).length;
      }, LENGTH_SELECTOR);

      let i = await page.evaluate((sel) => {
        if (document.querySelectorAll("#courses > div > table > tbody > tr.pbot10.webInstruct").length > 0) {
          // if there is the additional timetable instructions section/row, start index i = 5
          return 5;
        } else {
          return 4;
        }
      });

      for (i; i <= listLength; i++) {
          console.log(i);
          let sectionSelector = SECTION_SELECTOR.replace("SECTION_INDEX", i);
          let section = await page.evaluate((sel) => {
              return document.querySelector(sel).innerHTML;
          }, sectionSelector);
          console.log(section);

          let classLength = await page.evaluate((sel) => {
              return document.querySelectorAll(sel).length;
          }, LEN_CLASS_SELECTOR.replace("SECTION_INDEX", i));
          for (let j = 1; j <= classLength; j++) {
              console.log(j);
              let daySelector = DAY_SELECTOR.replace("SECTION_INDEX", i).replace("CLASS_INDEX", j);
              let startSelector = START_SELECTOR.replace("SECTION_INDEX", i).replace("CLASS_INDEX", j);
              let endSelector = END_SELECTOR.replace("SECTION_INDEX", i).replace("CLASS_INDEX", j);
              let day = await page.evaluate((sel) => {
                  return document.querySelector(sel).innerHTML;
              }, daySelector);
              let start = await page.evaluate((sel) => {
                  return document.querySelector(sel).innerHTML;
              }, startSelector);
              let end = await page.evaluate((sel) => {
                  return document.querySelector(sel).innerHTML;
              }, endSelector);
              console.log(day, start, end);

              collection.insert({
                  course: course_arr[k],
                  session: session_arr[k],
                  section: section,
                  class: { class_day: day, class_start: start, class_end: end},
                  dateCrawled: new Date(),
                  code: k+"-"+i+"-"+j
              }, function (err, doc) {
                if (err) {
                    res.send("There was a problem adding the information to the database.");
                }
              }
              );
          }
      }
  }
  browser.close();
}

// /* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'Express' });
// });

/* GET view_a_timetable page. */
router.get('/view_a_timetable', function(req, res) {
  var db = req.db;
  var collection = db.get('courses');
  collection.find({},{},function(e,docs){
  /*  timetables: {"Monday":[9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21], "Tuesday": [], ...} fill with course_section String
    courses: {course_code1: {section_code1: [[class_day, class_start_sliced, class_end_sliced], ...], section_code2: List[List[str, int, int]]}
    potential is an arr of timetables */

    // initialize data structure for courses
    courses = {};
    for (let i = 0; i < docs.length; i++) {
      var item = docs[i];
      if (!(item.course in courses)) {
        courses[item.course] = {};
      }
      if (!(item.section in courses[item.course])) {
        courses[item.course][item.section] = [];
      }
      courses[item.course][item.section].push([
        item.class.class_day, 
        parseInt(item.class.class_start.slice(0,2), 10), 
        parseInt(item.class.class_end.slice(0,2), 10)
      ])
    }

    // initialize a potential timetable
    timetable = {
      "Monday" : [],
      "Tuesday" : [],
      "Wednesday" : [],
      "Thursday" : [],
      "Friday" : []
    };
    for (var key in timetable) {
      for (let i = 9; i <= 21; i++){
        timetable[key].push(i);
      }
    }

    // add to timetable or give it to the potential list
    potential = [R.clone(timetable)]; // arr of timetables
    console.log(potential.join()); // initial timetable
    for (var key in courses) {
      var course = courses[key];
      console.log(key); // csc309
      var replace_potential = []; // gathering all timetables up to and including this course
      for (var key2 in course) {
        if (key2.slice(0,3) == "TUT") {
          break; // if reaching a tutorial section, ignore it and all sections following; go to the next course
        }  // TO DO: include tut sections in timetabling.
        var section = course[key2];
        console.log(key2); // LEC0101
        for (let k = 0; k < potential.length; k++) { // check each existing timetable combination in the potential arr
          var copy = R.clone(potential[k]); // make a copy of the timetable to check if classes in this section are compatible
          console.log(JSON.stringify(copy)); // initial timetable
          var conflict = false; // conflict in class time of this section
          for (let i = 0; i < section.length && !conflict; i++) { // iterate thru each class time arr only if there's no conflict
            var myclass = section[i];
            console.log(myclass[0]); // Monday
            for (let j = myclass[1]; j < myclass[2]; j++) { // j is the hrs occupied
              console.log(j); // 15
              var day_arr = copy[myclass[0]]
              if (!(day_arr.includes(j))) {
                conflict = true;
                break; // check the next possible section of this course
              } else {
                day_arr.splice(day_arr.indexOf(j,0), 1, key + '-' + key2); // replace placeholder int  with course-section code str
                console.log(day_arr.join()); // [9,10,11,12,13,14,'csc309-LEC0101',16]
              }
            }
          }
          if (!conflict) {
            console.log(JSON.stringify(copy)); // LEC0101 planned
            replace_potential.push(R.clone(copy)); // add the valid timetable to the replace_potential list
          } // else if there is conflict, do nothing & move on to check compatibility of this section with another previous timetable combination
        }
      }
      potential = R.clone(replace_potential);  // replace original arr with the new arr containing updated valid timetables
      console.log("<-------timetable arr updated successfully------->"); //
      console.log(potential.length); // number of timetables
    }
    // the potential arr now contains all valid timetables. 

    // match color to course
    var colors_arr = ["lightpink", "aquamarine", "aqua", "burlywood", "skyblue"];
    var colors = {};
    var counter = 0;
    for (var key in courses) {
      if (!(key in colors)) { // if the course is not there yet
        colors[key] = colors_arr[counter];  // add the key-value pair for course-colour
        counter++;
      }
    }
    console.log(JSON.stringify(colors)); // {"csc309": "lightpink", "csc373": ...}
    
    res.render('view_a_timetable', {
        "myTimetables" : potential,  // arr of timetables
        "myColors" : colors
    });
  }); 
});


/* GET new_course page, which is also the homepage, for entering course codes. */
router.get('/', function(req, res) {
  res.render('new_course', { title: 'Add New Course' });
});

/* POST to Add Course Info Service */
router.post('/addcourse', function(req, res) {

  // Set our internal DB variable
  var db = req.db;

  // Get our form values. These rely on the "name" attributes
  var course_arr = [req.body.course1, req.body.course2, req.body.course3, req.body.course4, req.body.course5, req.body.course6];
  var session_arr = [req.body.session1, req.body.session2, req.body.session3, req.body.session4, req.body.session5, req.body.session6];
  for (let i = 0; i < course_arr.length; i++) {
    if (course_arr[i] == '') {  // if the input is empty, cut it off the arrs
      course_arr.splice(i, (course_arr.length - i));
      session_arr.splice(i, (course_arr.length - i));
    }
  }

  // Set our collection
  var collection = db.get('courses');

  // remove previous from DB
  collection.remove({});

  // previous run()
  run(course_arr, session_arr, collection);

  res.redirect('view_a_timetable');

});


module.exports = router;
