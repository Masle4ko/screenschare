var http = require("http");
//var https = require("https");
//var url = require('url');
var path = require('path');
var fs = require('fs');
//var request = require('request');
//var uploadDir = __dirname;
var express = require("express");
//var serveStatic = require('serve-static');
var socketIo = require("socket.io");
var easyrtc = require("../");
//var nodeMaria = require('node-mariadb');
var mysql = require('mysql');
//var mime = require('mime');
var formidable = require('formidable');
var util = require('util');
var bodyParser = require("body-parser");
process.title = "node-easyrtc";
var ffmpeg = require('fluent-ffmpeg');
var app = express();
app.use(express.static(__dirname));
app.use(express.static(__dirname + '/node_modules'));
app.use(express.static(__dirname + '/cert'));
app.use(express.static(__dirname + '/audio'));
app.use(express.static(__dirname + '/view'));
app.use(express.static(__dirname + '/uploads'));
app.use(express.static(__dirname + '/script'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

var DB = db();
function db() {
    var connection = mysql.createConnection({
        host: "learnweb.l3s.uni-hannover.de",
        port: 3306,
        user: "pairsearch",
        password: "Ywe9EOH9lxk6dIWk",
        database: "pairsearch"
    });
    return connection;
};
app.get('/', function (req, res) {
    res.sendFile(__dirname + "/view/lobby.html");
});
app.get('/lobby', function (req, res) {
    res.sendFile(__dirname + "/view/lobby.html");
});
app.post("/lobby/roomLog", function (request, response) {
    var formated_date = new Date().toLocaleString();
    DB.query("INSERT INTO  `user` (`external_client_id`, `usecase_id`, `room_id`, `username`, `timestamp`) VALUES ('" + request.body.external_client_id + "',1, '" + request.body.room_id + "', '" + request.body.name + "','"+formated_date+"')", function (error) {
        if (error) {
            console.log(error.message);
        } else {
            console.log('success user login with uid='+request.body.external_client_id+'');
        }
    });
    DB.query("SELECT `user_id` FROM `user` WHERE external_client_id=" + request.body.external_client_id + " AND  timestamp='"+formated_date.toString()+"'", function (err, result) {
        if (err) throw err;
        if (result){
            response.write(JSON.stringify({
                result: result
            }));
            response.end();
        }
      });
});
app.post("/event", async (req, res) => {
    DB.query("INSERT INTO  `event` (  `user_id` ,  `action_id` ) VALUES ("+req.body.user_id+","+ req.body.action_id+")", function (error) {
        if (error) {
            console.log(error.message);
        } else {
            console.log('Successfully saved event with id='+req.body.action_id+' from client id='+req.body.user_id+'');
        }
    });
});
app.get('/room/:roomId', function (req, res) {
    res.sendFile(__dirname + "/view/room.html");
});

// var webServer = https.createServer( {
//     key: fs.readFileSync(__dirname+'/cert/client-key.pem'),
//     cert: fs.readFileSync(__dirname+'/cert/client-cert.pem')
// },app).listen(443);
var webServer = http.createServer(app).listen(8000);
easyrtc.setOption("roomDefaultEnable", false);
var socketServer = socketIo.listen(webServer, { "log level": 1 });
//easyrtc.setOption("logLevel", "debug");
easyrtc.events.on("easyrtcAuth", function (socket, easyrtcid, msg, socketCallback, callback) {
    easyrtc.events.defaultListeners.easyrtcAuth(socket, easyrtcid, msg, socketCallback, function (err, connectionObj) {
        if (err || !msg.msgData || !msg.msgData.credential || !connectionObj) {
            callback(err, connectionObj);
            return;
        }
        connectionObj.setField("credential", msg.msgData.credential, { "isShared": false });
        console.log("[" + easyrtcid + "] Credential saved!", connectionObj.getFieldValueSync("credential"));
        callback(err, connectionObj);
    });
});
// To test, lets print the credential to the console for every room join!
// easyrtc.events.on("roomJoin", function(connectionObj, roomName, roomParameter, callback) {
//     console.log("["+connectionObj.getEasyrtcid()+"] Credential retrieved!", connectionObj.getFieldValueSync("credential"));
//     easyrtc.events.defaultListeners.roomJoin(connectionObj, roomName, roomParameter, callback);
// });
// Start EasyRTC server
var rtc = easyrtc.listen(app, socketServer, function (err, rtcRef) {
    console.log("Initiated");
    rtcRef.events.on("roomCreate", function (appObj, creatorConnectionObj, roomName, roomOptions, callback) {
        console.log("roomCreate fired! Trying to create: " + roomName);
        appObj.events.defaultListeners.roomCreate(appObj, creatorConnectionObj, roomName, roomOptions, callback);
    });
});

app.post("/room/:roomId/saveMessage", async (req, res) => {
    DB.query("INSERT INTO  `chat` (`user_id` ,  `text` ,  `room_id`) VALUES ('" + req.body.userId + "', '" + req.body.chat + "', '" + req.body.roomId + "')", function (error) {
        if (error) {
            console.log(error.message);
        } else {
            console.log('Successfully saved message');
        }
    });
});

app.post("/room/:roomId/saveRecord", function (request, response) {
    var form = new formidable.IncomingForm();
    var dir = !!process.platform.match(/^win/) ? '\\uploads\\' : '/uploads/';
    form.uploadDir = __dirname + '/uploads';
    form.keepExtensions = true;
    form.maxFieldsSize = 10 * 1024 * 1024 * 1024;
    form.maxFileSiz = 2000 * 1024 * 1024;
    form.maxFields = 1000;
    var fileName;
    form.on('fileBegin', function (name, file) {
        file.path = path.join(form.uploadDir, file.name);
        fileName = file.name;
    })
    form.parse(request, function (err, fields, files) {
        // var file = util.inspect(files);
        // response.write(JSON.stringify({
        //     fileName: fileName
        // }));
        // response.end();
    });
});

app.post("/room/:roomId/mergeVideo", function (request, response) {
    var proc = ffmpeg(__dirname + "/uploads/" + request.body[0]);
    for (var i = 1; i < request.body.length; i++) {
        proc.input(__dirname + "/uploads/" + request.body[i]);
    }
    proc.on('end', function () {
        console.log('files have been merged succesfully');
        for (var i = 0; i < request.body.length; i++) {
            fs.unlink(__dirname + "/uploads/" + request.body[i], function (err) {
                if (err) return console.log(err);
                console.log(''+request.body[i]+'deleted successfully');
            });
        }
    })
    proc.on('error', function (err) {
        console.log('an error happened: ' + err.message);
    })
    proc.mergeToFile(__dirname + "/uploads/" +"full--"+request.body[0]);
});