var http    = require("http");         
var express = require("express");          
var serveStatic = require('serve-static');  
var socketIo = require("socket.io");      
var easyrtc = require("../");
var nodeMaria = require('node-mariadb');
var mysql = require('mysql');           
//var mongoose = require("mongoose")
//var conString = "mongodb://localhost/mylearning"
var bodyParser = require("body-parser");
process.title = "node-easyrtc";
var app = express();
app.use(express.static(__dirname));
app.use(express.static(__dirname + '/view'));
app.use(express.static(__dirname + '/script'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
function BD() {
var connection = mysql.createConnection({
    host: "learnweb.l3s.uni-hannover.de",
    port: 3306,
    user: "pairsearch",
    password: "Ywe9EOH9lxk6dIWk",
    database :"pairsearch"
  });
     return connection;
};
app.post("/room/:roomId", async (req, res) => {
    var objBD = BD();
    console.log(req.body.name);
    objBD.query("INSERT INTO  `chat_logs` (  `chatlog_id` ,  `name` ,  `text` ,  `room_id` ,  `socket_id` ,  `timestamp` ) VALUES (NULL ,'"+req.body.name+"', '"+req.body.chat+"', '"+req.body.roomId+"',  '"+req.body.rtcId+"', CURRENT_TIMESTAMP)", function(error) {
        if (error) {
            console.log(error.message);
        } else {
            console.log('success');    
        }
    });
});

app.get('/', function (req, res) {   
     res.sendFile(__dirname + "/view/start.html");
});

app.get('/room/:roomId', function (req, res) {
    res.sendFile(__dirname + "/view/room.html");
});

// mongoose.Promise = Promise
// var Chats = mongoose.model("Chats", {
//     rtcId: String,
//     roomId: String,
//     name: String,
//     chat: String
// })
// mongoose.connect(conString, { useMongoClient: true }, (err) => {
//     console.log("Database connection", err)
// })
// app.post("/room/:roomId", async (req, res) => {
//     try {
//         var chat = new Chats(req.body)
//         await chat.save()
//         res.sendStatus(200)
//         //Emit the event
//         socketIo.emit("chat", req.body)
//     } catch (error) {
//         res.sendStatus(500)
//         console.error(error)
//     }
// })

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
var myIceServers = [
    {"url":"stun:stun01.sipphone.com"},
    {"url":"stun:stun.ekiga.net"},
    {"url":"stun:stun.fwdnet.net"},
    {"url":"stun:stun.ideasip.com"},
    {"url":"stun:stun.iptel.org"},
    {"url":"stun:stun.rixtelecom.se"},
    {"url":"stun:stun.schlund.de"},
    {"url":"stun:stun.l.google.com:19302"},
    {"url":"stun:stun1.l.google.com:19302"},
    {"url":"stun:stun2.l.google.com:19302"},
    {
        "url":"turn:numb.viagenie.ca",
        "username":"webrtc@live.com",
        "credential":"muazkh"
    },
    {
        "url":"turn:192.158.29.39:3478?transport=udp",
        "username":"28224511:1379330808",
        "credential":"JZEOEt2V3Qb0y27GRntt2u2PAYA="
      },
    {
      "url":"turn:192.158.29.39:3478?transport=tcp",
      "username":"28224511:1379330808",
      "credential":"JZEOEt2V3Qb0y27GRntt2u2PAYA="
    }
  ];
//   var myIceServers = [
//     {"url":"stun:stun.l.google.com:19302"},
//     {
//         "url":"turn:192.158.29.39:3478?transport=udp",
//         "username":"28224511:1379330808",
//         "credential":"JZEOEt2V3Qb0y27GRntt2u2PAYA="
//       },
//     {
//       "url":"turn:192.158.29.39:3478?transport=tcp",
//       "username":"28224511:1379330808",
//       "credential":"JZEOEt2V3Qb0y27GRntt2u2PAYA="
//     }
//   ];



//easyrtc.setOption("appIceServers", myIceServers);
// Start EasyRTC server
var rtc = easyrtc.listen(app, socketServer, function(err, rtcRef) {
    console.log("Initiated");
    easyrtc.setOption("sessionEnable", true);
    easyrtc.setOption("sessionCookieEnable", true);
    // easyrtc.on("getIceConfig", function(connectionObj, callback){
    //     var myIceServers=[
    //       {"url":"stun:stun.easyrtc.com:3478"},
    //       {
    //         "url":        "turn:turn.easyrtc.com:3478",
    //         "username":   "qwertre123",
    //         "credential": "345yRTC!"
    //       }
    //     ];
      
    //     callback(null, myIceServers);
    //   });
    rtcRef.events.on("roomCreate", function(appObj, creatorConnectionObj, roomName, roomOptions, callback) {
        console.log("roomCreate fired! Trying to create: " + roomName);
        appObj.events.defaultListeners.roomCreate(appObj, creatorConnectionObj, roomName, roomOptions, callback);
    });

    
});
webServer.listen(8000, function () {
    console.log('listening on http://localhost:8000');
});
