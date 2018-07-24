
var selfEasyrtcid = "";
var waitingForRoomList = true;
var isConnected = false;
var haveSelfVideo = false;
var otherEasyrtcid = null;
var userId;
var needToCallOtherUsers;
var otherusername;
var localStreamNames = [];

function initApp() {
    selfEasyrtcid = functions.checkCookie("selfEasyrtcid");
    connect();
    window.onbeforeunload = function (event) {
        sessionStorage.setItem('reload', 'true');
        for (var i = 0; i < localStreamNames.length; i++) {
            easyrtc.closeLocalStream(localStreamNames[i]);
            localRecorder.stopRecording(postFilesForEndOfStream);
            $.post("/event", { user_id: functions.checkCookie("myId"), action_id: 2 });
        }
        var dialogText = 'Dialog text here';
        event.returnValue = dialogText;
        return dialogText;
    };
}

function addToConversation(who, msgType, content, targeting) {
    if (msgType === 'otherusername') {
        otherusername = content.username;
    }
    if (!content) {
        content = "**no body**";
    }
    content = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    content = content.replace(/\n/g, '<br />');
    var targetingStr = "";
    if (targeting) {
        if (targeting.targetEasyrtcid) {
            targetingStr += "user=" + targeting.targetEasyrtcid;
        }
        if (targeting.targetRoom) {
            targetingStr += " room=" + targeting.targetRoom;
        }
        if (targeting.targetGroup) {
            targetingStr += " group=" + targeting.targetGroup;
        }
    }
    if (who != "Me")
        who = otherusername;
    document.getElementById('conversation').innerHTML +=
        "<b>" + who + ":</b>&nbsp;" + content + "<br />";
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

function addRoom(roomName, parmString, userAdded) {
    if (!roomName) {
        roomName = "send";
        var roomId = functions.checkCookie("selfEasyrtcid");
    }
    var roomid = genRoomDivName(roomName);
    if (document.getElementById(roomid)) {
        return;
    }
    function addRoomButton() {
        var roomButtonHolder = document.getElementById('rooms');
        var roomdiv = document.createElement("div");
        roomdiv.id = roomid;
        roomdiv.className = "roomDiv";
        var roomButton = document.createElement("button");
        roomButton.id = functions.checkCookie("selfEasyrtcid");
        roomButton.setAttribute("class", "waves-effect waves-light btn btn-success");
        roomButton.onclick = function () {
            sendMessage(null, roomButton.id);
        };
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
        addRoomButton();
        console.log("adding gui for room " + roomName);
    }
    else {
        console.log("not adding gui for room " + roomName + " because already connected and it's a user action");
    }
    if (userAdded) {
        console.log("calling joinRoom(" + roomName + ") because it was a user action ");
        addRoomButton();
        easyrtc.joinRoom(roomId, roomParms,
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
    easyrtc.setRoomEntryListener();
    easyrtc.setDataChannelCloseListener();
    easyrtc.setRoomOccupantListener(RoomOccupantListener);
    easyrtc.setPeerListener(peerListener);
    easyrtc.setDisconnectListener(function () {
        jQuery('#rooms').empty();
        document.getElementById("main").className = "notconnected";
        console.log("disconnect listener fired");
        swal({
            type: 'error',
            title: 'Oops...',
            showConfirmButton: false,
            allowOutsideClick: false,
            html: '<div style="font-family: Arial, Helvetica, sans-serif;">Something went wrong. Please reload the page.</div>'
        });
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
}


function loginSuccess(easyrtcid) {
    isConnected = true;
    userId = easyrtcid;
    document.getElementById("main").className = "connected";
    if (functions.checkCookie("roomCreator") == "true") {
        addRoom(null, null, true);
        functions.setCookie('hostUser', true);
    }
    else {
        addRoom(null, null, true);
    }
    enable('otherClients');
    updatePresence();
    // swal({
    //     title: "Hello.",
    //     allowOutsideClick: false,
    //     html: '<div style="+"font-family: Arial, Helvetica, sans-serif;">Wait until the second user connects.</div>',
    //     icon: "info",
    //     showConfirmButton: false
    // })
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

function windowOpen(url, title, top, left, width, height, location = "1", toolbar = "1", menubar = "1", scrollbars = "1") {
    window.open(url, title, "top=" + 0 + ", left=" + left + ", width=" + width + ",height=" + height + ", location=" + location + ", toolbar=" + toolbar + ", menubar=" + menubar + ",scrollbars=" + scrollbars + "");
}


//STREAM PART
var otherEasyrtcid = null;
var needCall = true;
var streamNumbers = 0;

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
    container.setAttribute("class", "carousel-item gray white-text");
    container.style.display = "block";
    var formattedName = streamName.replace("(", "<br>").replace(")", "");
    var labelBlock = document.createElement("div");
    labelBlock.style.width = "100px";
    labelBlock.innerHTML = formattedName;
    container.appendChild(labelBlock);
    var video = document.createElement("video");
    video.setAttribute("class", "responsive-video");
    video.type = "video/webm";
    video.controls = true;
    video.style.width = screen.width - 100;
    video.style.height = (screen.height / 2) - 100;
    video.muted = isLocal;
    video.style.marginBottom = "10px";
    video.style.verticalAlign = "middle";
    container.appendChild(video);
    document.getElementById(divId).appendChild(container);
    initializeCarousel(divId);
    if (divId == "remoteVideos") {
        labelBlock.style.width = "0px";
        document.getElementById("remoteVideos").style.height = video.style.height + 25;
        document.getElementById("remoteVideos").style.width = video.style.width + 25;
        if (++streamNumbers > 1) {
            document.getElementById("remoteVideosControlButtons").style.display = "block";
        }
    }
    easyrtc.setVideoObjectSrc(video, stream);
    video.autoplay = true;
    return labelBlock;
}

function createLocalVideo(stream, streamName) {
    createVideoForTestStream(stream)
        .then(function () {
            return checkVideo()
        })
        .then(function () {
            localStreamNames.push(streamName);
            var labelBlock = addMediaStreamToDiv("localVideos", stream, streamName, true);
            document.getElementById("localVideos").style.height = "500px";
            var closeButton = createLabelledButton("close");
            startRecord(stream);
            $.post("/event", { user_id: functions.checkCookie("myId"), action_id: 3 });
            closeButton.onclick = function () {
                clearInterval(recordInterval);
                localRecorder.stopRecording(postFilesForEndOfStream);
                easyrtc.closeLocalStream(streamName);
                console.log(localStreamNames);
                localStreamNames.deleteEach(streamName);
                console.log(localStreamNames);
                initializeCarousel("localVideos");
                labelBlock.parentNode.parentNode.removeChild(labelBlock.parentNode);
                if (document.getElementById("localVideos").childElementCount == 0)
                    document.getElementById("localVideos").style.height = "0px";
            }
            var recordInterval = setInterval(function () {
                localRecorder.stopRecording(postFilesForInterval);
            }, 5000);
            labelBlock.appendChild(closeButton);
        }, function () {
            easyrtc.closeLocalStream(streamName);
            startMyscreen(false);
        });
};

function RoomOccupantListener(roomName, occupants) {
    easyrtc.setAutoInitUserMedia(false);
    for (var easyrtcid in occupants) {
        easyrtc.sendDataWS(easyrtcid, 'otherusername', { username: functions.checkCookie("username") }, function (ackMesg) {
            if (ackMesg.msgType === 'error') {
                console.log(ackMesg.msgData.errorText);
            }
        });
        if (needCall) {
            if (sessionStorage.getItem('reload') === 'true') {
                performCall(easyrtcid);
            }
            if (functions.checkCookie("roomCreator") == "true") {
                playSound();
            }
            setTimeout(() => {
                startMyscreen(true);
            }, 500);
            needCall = false;
        }
        if (sessionStorage.getItem('reload') != 'true') {
            performCall(easyrtcid);
        }
    }

}

function performCall(targetEasyrtcId) {
    var acceptedCB = function (accepted, easyrtcid) {
        if (!accepted) {
            easyrtc.showError("CALL-REJECTED", "Sorry, your call to " + easyrtc.idToName(easyrtcid) + " was rejected");
            enable('otherClients');
        }
        else {
            otherEasyrtcid = targetEasyrtcId;
        }
    };
    var successCB = function () {
    };
    var failureCB = function () {
        enable('otherClients');
    };
    var keys = easyrtc.getLocalMediaIds();
    easyrtc.call(targetEasyrtcId, successCB, failureCB, acceptedCB, keys);
}


easyrtc.setStreamAcceptor(function (easyrtcid, stream, streamName) {
    if (document.getElementById("remoteBlock" + easyrtcid + streamName) == null && streamName != "default") {
        document.getElementById("progress").style.display = "none";
        document.getElementById("progressMessage").style.display = "none";
        document.getElementById("remoteVideos").style.height = "" + ((screen.height / 2) - 75) + "px";
        var labelBlock = addMediaStreamToDiv("remoteVideos", stream, streamName, false);
        labelBlock.parentNode.id = "remoteBlock" + easyrtcid + streamName;
    }
});

easyrtc.setOnStreamClosed(function (easyrtcid, stream, streamName) {
    var item;
    while (document.getElementById("remoteBlock" + easyrtcid + streamName) != null) {
        item = document.getElementById("remoteBlock" + easyrtcid + streamName);
        item.parentNode.removeChild(item);
        if (--streamNumbers < 2) {
            document.getElementById("remoteVideosControlButtons").style.display = "none";
        }
    }
    if (document.getElementById("remoteVideos").childElementCount == 1) {
        document.getElementById("progress").style.display = "block";
        document.getElementById("progressMessage").style.display = "block";
        document.getElementById("remoteVideos").style.height = "0px";
    }
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
            createLocalVideo(stream, streamName);
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


//RECORDING PART
////////////////////////////////

var localRecorder;
var streamNamesForMarge = [];

function mergeSream() {
    var xhr = new XMLHttpRequest();
    var json = JSON.stringify(streamNamesForMarge);
    xhr.open("POST", '/room/:roomId/mergeVideo', true)
    xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    xhr.send(json);
    $.post("/event", { user_id: functions.checkCookie("myId"), action_id: 2 });
}

function postFilesForInterval() {
    postFiles();
    localRecorder.startRecording();
}
function postFilesForEndOfStream() {
    postFiles();
    mergeSream();
}
function postFiles() {
    var blob = localRecorder.getBlob();
    var fileName = "uid=" + functions.checkCookie("uid") + "--time=" + new Date().toLocaleString().split(":").join(".") + '.webm';
    streamNamesForMarge.push(fileName);
    var file = new File([blob], fileName, {
        type: 'video/webm',
        name: fileName
    });
    xhr("/room/:roomId/saveRecord", file);

}

function xhr(url, data) {
    var request = new XMLHttpRequest();
    // request.onreadystatechange = function () {
    //     if (request.readyState == 4 && request.status == 200) {
    //         callback(request.responseText);
    //     }
    // };
    request.open('POST', url);

    var formData = new FormData();
    formData.append('file', data);
    request.send(formData);
}

function startRecord(stream) {
    localRecorder = RecordRTC(stream, {
        type: 'video'
    });
    localRecorder.startRecording();
};


// function getPixelData() {
//     var frame = captureVideoFrame('localV', 'png');
//     var img = new Image();
//     var cvs = document.createElement('canvas');
//     var ctx = cvs.getContext("2d");
//     var idt;
//     var pix;
//     var myPromise = new Promise((resolve, reject) => {
//         img.onload = function () {
//             resolve();
//         }
//     });
//     myPromise.then(function () {
//         var countRed = 0;
//         var countGrey = 0;
//         cvs.width = img.width; cvs.height = img.height;
//         console.log(img.width + "  " + img.height);
//         ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
//         idt = ctx.getImageData(0, 0, cvs.width, cvs.height);
//         pix = idt.data;
//         for (var i = 0, n = pix.length; i < n; i += 4) {
//             if (pix[i] > 250 && pix[i + 1] > 87 && pix[i + 1] < 95 && pix[i + 2] > 87 && pix[i + 2] < 95) {
//                 ++countRed;
//                 continue;
//             }
//             if (pix[i] > 68 && pix[i] < 72 && pix[i + 1] > 87 && pix[i + 1] < 93 && pix[i + 2] > 90 && pix[i + 2] < 103) {
//                 ++countGrey;
//                 continue;
//             }
//         }
//         if (window.screen.width >= 1920 && window.screen.height >= 1080) {
//             if (countRed > 1400 && countGrey > 1600) {
//                 console.log(2);
//             }
//         }
//         else {
//             if (window.screen.width >= 1360 && window.screen.width < 1920 && window.screen.height >= 720 && window.screen.height < 1080) {
//                 if (countRed > 1400 && countGrey > 1600) {
//                     console.log(33);
//                     resolve();
//                 }
//                 else {
//                     swal({
//                         type: 'error',
//                         title: 'Oops...',
//                         showConfirmButton: false,
//                         allowOutsideClick: false,
//                         html: '<div style="font-family: Arial, Helvetica, sans-serif;">Something went wrong. Please reload the page.</div>'
//                     });
//                 }
//             }
//         }
//     }, function (err) { console.log(err); });
//     img.setAttribute('src', frame.dataUri);
// }

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

function createVideoForTestStream(stream) {
    return new Promise((resolve, reject) => {
        var video = document.createElement("video");
        video.setAttribute("class", "responsive-video");
        video.id = "testStream";
        video.setAttribute("class", "responsive-video");
        video.type = "video/webm";
        video.style.display = "none";
        video.oncanplaythrough = function () {
            document.getElementById("body").appendChild(video);
            resolve();

        }
        easyrtc.setVideoObjectSrc(video, stream);

    });
}
function checkVideo() {
    return new Promise((resolve, reject) => {
        var frame = captureVideoFrame('testStream', 'png');
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
            document.getElementById("testStream").parentNode.removeChild(document.getElementById("testStream"));
            if (code) {
                if (code.data == "pairSearch" + functions.checkCookie("uid"))
                    resolve();
            }
            else {
                reject();
            }
        };
        img.setAttribute('src', frame.dataUri);
    });
}