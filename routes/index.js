var express = require('express');
var router = express.Router();

const R = require('ramda');
const { check, validationResult } = require('express-validator'); // for user input validation

const mongoose = require('mongoose');
const Course = require('./models/course');

const puppeteer = require('puppeteer');
const { clear } = require('console');

const COURSE_SELECTOR = '#courseCode';
const SESSION_SELECTOR = '#js-modal-page > div > div.topHalf > div.wrapper > div.filterControls > div.primary > div.form-group.filterSec > div.selectize-control.form-control.multi.plugin-remove_button > div.selectize-input.items.not-full.has-options';
const SESSION_SELECTOR_FINAL = '#js-modal-page > div > div.topHalf > div.wrapper > div.filterControls > div.primary > div.form-group.filterSec > div.selectize-control.form-control.multi.plugin-remove_button > div.selectize-dropdown.multi.form-control.plugin-remove_button > div';
const BUTTON_SELECTOR = '#searchButton';

var temp_err = {};
var course_arr = [];
var session_arr = [];
var come_back = false;

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

    console.log("********** courses before cleaning:" + JSON.stringify(courses));
    //new: want to remove dummy/duplicate section codes
    for (var course in courses) {
      var set = [];  // temp arr to store distinct lecture sections
      
      for (var section in courses[course]) {
        console.log("initial set:")
        console.log(set);
        var s = courses[course][section].join();
        console.log("current section string to evaluate:")
        console.log(s);
        console.log(set.includes(s));
        if (set.includes(s)) {  // note that includes() cannot check for nested arr so we use s which is a string!
          delete courses[course][section];  // remove identical timed section from the course
        } else {
          set.push(s); // add this section info string to the set arr
        }
      }
      console.log("final set:")
      console.log(set);
    }
    console.log("*/********* courses after cleaning:" + JSON.stringify(courses));

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
          // console.log(JSON.stringify(copy)); // initial timetable
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
            // console.log(JSON.stringify(copy)); // LEC0101 planned
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
    var colors_arr = ["lightpink", "coral", "mediumseagreen", "burlywood", "skyblue", "gold"];
    var colors = {};
    var counter = 0;
    for (var key in courses) {
      if (!(key in colors)) { // if the course is not there yet
        colors[key] = colors_arr[counter];  // add the key-value pair for course-colour
        counter++;
      }
    }
    // console.log(JSON.stringify(colors)); // {"csc309": "lightpink", "csc373": ...}
    
    res.render('view_a_timetable', {
        "myTimetables" : potential,  // arr of timetables
        "myColors" : colors
    });
  }); 
});


/* GET new_course page, which is also the homepage, for entering course codes. */
router.get('/', function(req, res) {
  const errors = temp_err ? temp_err : false;
  temp_err = {};

  const cond = come_back;
  come_back = false;

  res.render('new_course', { errors: errors, come_back: cond, prev_courses: course_arr, prev_sessions: session_arr});
});

/* POST to Add Course Info Service */
router.post('/addcourse', 
[
  check('course1')
    .trim()
    .isLength({ max: 6 })  // cannot set minimum because it's okay to not enter a course
    .escape()
    .withMessage('Invalid course code'),
  check('session1')
    .trim()
      .isLength({ max: 1 })
      .escape()
      .withMessage('Invalid session code'),
  check('course2')
    .trim()
    .isLength({ max: 6 })
    .escape()
    .withMessage('Invalid course code'),
  check('session2')
    .trim()
      .isLength({ max: 1 })
      .escape()
      .withMessage('Invalid session code'),
  check('course3')
    .trim()
    .isLength({ max: 6 })
    .escape()
    .withMessage('Invalid course code'),
  check('session3')
    .trim()
      .isLength({ max: 1 })
      .escape()
      .withMessage('Invalid session code'),
  check('course4')
    .trim()
    .isLength({ max: 6 })
    .escape()
    .withMessage('Invalid course code'),
  check('session4')
    .trim()
      .isLength({ max: 1 })
      .escape()
      .withMessage('Invalid session code'),
  check('course5')
    .trim()
    .isLength({ max: 6 })
    .escape()
    .withMessage('Invalid course code'),
  check('session5')
    .trim()
      .isLength({ max: 1 })
      .escape()
      .withMessage('Invalid session code'),
  check('course6')
    .trim()
    .isLength({ max: 6 })
    .escape()
    .withMessage('Invalid course code'),
  check('session6')
    .trim()
      .isLength({ max: 1 })
      .escape()
      .withMessage('Invalid session code')
],
async function(req, res) {

  const errors = validationResult(req);

  // Set our internal DB variable
  var db = req.db;

  // Get our form values. These rely on the "name" attributes
  course_arr = [req.body.course1, req.body.course2, req.body.course3, req.body.course4, req.body.course5, req.body.course6];
  session_arr = [req.body.session1, req.body.session2, req.body.session3, req.body.session4, req.body.session5, req.body.session6];
  if (!errors.isEmpty()) {
    temp_err = { errors: errors.array() };
    return res.redirect('/');
  }
  var copy_course = course_arr.slice();
  var copy_session = session_arr.slice();
  for (let i = 0; i < course_arr.length; i++) {
    if (course_arr[i] == '') {  // if the input is empty, cut it off the arrs
      let index = copy_course.indexOf(course_arr[i], 0);
      copy_course.splice(index, 1);
      copy_session.splice(index, 1);
    }
  }
  course_arr = R.clone(copy_course);
  session_arr = R.clone(copy_session);

  // Set our collection
  var collection = db.get('courses');

  // remove previous from DB
  collection.remove({});

  // previous run()
  // run(course_arr, session_arr, collection);
  const browser = await puppeteer.launch({
    args: ['--no-sandbox'], // for heroku app
    headless: true // when upload to server, set to true
  });
  const page = await browser.newPage();

  await page.goto('https://timetable.iit.artsci.utoronto.ca');
  // await page.screenshot({ path: 'archive/utoronto.png' });

  for (let k = 0; k < course_arr.length; k++) {  // each course
      await page.goto('https://timetable.iit.artsci.utoronto.ca');
      
      await page.click(COURSE_SELECTOR);
      await page.keyboard.type(course_arr[k]);

      await page.click(SESSION_SELECTOR);
      await page.keyboard.type(session_arr[k]);
      await page.click(SESSION_SELECTOR_FINAL);

      await page.click(BUTTON_SELECTOR);

      await page.waitFor(1000);

      let sections_len = await page.evaluate(() => {return document.querySelectorAll(".perMeeting").length}); // extracts all sections to the sections obj
      console.log(sections_len);

      for (let i = 0; i < sections_len; i++) { // each section
          let section = await page.evaluate((i) => {return document.querySelectorAll(".perMeeting")[i].querySelector(".colCode").innerHTML;},i);
          // console.log(section);
          if (section.slice(0,3) == "TUT") {
            break; // if reaching a tutorial section, ignore it and all sections following; go to the next course
          }
          if (section.slice(6) == "2") {
            continue; // if the lecture section is a duplicate, ignore it and continue to the next section.
          }
          let classes_len = await page.evaluate((i) => {return document.querySelectorAll(".perMeeting")[i].querySelectorAll(".colTime .colDay").length},i);
          console.log(classes_len);

          for (let j = 0; j < classes_len; j++) {
              console.log(j);
              let day = await page.evaluate((i,j) => {return document.querySelectorAll(".perMeeting")[i].querySelectorAll(".colTime .colDay")[j].querySelector(".weekDay").innerHTML;}, i,j);
              console.log(day);
              if (day.slice(1,2) == '.') {
                // the lecture section is asychronous, go to next section
                break;
              }
              let start = await page.evaluate((i,j) => {return document.querySelectorAll(".perMeeting")[i].querySelectorAll(".colTime .colDay")[j].querySelectorAll(".dayInfo time")[0].innerHTML;}, i,j);
              console.log(start);
              let end = await page.evaluate((i,j) => {return document.querySelectorAll(".perMeeting")[i].querySelectorAll(".colTime .colDay")[j].querySelectorAll(".dayInfo time")[1].innerHTML;}, i,j);
              console.log(end);

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
  res.redirect('view_a_timetable');
});

/* GET go back to courses input page. */
router.post('/go_back', function(req, res) {
  come_back = true;
  res.redirect('/');
});

module.exports = router;
