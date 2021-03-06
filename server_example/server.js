var http = require("http");
//var https = require("https");
//var url = require('url');
var path = require('path');
var fs = require('fs');
//var request = require('request');
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
var moment = require('moment');
//const Logger = require('woveon-logger');
var log4js = require('log4js');
const log4js_extend = require("log4js-extend");
app.use(express.static(__dirname));
app.use(express.static(__dirname + '/node_modules'));
app.use(express.static(__dirname + '/cert'));
app.use(express.static(__dirname + '/audio'));
app.use(express.static(__dirname + '/view'));
app.use(express.static(__dirname + '/uploads'));
app.use(express.static(__dirname + '/script'));
app.use(express.static(__dirname + '/logs'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
var nodemailer = require('nodemailer');
var timers = new Array();
var streamNamesForMerge = new Array();
var usersSessionIds = {};

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'ascreenshare@gmail.com',
      pass: 'dimalox312loc'
    }
  });

log4js.configure({
    appenders: {
        consoleAppender: { type: 'console', format: "(@file:@line:@column)" },
        fileAppender: { type: 'file', filename: __dirname + '/logs/logs.txt' },
    },
    categories: {
        default: { appenders: ['consoleAppender', 'fileAppender'], level: 'debug' },
    },
});
log4js_extend(log4js, {
    format: "(@file:@line:@column)"
});
const logger = log4js.getLogger();

var DB = mysql.createPool({
    connectionLimit: 4,
    host: "learnweb.l3s.uni-hannover.de",
    port: 3306,
    user: "pairsearch",
    password: "Ywe9EOH9lxk6dIWk",
    database: "pairsearch"
});
app.get('/admin', function (req, res) {
    res.sendFile(__dirname + "/view/start.html");
});
app.get('/adminRoom', function (req, res) {
    res.sendFile(__dirname + "/view/adminRoom.html");
});
app.get('/', function (req, res) {
    res.sendFile(__dirname + "/view/lobby.html");
});
app.get('/room', function (req, res) {
    res.sendFile(__dirname + "/view/room.html");
});
// app.get('/test', function (req, res) {
//     res.sendFile(__dirname + "/view/iFrameTest.html");
// });
// app.get('/iframe', function (req, res) {
//     res.sendFile(__dirname + "/view/roomForIframe.html");
// });
// app.get('/lobby', function (req, res) {
//     res.sendFile(__dirname + "/view/lobby.html");
// });
app.post("/room/login", function (request, response) {
    if (request.body.external_client_id != null) {
        DB.getConnection(function (err, connection) {
            if (err) logger.error(err);
            else {
                var sql = "INSERT INTO  `user` (`external_client_id`, `usecase_id`, `room_id`, `username`) VALUES (" + DB.escape(request.body.external_client_id) + ",1, " + DB.escape(request.body.room_id) + ", " + DB.escape(request.body.name) + ")";
                connection.query(sql, function (error, result, fields) {
                    connection.release();
                    if (error) {
                        logger.error(sql + '\n' + error.message);
                    } else {
                        if (Number.isInteger(Number(result.insertId))) {
                            usersSessionIds[request.body.myeasyrtcid] = result.insertId;
                            logger.info('success user login with uid=' + request.body.external_client_id + ' his user_id=' + result.insertId);
                            saveEvent(result.insertId, 1);
                            response.setHeader('content-type', "application/json; charset=utf-8");
                            response.write(JSON.stringify({
                                result: result.insertId
                            }));
                            response.end();
                        }
                        else {
                            logger.error('problem with insertId');
                        }
                    }
                });
            }

        });
    }
});

app.post("/room/getchat", function (request, response) {
    if (request.body.room_id != null) {
        DB.getConnection(function (err, connection) {
            if (err) logger.error(err);
            else {
                var sql = "SELECT chat.room_id, user.external_client_id, chat.timestamp, chat.text, user.username FROM `user` inner join `chat` on  user.user_id=chat.user_id WHERE chat.room_id=" + DB.escape(Number(request.body.room_id));
                connection.query(sql, function (error, result, fields) {
                    connection.release();
                    if (error) {
                        logger.error(sql + '\n' + error.message);
                    } else {
                        response.setHeader('content-type', "application/json; charset=utf-8");
                        response.write(JSON.stringify({
                            result: result
                        }));
                        response.end();
                    }
                });
            }

        });
    }
});

app.post('/event', function (req, res) {
    saveEvent(req.body.myId, req.body.eventId);
});

app.post('/error', function (req, res) {
    saveError(req.body.myId, req.body.errorCode, req.body.errorText);
});

app.post('/userHelp', function (req, res) {
    console.log(req.body.myId + "===" + req.body.myroomname);
    var mailOptions = {
        from: '"Screenshare" <ascreenshare@gmail.com>', 
        to: "xlyyvonne@hotmail.com", 
        subject: "Pairsearch  user need your help!", 
        text: "\n userid:"+ req.body.myId+"\n roomid:"+req.body.myroomname+"\n link to the room:"+req.protocol + "://" + req.headers.host + req.baseUrl+"/admin/?roomid="+req.body.myroomname
    };
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            logger.error(error);
        } else {
            logger.info('Email sent: ' + info.response);
            saveEvent(req.body.myId, 5);
        }
    });
});
var webServer = http.createServer(app).listen(8000);
easyrtc.setOption("roomDefaultEnable", false);

var myIceServers = [
    { "urls": "stun:stun.l.google.com:19302" },
    {
        "urls": "turn:hermes.kbs.uni-hannover.de:3478",
        "username": "firsttest",
        "credential": "unsicherergehtesnicht",
        "credentialType": "password"
    },
    {
        "urls": "turn:hermes.kbs.uni-hannover.de:3478?transport=tcp",
        "username": "firsttest",
        "credential": "unsicherergehtesnicht",
        "credentialType": "password"
    }
];

easyrtc.setOption("appIceServers", myIceServers);
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

easyrtc.events.on("msgTypeGetRoomList", function (connectionObj, socketCallback, next) {
    var easyrtcid = connectionObj.getEasyrtcid();
    var appObj = connectionObj.getApp();
    connectionObj.generateRoomList(
        function (err, roomList) {
            if (err) {
                connectionObj.util.sendSocketCallbackMsg(easyrtcid, socketCallback, connectionObj.util.getErrorMsg("MSG_REJECT_NO_ROOM_LIST"), appObj);
            }
            else {
                for (var roomName in roomList) {
                    if (roomList[roomName].numberClients < 2) {
                        connectionObj.util.sendSocketCallbackMsg(easyrtcid, socketCallback, { "msgType": "roomList", "msgData": { "roomList": JSON.stringify(roomName) } }, appObj);
                        return;
                    }
                }
                connectionObj.util.sendSocketCallbackMsg(easyrtcid, socketCallback, { "msgType": "roomList", "msgData": { "roomList": JSON.stringify(easyrtcid) } }, appObj);
            }
        }
    );
});
// Start EasyRTC server
var rtc = easyrtc.listen(app, socketServer, function (err, rtcRef) {
    console.log("Initiated");
    rtcRef.events.on("roomCreate", function (appObj, creatorConnectionObj, roomName, roomOptions, callback) {
        console.log("roomCreate fired! Trying to create: " + roomName);
        appObj.events.defaultListeners.roomCreate(appObj, creatorConnectionObj, roomName, roomOptions, callback);
    });
});
easyrtc.events.on('disconnect', function (connectionObj, next) {
    saveEvent(usersSessionIds[connectionObj.getEasyrtcid()], 4);
    delete usersSessionIds[connectionObj.getEasyrtcid()];
    connectionObj.events.defaultListeners.disconnect(connectionObj, next);
});


app.post("/room/:roomId/saveMessage", function (req, res) {
    if (Number.isInteger(Number(req.body.user_id)) && Number(req.body.user_id) > 1) {
        DB.getConnection(function (err, connection) {
            if (err) throw err;
            else {
                var sql = "INSERT INTO  `chat` (`user_id` ,  `text` ,  `room_id`) VALUES (" + DB.escape(req.body.user_id) + ", " + DB.escape(req.body.chat) + ", " + DB.escape(req.body.roomId) + ")";
                connection.query(sql, function (error) {
                    connection.release();
                    if (error) {
                        logger.error(sql + '\n' + error.message);
                    } else {
                        logger.info('Successfully saved message from user_id=' + req.body.user_id);
                    }
                });
            }
        });
    }
});

app.post("/room/:roomId/saveRecord", function (request, response) {
    var form = new formidable.IncomingForm();
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
    });
    form.on('end', function () {
        var myId = fileName.match(/\d+/)[0];
        if (streamNamesForMerge[myId] == null)
            streamNamesForMerge[myId] = new Array();
        streamNamesForMerge[myId].push(fileName);
        var timer = timers[myId];
        if (timer != null)
            clearTimeout(timer);
        timer = setTimeout(function () { videoMerge(streamNamesForMerge[myId], myId, 2) }, 120 * 1000);

        timers[myId] = timer;
    });
});

app.post("/room/:roomId/mergeVideo", function (request, response) {
    videoMerge(request.body.streamNamesForMerge, request.body.myId, request.body.eventId);
});

function saveEvent(myId, actionId) {
    if (Number.isInteger(Number(myId)) && Number(myId) > 1 && Number.isInteger(Number(actionId)) && Number(actionId) >= 0) {
        DB.getConnection(function (err, connection) {
            if (err) logger.error(err);
            else {
                var sql = "INSERT INTO  `event` (  `user_id` ,  `action_id` ) VALUES (" + DB.escape(myId) + "," + DB.escape(actionId) + ")"
                connection.query(sql, function (error) {
                    connection.release();
                    if (error) {
                        logger.error(sql + '\n' + error.message)
                    } else {
                        logger.info('Successfully saved event with id=' + actionId + ' from client id=' + myId);
                    }
                });
            }
        });
    }
}
function saveError(myId, errorCode, errorText) {
    if (Number.isInteger(Number(myId)) && Number(myId) > 1 && errorCode && errorText) {
        DB.getConnection(function (err, connection) {
            if (err) logger.error(err);
            else {
                var sql = "INSERT INTO  `userErrors` (  `user_id` ,  `errorCode`,  `errorText` ) VALUES (" + DB.escape(myId) + "," + DB.escape(errorCode) + "," + DB.escape(errorText) + ")"
                connection.query(sql, function (error) {
                    connection.release();
                    if (error) {
                        logger.error(sql + '\n' + error.message)
                    } else {
                        logger.info('Successfully saved error from client id=' + myId);
                    }
                });
            }
        });
    }
}

function videoMerge(streamNamesForMergefromRequest, myId, eventId) {
    var timer = timers[myId];
    if (timer != null)
        clearTimeout(timer);
    var proc = ffmpeg();
    var streamNamesForMerge = [];
    for (var i = 0; i < streamNamesForMergefromRequest.length; i++) {
        if (fs.statSync(__dirname + "/uploads/" + streamNamesForMergefromRequest[i])) {
            proc.input(__dirname + "/uploads/" + streamNamesForMergefromRequest[i]);
            streamNamesForMerge.push(streamNamesForMergefromRequest[i]);
        }
    }
    proc.on('end', function () {
        for (var i = 0; i < streamNamesForMerge.length; i++) {
            fs.unlink(__dirname + "/uploads/" + streamNamesForMerge[i], function (err) {
                if (err) {
                    logger.error(err);
                }
            });
        }
        saveEvent(myId, eventId);
    })
    proc.on('error', function (err) {
        logger.error('an error happened: ' + err.message);
    })
    proc.mergeToFile(__dirname + "/uploads/" + "full--" + streamNamesForMergefromRequest[0]);
}