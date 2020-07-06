# timetabling_tool
This is a web app designed for the University of Toronto students to plan for undergraduate courses. It outputs all possible timetables for the specified courses entered by the user.

To use this tool, please follow these steps:
1. Go to University of Toronto's official Timetable or Academic Calendar to confirm your courses availability and session offered (Fall/Winter/Year).
2. Go to the web app hosted by Heroku at https://shielded-cove-69232.herokuapp.com and enter the course code & session. Note that you could only plan Fall courses or Winter courses at the same time. Click the "Submit" button.
3. Wait for around 20 seconds and then refresh the browser to view all the possible timetables without conflicts.

Note: 
- Tutorial sections are not included in the timetable.
- The web app current doesn't support multiple users at the same time.
- All course information is taken from the official Timetable at https://timetable.iit.artsci.utoronto.ca.
- Packages used in this project are not uploaded to this repo due to the size. Please see below for more details.

Technologies used include the following:
Node.js, Express.js, Mango DB (mLab), EJS/HTML, CSS
puppeteer, monk, express-generator/express
Heroku
