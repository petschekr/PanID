import fs = require("fs");
import express = require("express");

/*export enum UserType {
	Student,
	Teacher,
	Parent,
	Alum,
	Visitor,
	Other
};*/

export interface User {
	"username": String;
	// When signing up, the user signs their username with their private key
	// The signature and their public key are then sent to the server
	// The server verifies their message
	"salt": string;
	"publicKey": string;
	"ephemPublicKey": string;
	"data": string;
	"dataIV": string;
	"dataAuthTag": string;
}
export var keys: {
	"rethinkdb": {
		"username": string;
		"password": string;
		"server": string;
	};
	"cookieSecret": string;
} = JSON.parse(fs.readFileSync("keys.json").toString("utf8"));
export var cookieOptions = {
	"path": "/",
	"maxAge": 1000 * 60 * 60 * 24 * 30 * 6, // 6 months
	"secure": false,
	"httpOnly": true,
	"signed": true
};

// RethinkDB database
import r = require("rethinkdb");
export var db: r.Connection;
r.connect( {host: "localhost", port: 28015, db: "PanID"}, function(err, conn) {
    if (err) throw err;
    db = conn;
	console.info("Connected to RethinkDB instance");
});

export var authenticateMiddleware = function (request: express.Request, response: express.Response, next: express.NextFunction): void {
	if (db === null) {
		response.locals.authenticated = false;
		next();
		return;
	}
	var username = request.signedCookies.username || "";
	
	r.table("users").filter({username: username}).run(db, function(err, cursor) {
        if (err) throw err;
		cursor.toArray(function (err, results) {
			if (err) throw err;

			var user: any = {};
			var loggedIn: boolean;
			if (results.length < 1) {
				// Username not found in database
				loggedIn = false;
			}
			else {
				user = results[0];
				loggedIn = true;
			}
			response.locals.authenticated = loggedIn;
			response.locals.user = user;
			next();
		});
    });
};

/*var pusher = require("pushbullet");
pusher = Promise.promisifyAll(new pusher(keys.pushbullet));
// Enumerate active devices to push to in case of an error
var pushbulletDevices: string[] = [];
pusher.devicesAsync()
	.then(function (response) {
		var devices: any[] = response.devices;
		for (let device of devices) {
			if (device.active) {
				pushbulletDevices.push(device.iden);
			}
		}
	})
	.catch(function (err: Error) {
		throw err;
	});
*/
export var handleError = function (err: any): void {
	console.error(err.stack);

	// Check if this error occurred while responding to a request
	if (this.status && this.send) {
		var response: express.Response = this;
		fs.readFile("pages/500.html", "utf8", function (err, html) {
			response.status(500);
			if (err) {
				console.error(err);
				response.send("An internal server error occurred and an additional error occurred while serving an error page.");
				return;
			}
			response.send(html);
		});
	}

	const debugging: boolean = true;
	if (debugging) {
		return;
	}
	// Notify via PushBullet
	/*var pushbulletPromises: any[] = [];
	for (let deviceIden of pushbulletDevices) {
		pushbulletPromises.push(pusher.noteAsync(deviceIden, "WPP Error", `${new Date().toString()}\n\n${err.stack}`));
	}
	Promise.all(pushbulletPromises).then(function () {
		console.log("Error report sent via Pushbullet");
	}).catch(function (err: Error) {
		console.error("Error encountered while sending error report via Pushbullet");
		console.error(err);
	});*/
};