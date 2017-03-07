var fs = require('fs');
var async = require('async');
var readline = require('readline');
var googleAuth = require('google-auth-library');
var googleBatch = require('google-batch');
var google = googleBatch.require('googleapis');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

var SCOPES = ['https://www.googleapis.com/auth/calendar'];
//google.options({ proxy: "http://localhost:8118" });

function getAuthUrl(credentialsFile, callback) {
	var credentials;
	fs.readFile(credentialsFile, function processClientSecrets(err, content) {
		if (err) {
			callback(err);
		}
		// Authorize a client with the loaded credentials, then call the
		// Google Calendar API.

		credentials = JSON.parse(content);
		var clientSecret = credentials.web.client_secret;
		var clientId = credentials.web.client_id;
		var redirectUrl = credentials.web.redirect_uris[0];
		//var auth = new googleAuth();
		var oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUrl);

		var authUrl = oauth2Client.generateAuthUrl({
			access_type: 'online',
			scope: SCOPES
		});

		callback(null, oauth2Client, authUrl);
	});
}

function getAccessToken(oauth2Client, code, callback) {
	oauth2Client.getToken(code, function (err, tokens) {
		// Now tokens contains an access_token and an optional refresh_token. Save them.
		if (!err) {
			oauth2Client.setCredentials(tokens);
			var calendar = google.calendar({
				version: 'v3',
				//auth: oauth2Client
			});

			callback(null, calendar);
		}
		else {
			callback(err);
		}
	});
}

function createCalendar(oauth2Client, calendar, calendarName, callback) {
    //callback(null, "ifpna9r8697c2d9jmupbr347qc@group.calendar.google.com");
    //return;
    calendar.calendars.insert({
        auth: oauth2Client,
        resource: {
            summary: calendarName
        }
    }, function(err, res) {
        if (err) {
            callback(err);
        }
        else {
            callback(null, res.id);
        }
    });
}

function addEvent(oauth2Client, calendar, calendarId, evts, callback, update) {
    //console.log(calendar._options.auth);
    //callback(null);
    //return;
    send(evts);
    function send(_evts) {
        var evts;
        if (_evts.length > 50) {
            evts = _evts.slice(0, 50);
        }
        else {
            evts = _evts;
        }
        //console.log(evts.length);
        var batch = new googleBatch();
        batch.setAuth(oauth2Client);
        async.forEach(evts, function(evt, callback) {
            batch.add(
                    calendar.events.insert({
                        googleBatch: true,
                        calendarId: calendarId,
                        resource: evt
                    }));
            callback();
        }, function (err) {
            if (err) {
                callback(err);
            }
            else {
                //callback(null);
                //return;
                //batch.clear();
                batch.exec(function (err, res, errDetails) {
                    if (err) {
                        //console.log(err);
                        callback(err.message);
                    }
                    else {
                        //callback(null);
                        //return;
                        //console.log(res);
                        update(evts.length);
                        //console.log("xxx " + evts.length + " yyy " + _evts.length);
                        if (_evts.length > 50)
                            sleep(200).then(() => {
                                send(_evts.slice(50, _evts.length));
                            });
                        else {
                            callback(null);
                        }
                    }
                    batch.clear();
                })
            }
        });
    }
}

exports.getAuthUrl = getAuthUrl;
exports.getAccessToken = getAccessToken;
exports.createCalendar = createCalendar;
exports.addEvent = addEvent;
