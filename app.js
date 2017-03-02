var express = require('express');
var app = express();
var googleMed = require('./google/med.js');
var googleCalendar, googleOauth2Client;
var sjtuMed = require('./sjtu/med.js');

app.get('/', function (req, res) {
	res.redirect('/sjtu_auth');
});

app.get('/sjtu_auth', function (req, res) {
	sjtuMed.getAuthUrl("sjtu_client_secret.json", function(err, oauth2Client, authUrl) {
		if (!err) {
			console.log(authUrl);
			res.send("<a href=" + authUrl + "> SJTU Authencation </a>");
		}
		else {
			res.send("An error occured!");
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
			res.send("An error occured!");
		}
	});
});

app.get('/google_callback', function (req, res) {
	googleMed.getAccessToken(googleOauth2Client, req.query.code, function(err, calendar) {
		if (!err) {
			googleCalendar = calendar;
			res.redirect('/sjtu_auth');
		}
		else {
			res.send("An error occured!");
		}
	});
});

app.listen(3000, function () {
	console.log('Start listening on port 3000!');
});
