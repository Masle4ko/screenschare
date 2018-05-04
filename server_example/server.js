// Load required modules
var http    = require("http");              // http server core module
var express = require("express");           // web framework external module
var serveStatic = require('serve-static');  // serve static files
var socketIo = require("socket.io");        // web socket external module
var easyrtc = require("../");               // EasyRTC external module
// Set process name
process.title = "node-easyrtc";
// Setup and configure Express http server. 
var app = express();
app.use(express.static(__dirname));
app.use(express.static(__dirname + '/view'));
app.use(express.static(__dirname + '/script'));

app.get('/room/:roomId', function (req, res) {
    res.sendFile(__dirname + "/view/room.html");
});

app.get('/room/:roomId/client', function (req, res) {  
    res.sendFile(__dirname + "/view/client.html");
});

app.get('/', function (req, res) {   
     res.sendFile(__dirname + "/view/start.html");
});


var webServer = http.createServer(app);
// Start Socket.io so it attaches itself to Express server
var socketServer = socketIo.listen(webServer, {"log level":1});
easyrtc.setOption("logLevel", "debug");
easyrtc.setOption("roomDefaultEnable", false); 
//easyrtc.setOption("cookieEnabled", true);
// Overriding the default easyrtcAuth listener, only so we can directly access its callback
easyrtc.events.on("easyrtcAuth", function(socket,  easyrtcid, msg, socketCallback, callback) {
    easyrtc.events.defaultListeners.easyrtcAuth(socket, easyrtcid, msg, socketCallback, function(err, connectionObj){
        if (err || !msg.msgData || !msg.msgData.credential || !connectionObj) {
            callback(err, connectionObj);
            return;
        }
        connectionObj.setField("credential", msg.msgData.credential, {"isShared":false});
        console.log("["+easyrtcid+"] Credential saved!", connectionObj.getFieldValueSync("credential"));
        callback(err, connectionObj);
    });
});

// To test, lets print the credential to the console for every room join!
easyrtc.events.on("roomJoin", function(connectionObj, roomName, roomParameter, callback) {
    console.log("["+connectionObj.getEasyrtcid()+"] Credential retrieved!", connectionObj.getFieldValueSync("credential"));
    easyrtc.events.defaultListeners.roomJoin(connectionObj, roomName, roomParameter, callback);
});

// Start EasyRTC server
var rtc = easyrtc.listen(app, socketServer, function(err, rtcRef) {
    console.log("Initiated");
    easyrtc.setOption("sessionEnable", true);
    easyrtc.setOption("sessionCookieEnable", true);
    rtcRef.events.on("roomCreate", function(appObj, creatorConnectionObj, roomName, roomOptions, callback) {
        console.log("roomCreate fired! Trying to create: " + roomName);
        appObj.events.defaultListeners.roomCreate(appObj, creatorConnectionObj, roomName, roomOptions, callback);
    });

    
});
webServer.listen(8000, function () {
    console.log('listening on http://localhost:8000');
});

