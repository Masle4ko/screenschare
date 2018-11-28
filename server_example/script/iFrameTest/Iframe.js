
var waitingForRoomList = true;
var isConnected = false;
var haveSelfVideo = false;
var otherEasyrtcid = null;
var needToCallOtherUsers;
var otherusername;
var localRecorder;
var streamNamesForMerge = [];
var currentPart = 0;
var haveSelfVideo = false;
var myStreamName;
var firstCon = true;
var OccupantListenerList = [];
var userForCall;
var streamsforupdate = [];

function initApp() {
    connect();
    window.onunload = function () {
        easyrtc.disconnect();
    };
}


function addToConversation(who, msgType, content, time = null) {
    if (msgType === 'otherusername') {
        otherusername = content.username;
    }
    if (!content) {
        content = "**no body**";
    }
    if (typeof (content) == "string") {
        content = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        content = content.replace(/\n/g, '<br />');
        var targetingStr = "";
        // if (targeting) {
        //     if (targeting.targetEasyrtcid) {
        //         targetingStr += "user=" + targeting.targetEasyrtcid;
        //     }
        //     if (targeting.targetRoom) {
        //         targetingStr += " room=" + targeting.targetRoom;
        //     }
        //     if (targeting.targetGroup) {
        //         targetingStr += " group=" + targeting.targetGroup;
        //     }
        // }
        // if (who != "Me")
        //     who = otherusername;
        if (time != null) {
            document.getElementById('conversation').innerHTML +=
                new Date(time).toLocaleDateString("en-US") + " " + new Date(time).toLocaleTimeString("en-US") + " <b>" + who + ":</b>&nbsp;" + content + "<br />";

        }
        else {
            document.getElementById('conversation').innerHTML +=
                new Date().toLocaleTimeString() + " <b>" + who + ":</b>&nbsp;" + content + "<br />";
        }
        updateScroll();
    }
}

function updateScroll() {
    var element = document.getElementById("conversation");
    element.scrollTop = element.scrollHeight;
}

function genRoomDivName(roomName) {
    return "roomblock_" + roomName;
}

function genRoomOccupantName(roomName) {
    return "roomOccupant_" + roomName;
}

function setCredential(event, value) {
    if (event.keyCode === 13) {
        easyrtc.setCredential(value);
    }
}

function addRoom(roomid, parmString, userAdded) {
    var roomName = "send";
    //var roomid = genRoomDivName(roomName);
    if (document.getElementById(roomid)) {
        return;
    }
    function addRoomButton() {
        var roomButtonHolder = document.getElementById('rooms');
        var roomdiv = document.createElement("div");
        roomdiv.id = roomid;
        roomdiv.className = "roomDiv";
        var roomButton = document.createElement("button");
        roomButton.id = functions.checkCookie("roomName");
        roomButton.setAttribute("class", "waves-effect waves-light btn btn-success");
        roomButton.onclick = function () {
            sendMessage(null, roomButton.id);

        };
        document.onkeyup = function (e) {
            e = e || window.event;
            if (e.keyCode === 13) {
                sendMessage(null, roomButton.id);
            }
        }
        var roomLabel = (document.createTextNode(roomName));
        roomButton.appendChild(roomLabel);
        roomdiv.appendChild(roomButton);
        roomButtonHolder.appendChild(roomdiv);
        var roomOccupants = document.createElement("a");
        roomOccupants.setAttribute("class", "waves-effect waves-light btn btn-success");
        roomOccupants.id = genRoomOccupantName(roomName);
        roomOccupants.className = "roomOccupants";
        roomdiv.appendChild(roomOccupants);
        //$(roomdiv).append(" -<a href=\"javascript:\leaveRoom('" + roomName + "')\">leave</a>");
    }
    var roomParms = null;
    if (parmString && parmString !== "") {
        try {
            roomParms = JSON.parse(parmString);
        } catch (error) {
            roomParms = null;
            easyrtc.showError(easyrtc.errCodes.DEVELOPER_ERR, "Room Parameters must be an object containing key/value pairs. eg: {\"fruit\":\"banana\",\"color\":\"yellow\"}");
            return;
        }
    }
    if (!isConnected || !userAdded) {
        //addRoomButton();
        //console.log("adding gui for room " + roomName);
    }
    else {
        console.log("not adding gui for room " + roomName + " because already connected and it's a user action");
    }
    if (userAdded) {
        console.log("calling joinRoom(" + roomName + ") because it was a user action ");
        addRoomButton();
        easyrtc.joinRoom(roomid, roomParms,
            function () {
                /* we'll geta room entry event for the room we were actually added to */
            },
            function (errorCode, errorText, roomName) {
                easyrtc.showError(errorCode, errorText + ": room name was(" + roomName + ")");
            });
    }
}

function leaveRoom(roomName) {
    if (!roomName) {
        roomName = document.getElementById("roomToAdd").value;
    }
    var entry = document.getElementById(genRoomDivName(roomName));
    var roomButtonHolder = document.getElementById('rooms');
    easyrtc.leaveRoom(roomName, null);
    roomButtonHolder.removeChild(entry);
}

function peerListener(who, msgType, content, targeting) {
    addToConversation(who, msgType, content, targeting);
}
function randomInteger(min, max) {
    var rand = min - 0.5 + Math.random() * (max - min + 1)
    rand = Math.round(rand);
    return rand;
}
function connect() {
    easyrtc.enableDataChannels(true);
    easyrtc.setAutoInitUserMedia(false);
    easyrtc.setRoomEntryListener();
    easyrtc.setDataChannelCloseListener();
    easyrtc.setPeerListener(peerListener);
    easyrtc.setRoomOccupantListener(RoomOccupantListener);
    easyrtc.setDisconnectListener(function () {
        easyrtc.closeLocalStream(myStreamName);
        jQuery('#rooms').empty();
        document.getElementById("main").className = "notconnected";
        // swal({
        //     type: 'error',
        //     title: 'Oops...',
        //     showConfirmButton: false,
        //     allowOutsideClick: false,
        //     html: '<div style="font-family: Arial, Helvetica, sans-serif;">Something went wrong. Please reload the page.</div>'
        // });
    });
    updatePresence();
    easyrtc.connect("easyrtc.instantMessaging", loginSuccess, loginFailure);
    var screenShareButton = createLabelledButton("Desktop capture/share");
    screenShareButton.onclick = function () {
        var streamName = "screen" + randomInteger(4, 99);
        easyrtc.initDesktopStream(
            function (stream) {
                createLocalVideo(stream, streamName);
                if (otherEasyrtcid) {
                    easyrtc.addStreamToCall(otherEasyrtcid, streamName);
                }
            },
            function (errCode, errText) {
                easyrtc.showError(errCode, errText);
            },
            streamName);
    };
};

function getGroupId() {
    return null;
}

function sendMessage(destTargetId, destRoom) {
    var text = document.getElementById('sendMessageText').value;
    if (text.replace(/\s/g, "").length === 0) { // Don't send just whitespace
        return;
    }
    functions.setCookie('lastMessage', text);
    var dest;
    var destGroup = getGroupId();
    if (destRoom || destGroup) {
        dest = {};
        if (destRoom) {
            dest.targetRoom = destRoom;
        }
        if (destGroup) {
            dest.targetGroup = destGroup;
        }
        if (destTargetId) {
            dest.targetEasyrtcid = destTargetId;
        }
    }
    else if (destTargetId) {
        dest = destTargetId;
    }
    else {
        easyrtc.showError("user error", "no destination selected");
        return;
    }

    if (text === "empty") {
        easyrtc.sendPeerMessage(dest, "message");
    }
    else {
        easyrtc.sendDataWS(dest, "message", text, function (reply) {
            if (reply.msgType === "error") {
                easyrtc.showError(reply.msgData.errorCode, reply.msgData.errorText);
            }
        });
    }
    addToConversation("Me", "message", text);
    document.getElementById('sendMessageText').value = "";
    functions.xhr("/room/:roomId/saveMessage", JSON.stringify({ user_id: functions.checkCookie("myId"), roomId: functions.checkCookie("roomName"), name: functions.checkCookie("username"), chat: functions.checkCookie("lastMessage") }));
}


function loginSuccess(easyrtcid) {
    let roomid = functions.getUrlParam("roomid");
    functions.setCookie("roomName", roomid);
    let uid = functions.getUrlParam("uid");
    functions.setCookie("uid", uid);
    addRoom(roomid, null, true);
    functions.xhr("/room/login", JSON.stringify({ external_client_id: functions.checkCookie("uid"), room_id: roomid, name: functions.checkCookie("username") }), function (responseText) {
        if (Number.isInteger(Number(JSON.parse(responseText).result))) {
            functions.setCookie("myId", JSON.parse(responseText).result);
        }
    });
    functions.xhr("/room/getchat", JSON.stringify({ room_id: roomid }), function (responseText) {
        let result = JSON.parse(responseText).result;
        for (var i = 0; i < result.length; i++) {
            if (result[i].external_client_id == functions.checkCookie("uid")) {
                addToConversation("Me", "message", result[i].text, result[i].timestamp);
            }
            else {
                addToConversation(result[i].username, "message", result[i].text, result[i].timestamp);
            }
        }
    });
    isConnected = true;
    // document.getElementById("main").className = "connected";
    enable('otherClients');
    updatePresence();
    if (firstCon) {
        // swal({
        //     title: "Hello.",
        //     allowOutsideClick: false,
        //     html: '<div style="+"font-family: Arial, Helvetica, sans-serif;">Wait until the second user connects.</div>',
        //     icon: "info",
        //     showConfirmButton: false
        // })
        firstCon = false;
    }
}


function loginFailure(errorCode, message) {
    easyrtc.showError("LOGIN-FAILURE", message);
    document.getElementById('connectButton').disabled = false;
    jQuery('#rooms').empty();
}

var currentShowState = 'chat';
var currentShowText = '';

function setPresence(value) {
    currentShowState = value;
    updatePresence();
}

function updatePresenceStatus(value) {
    currentShowText = value;
    updatePresence();
}

function updatePresence() {
    easyrtc.updatePresence(currentShowState, currentShowText);
}



//STREAM PART
var needCall = true;

Array.prototype.deleteEach = function (value) {
    for (var i = this.length; i; this[--i] === value && this.splice(i, 1));
    return this;
};



function disable(domId) {
    console.log("about to try disabling " + domId);
    document.getElementById(domId).disabled = "disabled";
}


function enable(domId) {
    console.log("about to try enabling " + domId);
    document.getElementById(domId).disabled = "";
}


function createLabelledButton(buttonLabel) {
    var button = document.createElement("button");
    button.setAttribute("class", "waves-effect waves-light btn btn-success");
    button.appendChild(document.createTextNode(buttonLabel));
    document.getElementById("videoSrcBlk").appendChild(button);
    return button;
}


function addMediaStreamToDiv(divId, stream, streamName, isLocal) {
    var container = document.createElement("div");
    var formattedName = streamName.replace("(", "<br>").replace(")", "");
    var labelBlock = document.createElement("div");
    labelBlock.style.width = "1%";
    labelBlock.style.height = "1%";
    labelBlock.innerHTML = formattedName;
    labelBlock.style.color = "white";
    container.appendChild(labelBlock);
    var video = document.createElement("video");
    video.setAttribute("class", "responsive-video");
    video.type = "video/webm";
    video.id = "myVideo";
    video.preload = "none";
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.marginBottom = "10px";
    video.style.verticalAlign = "middle";
    video.muted = isLocal;
    video.controls = false;
    container.appendChild(video);
    container.setAttribute("class", "my-flex-block");
    document.getElementById(divId).appendChild(container);
    video.autoplay = true;
    easyrtc.setVideoObjectSrc(video, stream);
    return labelBlock;
}

function createLocalVideo(stream, streamName) {
    addMediaStreamToDiv("localVideos", stream, streamName, true);
};

var usersTocall= [];
function RoomOccupantListener(roomName, occupants) {
    for (var easyrtcid in occupants) {
        easyrtc.sendDataWS(easyrtcid, 'otherusername', { username: functions.checkCookie("username") }, function (ackMesg) {
            if (ackMesg.msgType === 'error') {
                console.log(ackMesg.msgData.errorText);
            }
        });
        usersTocall.push(easyrtcid);
        // setTimeout(() => {
        //     if (needCall) {
        //         startMyscreen(true);
        //         needCall = false;
        //     }
        //     performCall(easyrtcid);
        // }, 2000);
    }
}

function performCall(targetEasyrtcId) {
    var acceptedCB = function (accepted, easyrtcid) {
        if (!accepted) {
            easyrtc.showError("CALL-REJECTED", "Sorry, your call to " + easyrtc.idToName(easyrtcid) + " was rejected");
        }
        else {
            otherEasyrtcid = targetEasyrtcId;
        }
    };
    var successCB = function () {
    };
    var failureCB = function () {
    };
    var keys = easyrtc.getLocalMediaIds();
    easyrtc.call(targetEasyrtcId, successCB, failureCB, acceptedCB, keys);
}


easyrtc.setStreamAcceptor(function (easyrtcid, stream, streamName) {
    //  if (document.getElementById("remoteBlock" + easyrtcid + streamName) == null && streamName != "default") {
    //  document.getElementById("progress").style.display = "none";
    //  document.getElementById("progressMessage").style.display = "none";
    //   document.getElementById("remoteVideos").style.height = "" + ((screen.height / 2) - 75) + "px";
    if (streamsforupdate["remoteBlock" + easyrtcid + streamName] != true) {
        if (document.getElementById("remoteBlock" + easyrtcid + streamName) != null) {
            var item = document.getElementById("remoteBlock" + easyrtcid + streamName);
            item.parentNode.removeChild(item);
            streamsforupdate["remoteBlock" + easyrtcid + streamName] = true;
        }
    }
    if (document.getElementById("remoteBlock" + easyrtcid + streamName) == null && streamName != "default") {
        var labelBlock = addMediaStreamToDiv("remoteVideos", stream, streamName, false);
        labelBlock.parentNode.id = "remoteBlock" + easyrtcid + streamName;
        labelBlock.parentNode.setAttribute("class", "my-flex-block");
        labelBlock.parentNode.height = "100%";
        labelBlock.parentNode.width = "100%";
    }

});
easyrtc.setOnStreamClosed(function (easyrtcid, stream, streamName) {
    var item = document.getElementById("remoteBlock" + easyrtcid + streamName);
    item.parentNode.removeChild(item);
    // document.getElementById("progress").style.display = "block";
    // document.getElementById("progressMessage").style.display = "block";
    // document.getElementById("remoteVideos").style.height = "0px";

});


var callerPending = null;

easyrtc.setCallCancelled(function (easyrtcid) {
    if (easyrtcid === callerPending) {
        callerPending = false;
    }
});

easyrtc.setAcceptChecker(function (easyrtcid, callback) {
    callback(true, easyrtc.getLocalMediaIds());
});

function initializeCarousel(divId) {
    var slider = $('#' + divId + '');
    slider.carousel({
        full_width: true,
        indicators: false
    });
    if (slider.hasClass('initialized')) {
        slider.removeClass('initialized')
    }
    slider.carousel({
        full_width: true,
        indicators: false
    });
}

function playSound() {
    var snd = '<audio autoplay=true> <source src="/materals/ping.mp3"</audio>';
    $('body').append(snd);
}

function startMyscreen(pointOfStart) {
    var streamName = "screen" + randomInteger(4, 99);
    if (pointOfStart) {
        var position = null;
        var imageUrl = '/materals/arrowTop.gif'
        if (window.screen.width >= 1920 && window.screen.height >= 1080) {
            position = 'top-end';
            imageUrl = '/materals/arrowLeft.gif'
        }
        // swal({
        //     position: position,
        //     showConfirmButton: false,
        //     allowOutsideClick: false,
        //     title: 'You have successfully been connected to user ' + otherusername + '',
        //     html: '<div style="font-family: Arial, Helvetica, sans-serif;">Please select the window <b>"WebSearch - Mozilla Firefox"</b> from the drop down menu and allow to share it.</div>',
        //     imageUrl: imageUrl,
        //     imageWidth: 130,
        //     imageHeight: 125,
        //     imageAlt: 'Custom image',
        //     animation: false
        // });
    }
    else {
        // swal({
        //     type: 'error',
        //     title: 'Oops...',
        //     showConfirmButton: false,
        //     allowOutsideClick: false,
        //     html: '<div style="font-family: Arial, Helvetica, sans-serif;">You have chosen the wrong screen! Please select the window <b>"WebSearch - Mozilla Firefox"</b> from the drop down menu and allow to share it.</div>',
        // });
    }
    easyrtc.initDesktopStream(
        function (stream) {
            createLocalVideo(stream, streamName);
            myStreamName = streamName;
            // swal.close();
            if (otherEasyrtcid) {
                easyrtc.addStreamToCall(otherEasyrtcid, streamName);
            }
        },
        function (errCode, errText) {
            // swal({
            //     type: 'error',
            //     title: 'Oops...',
            //     showConfirmButton: false,
            //     allowOutsideClick: false,
            //     html: '<div style="font-family: Arial, Helvetica, sans-serif;">You need to allow your browser to share your screen! Please reload the page and share your screen.</div>',
            // });
            easyrtc.showError(errCode, errText);
        },
        streamName);
};

function postFilesForInterval() {
    postFiles();
    localRecorder.startRecording();
}


function postFiles() {
    var blob = localRecorder.getBlob();
    var fileName = "myId=" + functions.checkCookie("myId") + "--time=" + new Date().toLocaleString().split(":").join(".") + '.webm';
    // streamNamesForMerge.push(fileName);
    var file = new File([blob], fileName, {
        type: 'video/webm',
        name: fileName
    });
    var formData = new FormData();
    formData.append('file', file);
    functions.xhr("/room/:roomId/saveRecord", formData, false);
}

function startRecord(stream) {
    localRecorder = RecordRTC(stream, {
        disableLogs: true
    });
    localRecorder.startRecording();
};

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else {
        root.captureVideoFrame = factory();
    }
}(this, function () {
    return function captureVideoFrame(video, format, quality) {
        if (typeof video === 'string') {
            video = document.getElementById(video);
        }

        format = format || 'jpeg';
        quality = quality || 0.92;

        if (!video || (format !== 'png' && format !== 'jpeg')) {
            return false;
        }

        var canvas = document.createElement("CANVAS");

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        canvas.getContext('2d').drawImage(video, 0, 0);

        var dataUri = canvas.toDataURL('image/' + format, quality);
        var data = dataUri.split(',')[1];
        var mimeType = dataUri.split(';')[0].slice(5)

        var bytes = window.atob(data);
        var buf = new ArrayBuffer(bytes.length);
        var arr = new Uint8Array(buf);

        for (var i = 0; i < bytes.length; i++) {
            arr[i] = bytes.charCodeAt(i);
        }

        var blob = new Blob([arr], { type: mimeType });
        return { blob: blob, dataUri: dataUri, format: format };
    };
}));

// function createVideoForTestStream(stream, streamName) {
//     return new Promise((resolve, reject) => {
//         var container = document.createElement("div");
//         var formattedName = streamName.replace("(", "<br>").replace(")", "");
//         var labelBlock = document.createElement("div");
//         labelBlock.style.width = "100px";
//         labelBlock.style.color = "white";
//         labelBlock.innerHTML = formattedName;
//         container.appendChild(labelBlock);
//         var video = document.createElement("video");
//         video.setAttribute("class", "responsive-video");
//         video.type = "video/webm";
//         video.id = "myVideo";
//         video.style.width = screen.width - 100;
//         video.style.height = (screen.height / 2) - 100;
//         video.style.marginBottom = "10px";
//         video.style.verticalAlign = "middle";
//         video.muted = true;
//         video.controls = false;

//         video.autoplay = true;
//         video.oncanplaythrough = function () {
//             container.appendChild(video);
//             document.getElementById("localVideos").appendChild(container);
//             resolve();

//         }
//         easyrtc.setVideoObjectSrc(video, stream);

//     });
// }
// function checkVideo() {
//     return new Promise((resolve, reject) => {
//         var frame = captureVideoFrame('myVideo', 'png');
//         var img = new Image();
//         var cvs = document.createElement('canvas');
//         var ctx = cvs.getContext("2d");
//         var idt;
//         var pix;
//         img.onload = function () {
//             cvs.width = img.width; cvs.height = img.height;
//             ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
//             idt = ctx.getImageData(0, 0, cvs.width, cvs.height);
//             pix = idt.data;
//             const code = jsQR(pix, cvs.width, cvs.height);
//             if (code != null) {
//                 if (code.data == "pairSearch" + functions.checkCookie("uid")) {
//                     resolve();
//                 }
//             }
//             else {
//                 reject();
//             }
//         };
//         img.setAttribute('src', frame.dataUri);
//     });
// }
function iFrame() {
    let body = document.getElementById("body");
    let frame = document.createElement("iframe");
    frame.id = "myframe";
    frame.src = "/iframe/?roomid=" + functions.getUrlParam("roomid") + "&uid=" + functions.getUrlParam("uid");
    frame.align = "right";
    frame.frameBorder = "0";
    // frame.style.top=0;
    // frame.style.left=screen.height-100;
    frame.height = screen.height;
    frame.width = screen.width / 4 + 50;
    frame.style.resize = "both";
    frame.style.overflow = "auto";
    body.appendChild(frame);

}