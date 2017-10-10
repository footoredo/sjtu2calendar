var express = require('express');
var async = require('async');
var session = require('express-session');
var app = express()
    , server = require('http').createServer(app)
    , io = require('socket.io').listen(server);
var googleMed = require('./google/med.js');
googleMed.initialize ();
var googleCalendar, googleOauth2Client, googleToken;
var sjtuMed = require('./sjtu/med.js'), sjtuToken, sjtuRedirectUrl;
var processor = require('./core/processor.js').init("sjtu_schedule.json");
var bodyParser = require('body-parser')
var cookieParser = require ('cookie-parser')
var MemoryStore = require('session-memory-store')(session);
var fs = require('fs');
sessionSecret = JSON.parse(fs.readFileSync("session_secret.json"));
app.use(session({
    secret: sessionSecret.secret,
    cookie: { maxAge: 60 * 1000 },
    resave: false,
    saveUninitialized: true,
    store: new MemoryStore()
}));
app.use(cookieParser());
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
    next();
});



app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
})); 

app.get('/test', function (req, res) {
    for (var i = 0; i < 10000; ++ i)
        res.send(i.toString());
});

app.get('/', function (req, res) {
    if (req.session.sjtuToken == null) {
        res.redirect('/sjtu_auth');
    }
    else if (req.session.googleCalendar == null) {
        res.redirect('/google_auth');
    }
    else {
        res.sendFile("templates/index.html", {root: __dirname});
    }
});

app.post('/process', function (req, res) {
    res.sendFile("templates/process.html", {root: __dirname});
    processor.updateTermStart (req.body.termStart);
    googleMed.createCalendar(req.session.googleOauth2Client, req.session.googleCalendar, req.body.calendarName, function(err, calendarId) {
        if (err) {
            console.log(err);
            io.sockets.emit(err);
        }
        else {
            io.sockets.emit("news", "Done creating calendar");
            var all = 0, done = 0;
            if (true) {
                console.log("importing lessons");
                sjtuMed.api('GET', '/me/lessons', req.session.sjtuToken, {}, function(err, lessons) {
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
                                googleMed.addEvent(req.session.googleOauth2Client, req.session.googleCalendar, calendarId, evts, function(err) {
                                    if (!err) {
                                        io.sockets.emit("news", "Done!");
                                    }
                                    else {
                                        //tryAdd();
                                    }
                                }, function(done) {
                                    io.sockets.emit("news", "Done " + done.toString() + "/" + all.toString());
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
	var sess = req.session;
	sjtuMed.getAuthUrl("sjtu_client_secret.json", function(err, oauth2Client, authUrl, redirectUrl) {
		if (!err) {
            //res.send(authUrl);
            sess.sjtuOauth2Client = oauth2Client;
            sess.sjtuRedirectUrl = redirectUrl;
            res.send("<a href=" + authUrl + "> SJTU Authencation </a>");
			sess.save ();
		}
		else {
			res.send(err);
		}
	});
});

app.get('/sjtu_callback', function (req, res) {
	var sess = req.session;
    sjtuMed.getAccessToken(req.session.sjtuOauth2Client, req.query.code, req.session.sjtuRedirectUrl, function(err, accessToken) {
        if (!err) {
            //console.log(accessToken);
            req.session.sjtuToken = accessToken;
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
			req.session.googleOauth2Client = oauth2Client;
			res.send("<a href=" + authUrl + "> Google Authencation </a>");
		}
		else {
			res.send(err);
		}
	});
});

app.get('/google_callback', function (req, res) {
	googleMed.getAccessToken(req.session.googleOauth2Client, req.query.code, function(err, calendar) {
		if (!err) {
			req.session.googleCalendar = calendar;
            res.redirect('/');
		}
		else {
            console.log ("in callback: " + err);
			res.send(err);
		}
	});
});

server.listen(3000, function () {
	console.log('Start listening on port 3000!');
});
