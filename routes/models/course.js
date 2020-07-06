const mongoose = require('mongoose');

let courseSchema = new mongoose.Schema({
    course: String,
    session: String,
    section: String,
    class: { class_day: String,
    class_start: String,
    class_end: String },
    dateCrawled: Date,
    code: String
});

let Course = mongoose.model('Course', courseSchema);

module.exports = Course;