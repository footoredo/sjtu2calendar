var fs = require('fs');
var async = require('async');
var readline = require('readline');
var googleAuth = require('google-auth-library');
//var googleBatch = require('google-batch');
var google = require('googleapis');
var async = require('async');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

var SCOPES = ['https://www.googleapis.com/auth/calendar'];

function initialize () {
    process.env.HTTPS_PROXY = 'http://localhost:8123';
    google.options({ proxy: "http://localhost:8123" });
    console.log ("Done initialization.");
}

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
//    console.log ("???" + code)
	oauth2Client.getToken(code, function (err, tokens) {
  //      console.log ("!!!" + code)
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
    var succCount = 0;
    function send(evts) {
        var addOne = async.retryable ({
            times: 10,
            interval: function (retryCount) {
//                console.log ('Retry after ' + 500 * Math.pow (2, retryCount) + ' ms');
                return 500 * Math.pow (2, retryCount);
            }
        }, function (evt, callback) {
//            console.log ('Add event ' + evt);
            calendar.events.insert({
                auth: oauth2Client,
                calendarId: calendarId,
                resource: evt
            }, function (err, response) {
                if (!err) {
//                    console.log ('Success!');
                    update (++ succCount);
                }
                else {
  //                  console.log ('Failed!');
                }
                callback (err, response);
            });
        });

        async.mapLimit (evts, 50, addOne, function (err) {callback (err)});
    }
}

exports.initialize = initialize;
exports.getAuthUrl = getAuthUrl;
exports.getAccessToken = getAccessToken;
exports.createCalendar = createCalendar;
exports.addEvent = addEvent;
