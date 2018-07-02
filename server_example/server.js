var http = require("http");
var https = require("https");
var url = require('url');
var path = require('path');
var fs = require('fs');
var request = require('request');
var uploadDir = __dirname;
var express = require("express");
var serveStatic = require('serve-static');
var socketIo = require("socket.io");
var easyrtc = require("../");
var nodeMaria = require('node-mariadb');
var mysql = require('mysql');
var mime = require('mime');
var formidable = require('formidable');
var util = require('util');
var bodyParser = require("body-parser");
process.title = "node-easyrtc";
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
    res.sendFile(__dirname + "/view/start.html");
});
app.get('/lobby', function (req, res) {
    res.sendFile(__dirname + "/view/lobby.html");
});
app.post("/lobby/roomLog", async (req, res) => {
    var objBD = db();
    objBD.query("INSERT INTO  `room_log` (  `usecase_id` ,  `external_client_id` ,  `room_id` ,  `username`) VALUES (1, '" + req.body.external_client_id + "', '" + req.body.room_id + "', '" + req.body.name + "')", function (error) {
        if (error) {
            console.log(error.message);
        } else {
            console.log('success');
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
    var objBD = db();
    objBD.query("INSERT INTO  `chat_logs` (  `chatlog_id` ,  `name` ,  `text` ,  `room_id` ,  `socket_id` ,  `timestamp` ) VALUES (NULL ,'" + req.body.name + "', '" + req.body.chat + "', '" + req.body.roomId + "',  '" + req.body.userId + "', CURRENT_TIMESTAMP)", function (error) {
        if (error) {
            console.log(error.message);
        } else {
            console.log('success');
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
    form.on('fileBegin', function(name, file) {
        file.path = path.join(form.uploadDir, file.name);
        fileName = file.name;
    })
    form.parse(request, function (err, fields, files) {
        var file = util.inspect(files);
        response.write(JSON.stringify({
            //fileURL: fileURL,
            fileName: fileName
        }));
        response.end();
    });
});

