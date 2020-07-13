# timetabling_tool
This is a web app designed for the University of Toronto students to plan for undergraduate courses. It outputs all possible timetables for the specified courses entered by the user.

To use this tool, please follow these steps:
1. Go to University of Toronto's official Timetable or Academic Calendar to confirm your courses availability, session offered (F/S/Y), and online-synchromous mode of delivery.
2. Go to the web app hosted by Heroku at https://uoft-course-timetabling-tool.herokuapp.com and enter the course code & session. Note that you could only plan Fall courses or Winter courses at the same time. Click the "Timetable >>" button.
3. Wait for around 10 seconds for loading all the possible timetables that are without conflicts. If it doesn't show up, return to previous input page and resubmit.

Note: 
- Tutorial and asynchronous sections are not included in the timetable.
- The web app current doesn't support multiple users at the same time.
- All course information is taken from the official Timetable at https://timetable.iit.artsci.utoronto.ca.
- Packages used in this project are not uploaded to this repo due to the size. Please see below for more details.

Technologies used include the following:
Node.js, Express.js, Mango DB (mLab), EJS/HTML, CSS;
puppeteer, monk, express-generator/express;
Heroku
