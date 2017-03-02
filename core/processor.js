var moment = require('moment')

function processTime(sjtuTime) {
    var time = moment.unix(sjtuTime);
    return time.format();
}

function processLesson(sjtuLesson) {
    var events = [];
    sjtuLesson.classes.forEach(function(entry) {
        var evt = {
            "start": {
                "dateTime": processTime(entry.schedule.start)
            },
            "end": {
                "dateTime": processTime(entry.schedule.finish)
            },
            "location": entry.classroom.name,
            "colorId": "1",  // Blue
            "summary": sjtuLesson.course.name,
        };
        events.push(evt);
    });
    return events;
}

function processExam(sjtuExam) {
    var evt = {
        "start": {
            "dateTime": processTime(sjtuExam.schedule.start)
        },
        "end": {
            "dateTime": processTime(sjtuExam.schedule.finish)
        },
        "location": sjtuExam.classroom.name,
        "colorId": "6",  // Orange
        "summary": sjtuExam.lesson.course.name + " Exam"
    };
    return evt;
}
