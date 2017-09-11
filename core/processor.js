var moment = require('moment-timezone')
var fs = require('fs');
var sjtuSchedule;

function processWeekDay(sjtuTime, time) {
    time.week(sjtuSchedule.termStart.week() + sjtuTime.week - 1);
    time.day(sjtuTime.day);
}

function processTimeStart(sjtuTime) {
    var time = moment(sjtuSchedule.classes[sjtuTime.period][0], "HH:mm");
    processWeekDay(sjtuTime, time);
    return time.format();
}

function processTimeEnd(sjtuTime) {
    var time = moment(sjtuSchedule.classes[sjtuTime.period][1], "HH:mm");
    processWeekDay(sjtuTime, time);
    return time.format();
}

function processLesson(sjtuLesson, callback) {
    var events = [];
    console.log(sjtuLesson.bsid);
    sjtuLesson.classes.forEach(function(entry) {
        if (entry.schedule.period == 0/* ||
                entry.schedule.week > sjtuSchedule.termLast*/) {
            return;
        }
        var evt = {
            "start": {
                "dateTime": processTimeStart(entry.schedule)
            },
            "end": {
                "dateTime": processTimeEnd(entry.schedule)
            },
            "location": entry.classroom.name,
            "colorId": "1",  // Blue
            "summary": sjtuLesson.course.name,
        };
        events.push(evt);
    });
    callback(events);
}

function processExam(sjtuExam, callback) {
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
    callback(evt);
}

exports.processLesson = processLesson;
exports.processExam = processExam;
exports.init = function(sjtu_schedule_file) {
    moment.tz.setDefault("Asia/Shanghai");

    sjtuSchedule = JSON.parse(fs.readFileSync(sjtu_schedule_file));
    sjtuSchedule.termStart = moment(sjtuSchedule.termStart);
    return this;
}

exports.updateTermStart = function (termStart) {
    sjtuSchedule.termStart = moment(termStart);
}

//exports.init("sjtu_schedule.json");
