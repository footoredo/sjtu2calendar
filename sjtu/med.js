var fs = require('fs');
var readline = require('readline');
var querystring = require('querystring');
var oauth2 = require('simple-oauth2');

var BASEURL = "https://jaccount.sjtu.edu.cn";
var AUTHURL = BASEURL + "/oauth2/authorize";
var TOKENURL = BASEURL + "/oauth2/token";
var LOGOUTURL = BASEURL + "/oauth2/logout";

function getAuthUrl(credentialsFile, callback) {
	var credentials;
	fs.readFile(credentialsFile, function processClientSecrets(err, content) {
		if (err) {
			callback(err);
		}
		// Authorize a client with the loaded credentials, then call the
		// Google Calendar API.

		raw_credentials = JSON.parse(content);
		var clientSecret = raw_credentials.client_secret;
		var clientId = raw_credentials.client_id;
		var redirectUrl = raw_credentials.redirect_uris[0];
        var scope = raw_credentials.scope;

        var credentials = {
            client: {
                id: clientId,
                secret: clientSecret
            },
            auth: {
                tokenHost: BASEURL,
                tokenPath: "/oauth2/token",
                revokePath: "/oauth2/logout",
                authorizePath: "/oauth2/authorize"
            }
        };

        var oauth2Client = oauth2.create(credentials);
        var authUrl = oauth2Client.authorizationCode.authorizeURL({
            redirect_uri: redirectUrl,
            scope: scope
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
				auth: oauth2Client
			});

			callback(null, calendar);
		}
		else {
			callback(err);
		}
	});
}

function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

exports.getAuthUrl = getAuthUrl;
exports.getAccessToken = getAccessToken;
