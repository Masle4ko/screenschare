
var isConnected = false;
var otherEasyrtcid = null;
var needToCallOtherUsers;
var otherusername;
var localRecorder;
var streamNamesForMerge = [];
var myStreamName;
var myusername;
var myroomname;
function initApp() {
    connect();
    window.onbeforeunload = function () {
        return "There are unsaved changes. Leave now?";
    };
    window.onunload = function () {
        easyrtc.disconnect();
    };
}


function addToConversation(who, msgType, content, targeting) {
    if (msgType === 'otherusername') {
        otherusername = content.username;
        return;
    }
    if (!content) {
        content = "**no body**";
    }
    if (msgType == "messageToChat") {
        content.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        content.text.replace(/\n/g, '<br />');
        // var targetingStr = "";
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
        if (content.senderName == myusername) {
            who = "Me";
        }
        else {
            who = content.senderName;
        }
        document.getElementById('conversation').innerHTML +=
            new Date().toLocaleTimeString() + " <b>" + who + ":</b>&nbsp;" + content.text + "<br />";
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
            sendMessageToChat(null, roomButton.id);

        };
        document.onkeyup = function (e) {
            e = e || window.event;
            if (e.keyCode === 13) {
                sendMessageToChat(null, roomButton.id);
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
    addRoomButton();
    easyrtc.joinRoom(roomid, roomParms,
        function () {
            /* we'll geta room entry event for the room we were actually added to */
        },
        function (errorCode, errorText, roomName) {
            easyrtc.showError(errorCode, errorText + ": room name was(" + roomName + ")");
        });

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
    // easyrtc.enableDataChannels(true);
    easyrtc.setAutoInitUserMedia(false);
    easyrtc.setRoomEntryListener();
    // easyrtc.setDataChannelCloseListener();
    easyrtc.setPeerListener(peerListener);
    easyrtc.setRoomOccupantListener(RoomOccupantListener);
    easyrtc.setDisconnectListener(function () {
        easyrtc.closeLocalStream(myStreamName);
        jQuery('#rooms').empty();
        document.getElementById("main").className = "notconnected";
        swal({
            type: 'error',
            title: 'Oops...',
            showConfirmButton: false,
            allowOutsideClick: false,
            html: '<div style="font-family: Arial, Helvetica, sans-serif;">Something went wrong. Please reload the page.</div>'
        });
    });
    updatePresence();
    easyrtc.connect("easyrtc", loginSuccess, loginFailure);
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

function sendMessageToChat(destTargetId, destRoom) {
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
        easyrtc.sendDataWS(dest, "messageToChat", { text: text, senderName: myusername }, function (reply) {
            if (reply.msgType === "error") {
                easyrtc.showError(reply.msgData.errorCode, reply.msgData.errorText);
            }
        });
    }
    addToConversation("Me", "messageToChat", { text: text, senderName: myusername });
    document.getElementById('sendMessageText').value = "";
    functions.xhr("/room/:roomId/saveMessage", JSON.stringify({ user_id: functions.checkCookie("myId"), roomId: functions.checkCookie("roomName"), name: myusername, chat: functions.checkCookie("lastMessage") }));
}


function loginSuccess(easyrtcid) {
    myusername = functions.checkCookie("username");
    myroomname = functions.checkCookie("roomName");
    console.log(myusername);
    easyrtc.getRoomList(function (roomList) {
        functions.setCookie("roomName", JSON.parse(roomList));
        addRoom(JSON.parse(roomList), null, true);
        functions.xhr("/room/login", JSON.stringify({ external_client_id: functions.checkCookie("uid"), room_id: myroomname, name: myusername }), function (responseText) {
            if (Number.isInteger(Number(JSON.parse(responseText).result))) {
                functions.setCookie("myId", JSON.parse(responseText).result);
            }
        });
    }, function (errorCode, errorText) {
        console.log(errorCode + errorText);
    });
    isConnected = true;
    document.getElementById("main").className = "connected";
    enable('otherClients');
    updatePresence();
    swal({
        title: "Hello.",
        allowOutsideClick: false,
        html: '<div style="+"font-family: Arial, Helvetica, sans-serif;">Wait until the second user connects.</div>',
        icon: "info",
        showConfirmButton: false
    })
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
    labelBlock.style.width = "100px";
    labelBlock.innerHTML = formattedName;
    labelBlock.style.color = "white";
    container.appendChild(labelBlock);
    var video = document.createElement("video");
    video.setAttribute("class", "responsive-video");
    video.type = "video/webm";
    video.id = "myVideo";
    video.preload = "none";
    video.style.width = screen.width - 100;
    video.style.height = (screen.height / 2) - 100;
    video.style.marginBottom = "10px";
    video.style.verticalAlign = "middle";
    video.muted = isLocal;
    video.controls = false;
    container.appendChild(video);
    document.getElementById(divId).appendChild(container);
    video.autoplay = true;
    easyrtc.setVideoObjectSrc(video, stream);
    return labelBlock;
}

function createLocalVideo(stream, streamName) {

    createVideoForTestStream(stream, streamName)
        .then(function () {
            return checkVideo()
        })
        .then(function () {
            myStreamName = streamName;
            //performCall(userForCall);
            // startRecord(stream);
            // $.post("/event", { myId: parseInt(functions.checkCookie("myId")), eventId: 3 });
            // var recordInterval = setInterval(function () {
            //     localRecorder.stopRecording(postFilesForInterval);
            // }, 10000);
        }, function () {
            easyrtc.closeLocalStream(streamName);
            document.getElementById("myVideo").parentNode.removeChild(document.getElementById("myVideo"));
            startMyscreen(false);
        });
};

function RoomOccupantListener(roomName, occupants) {
    for (var easyrtcid in occupants) {
        easyrtc.sendDataWS(easyrtcid, 'otherusername', { username: myusername }, function (ackMesg) {
            if (ackMesg.msgType === 'error') {
                console.log(ackMesg.msgData.errorText);
            }
        });
        setTimeout(() => {
            if (needCall) {
                startMyscreen(true);
                needCall = false;
            }
            performCall(easyrtcid);
        }, 2000);
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
    if (document.getElementById("remoteBlock" + easyrtcid + streamName) != null) {
        var item = document.getElementById("remoteBlock" + easyrtcid + streamName);
        item.parentNode.removeChild(item);
    }
    if (document.getElementById("remoteBlock" + easyrtcid + streamName) == null && streamName != "default") {
        document.getElementById("progress").style.display = "none";
        document.getElementById("progressMessage").style.display = "none";
        document.getElementById("remoteVideos").style.height = "" + ((screen.height / 2) - 75) + "px";
        var labelBlock = addMediaStreamToDiv("remoteVideos", stream, streamName, false);
        labelBlock.parentNode.id = "remoteBlock" + easyrtcid + streamName;
    }
});
easyrtc.setOnStreamClosed(function (easyrtcid, stream, streamName) {
    var item = document.getElementById("remoteBlock" + easyrtcid + streamName);
    item.parentNode.removeChild(item);
    document.getElementById("progress").style.display = "block";
    document.getElementById("progressMessage").style.display = "block";
    document.getElementById("remoteVideos").style.height = "0px";
    document.getElementById('conversation').innerHTML +=
        new Date().toLocaleTimeString() + " <b> user '" + otherusername + "' left the session.</b><br />";

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
        swal({
            position: position,
            showConfirmButton: false,
            allowOutsideClick: false,
            title: 'You have successfully been connected to user ' + otherusername + '',
            html: '<div style="font-family: Arial, Helvetica, sans-serif;">Please select the window <b>"WebSearch - Mozilla Firefox"</b> from the drop down menu and allow to share it.</div>',
            imageUrl: imageUrl,
            imageWidth: 130,
            imageHeight: 125,
            imageAlt: 'Custom image',
            animation: false
        });
    }
    else {
        swal({
            type: 'error',
            title: 'Oops...',
            showConfirmButton: false,
            allowOutsideClick: false,
            html: '<div style="font-family: Arial, Helvetica, sans-serif;">You have chosen the wrong screen! Please select the window <b>"WebSearch - Mozilla Firefox"</b> from the drop down menu and allow to share it.</div>',
        });
    }
    easyrtc.initDesktopStream(
        function (stream) {
            console.log(stream);
            createLocalVideo(stream, streamName);
            myStreamName = streamName;
            swal.close();
            if (otherEasyrtcid) {
                easyrtc.addStreamToCall(otherEasyrtcid, streamName);
            }
        },
        function (errCode, errText) {
            swal({
                type: 'error',
                title: 'Oops...',
                showConfirmButton: false,
                allowOutsideClick: false,
                html: '<div style="font-family: Arial, Helvetica, sans-serif;">You need to allow your browser to share your screen! Please reload the page and share your screen.</div>',
            });
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

function createVideoForTestStream(stream, streamName) {
    return new Promise((resolve, reject) => {
        var container = document.createElement("div");
        var formattedName = streamName.replace("(", "<br>").replace(")", "");
        var labelBlock = document.createElement("div");
        labelBlock.style.width = "100px";
        labelBlock.style.color = "white";
        labelBlock.innerHTML = formattedName;
        container.appendChild(labelBlock);
        var video = document.createElement("video");
        video.setAttribute("class", "responsive-video");
        video.type = "video/webm";
        video.id = "myVideo";
        video.style.width = screen.width - 100;
        video.style.height = (screen.height / 2) - 100;
        video.style.marginBottom = "10px";
        video.style.verticalAlign = "middle";
        video.muted = true;
        video.controls = false;
        video.autoplay = true;
        video.oncanplaythrough = function () {
            container.appendChild(video);
            document.getElementById("localVideos").appendChild(container);
            resolve();

        }
        easyrtc.setVideoObjectSrc(video, stream);

    });
}
function checkVideo() {
    return new Promise((resolve, reject) => {
        var frame = captureVideoFrame('myVideo', 'png');
        var img = new Image();
        var cvs = document.createElement('canvas');
        var ctx = cvs.getContext("2d");
        var idt;
        var pix;
        img.onload = function () {
            cvs.width = img.width; cvs.height = img.height;
            ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
            idt = ctx.getImageData(0, 0, cvs.width, cvs.height);
            pix = idt.data;
            const code = jsQR(pix, cvs.width, cvs.height);
            if (code != null) {
                if (code.data == "pairSearch" + functions.checkCookie("uid")) {
                    document.getElementById("myVideo").parentNode.removeChild(document.getElementById("myVideo"));
                    resolve();
                }
            }
            else {
                reject();
            }
        };
        img.setAttribute('src', frame.dataUri);
    });
}