var express = require('express');
var async = require('async');
var app = express()
    , server = require('http').createServer(app)
    , io = require('socket.io').listen(server);
var googleMed = require('./google/med.js');
var googleCalendar, googleOauth2Client, googleToken;
var sjtuMed = require('./sjtu/med.js'), sjtuToken, sjtuRedirectUrl;
var processor = require('./core/processor.js').init("sjtu_schedule.json");
var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
})); 

app.get('/test', function (req, res) {
    for (var i = 0; i < 10000; ++ i)
        res.send(i.toString());
});

app.get('/', function (req, res) {
    if (sjtuToken == null) {
        res.redirect('/sjtu_auth');
    }
    else if (googleCalendar == null) {
        res.redirect('/google_auth');
    }
    else {
        res.sendFile("templates/index.html", {root: __dirname});
    }
});

app.post('/process', function (req, res) {
    res.sendFile("templates/process.html", {root: __dirname});
    processor.updateTermStart (req.body.termStart);
    googleMed.createCalendar(googleOauth2Client, googleCalendar, req.body.calendarName, function(err, calendarId) {
        if (err) {
            console.log(err);
            io.sockets.emit(err);
        }
        else {
            io.sockets.emit("news", "Done creating calendar");
            var all = 0, done = 0;
            if (true) {
                console.log("importing lessons");
                sjtuMed.api('GET', '/me/lessons', sjtuToken, {}, function(err, lessons) {
                    if (err) {
                        res.send(err);
                    }
                    else {
                        var evts = [];
                        var cnt = 0;
                        io.sockets.emit("news", "Done importing lessons");
                        all += lessons.length;
                        async.forEach(lessons, function(lesson, callback) {
                            processor.processLesson(lesson, function(events) {
                                evts = evts.concat(events);
                                callback();
                                //console.log(evt);
                            });
                        }, function (err) {
                            tryAdd();
                            function tryAdd() {
                                var all = evts.length;
                                googleMed.addEvent(googleOauth2Client, googleCalendar, calendarId, evts, function(err) {
                                    if (!err) {
                                        io.sockets.emit("news", "Done!");
                                    }
                                    else {
                                        //tryAdd();
                                    }
                                }, function(done) {
                                    io.sockets.emit("news", "Done " + (cnt += done).toString() + "/" + all.toString());
                                });
                            }
                        });
                    }
                });
            }
        }
    });
});

app.get('/sjtu_auth', function (req, res) {
	sjtuMed.getAuthUrl("sjtu_client_secret.json", function(err, oauth2Client, authUrl, redirectUrl) {
		if (!err) {
            //res.send(authUrl);
            sjtuOauth2Client = oauth2Client;
            sjtuRedirectUrl = redirectUrl;
            res.send("<a href=" + authUrl + "> SJTU Authencation </a>");
		}
		else {
			res.send(err);
		}
	});
});

app.get('/sjtu_callback', function (req, res) {
    sjtuMed.getAccessToken(sjtuOauth2Client, req.query.code, sjtuRedirectUrl, function(err, accessToken) {
        if (!err) {
            console.log(accessToken);
            sjtuToken = accessToken;
            res.redirect('/');
        }
        else {
            res.send(err);
        }
    });
});

app.get('/google_auth', function (req, res) {
	googleMed.getAuthUrl("google_client_secret.json", function(err, oauth2Client, authUrl) {
		if (!err) {
			googleOauth2Client = oauth2Client;
			res.send("<a href=" + authUrl + "> Google Authencation </a>");
		}
		else {
			res.send(err);
		}
	});
});

app.get('/google_callback', function (req, res) {
	googleMed.getAccessToken(googleOauth2Client, req.query.code, function(err, calendar) {
		if (!err) {
			googleCalendar = calendar;
            res.redirect('/');
		}
		else {
			res.send(err);
		}
	});
});

server.listen(3000, function () {
	console.log('Start listening on port 3000!');
});
