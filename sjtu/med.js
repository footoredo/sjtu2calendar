var fs = require('fs');
var readline = require('readline');
var querystring = require('querystring');
var request = require('request');

var BASEURL = "https://jaccount.sjtu.edu.cn";
var AUTHURL = BASEURL + "/oauth2/authorize";
var TOKENURL = BASEURL + "/oauth2/token";
var LOGOUTURL = BASEURL + "/oauth2/logout";
var APIURL = "https://api.sjtu.edu.cn/v1";

function api(method, path, token, params, callback) {
    var retries = 5;
    params.access_token = token.token.access_token;
    tryApi();
    function tryApi() {
        request({
            method: method,
            uri: APIURL + path,
            form: params
        }, function(err, res, body) {
            if (err) {
                callback(err);
            }
            else {
                data = JSON.parse(body);
                if (data.errno) {
                    if (retries) {
                        console.log("Retry SJTU API");
                        retries --;
                        tryApi();
                    }
                    else {
                        callback(data.error);
                    }
                }
                else {
                    console.log("Done import lessons from SJTU");
                    callback(null, data.entities);
                }
            }
        });
    }
}

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
        const credentials = {
            client: {
                id: clientId,
                secret: clientSecret
            },
            auth: {
                tokenHost: BASEURL,
                tokenPath: '/oauth2/token',
                authorizePath: '/oauth2/authorize'
            }
        };
        const oauth2 = require('simple-oauth2').create(credentials);

        const authorizationUri = oauth2.authorizationCode.authorizeURL({
            redirect_uri: redirectUrl,
        });
        callback(null, oauth2, authorizationUri, redirectUrl);
	});
}

function getAccessToken(oauth2, code, redirectUrl, callback) {
    const tokenConfig = {
        code: code,
        redirect_uri: redirectUrl
    };
    oauth2.authorizationCode.getToken(tokenConfig, (error, result) => {
        if (error) {
            callback(error.message);
        }

        //console.log(result);
        if (!result) {
            getAccessToken(oauth2, code, redirectUrl, callback)
        }
        else {
            const token = oauth2.accessToken.create(result);
            callback(null, token);
        }
    });
}

exports.api = api;
exports.getAuthUrl = getAuthUrl;
exports.getAccessToken = getAccessToken;
