var otherEasyrtcid = null;
var otherusername;
var localRecorder;
var streamNamesForMerge = [];
var myStreamName;
var myusername;
var myroomname;
var mysessionid;
var myuid;
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
    if (document.getElementById(roomid)) {
        return;
    }
    function addRoomButton() {
        var roomButtonHolder = document.getElementById('rooms');
        var roomdiv = document.createElement("div");
        roomdiv.id = roomid;
        roomdiv.className = "roomDiv";
        var roomButton = document.createElement("button");
        roomButton.id = myroomname;
        roomButton.innerHTML = "send";
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
        var notificationButton = document.createElement("button");
        notificationButton.id = "notificationButton";
        notificationButton.setAttribute("class", "waves-effect waves-light btn btn-success");
        notificationButton.style.float = "right";
        notificationButton.innerHTML = "need help?";
        notificationButton.onclick = function () {
            Swal.fire({
                title: 'Are you sure?',
                text: "Do you want to send a notification to one of our admins?",
                type: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes'
            }).then((result) => {
                if (result.value) {
                    functions.xhr("/userHelp", JSON.stringify({ myId: mysessionid, myroomname: myroomname }));
                    Swal.fire(
                        'Done!',
                        'One of our admins will connect to you as soon as possible.',
                        'success'
                    )
                }
            })
        }
        var infoButton = document.createElement("button");
        infoButton.id = "infoButton";
        infoButton.setAttribute("class", "waves-effect waves-light btn btn-success");
        infoButton.style.float = "right";
        infoButton.style.marginRight = "1rem";
        infoButton.innerHTML = "Instructions";
        infoButton.onclick = function () {
            Swal.fire({
                html: '<ul style="list-style-type: square !important;"> <li style="list-style-type: square !important; text-align: justify;">Remember that your individual goal is to try and learn as much as possible about the topic that is assigned to you. Your partner has the same goal too. </li><li style="list-style-type: square !important; text-align: justify;">The reason that you are able to see your partner`s screen and chat with your partner is to give you an impression of what another user in the same search task as you is doing. Further, you can discuss aspects of the topic, divide things you want to search about and discuss them thereafter. You may use any other strategies to maximize your learning while using the search interface provided. The extent of your collaboration is up to you, your goal is to learn as much as you can about the given topic.</li><li style="list-style-type: square !important; text-align: justify;">After both you and your partner fulfill your search, please click on the button <span style="color:red;">Go to Evaluation survey</span> to head into the next step. Before that, please make sure that your partner agree that your collaborative searching is completed.</li></ul>',
                type: 'info'
            })
        }

        roomdiv.appendChild(roomButton);
        roomdiv.appendChild(notificationButton);
        roomdiv.appendChild(infoButton);
        roomButtonHolder.appendChild(roomdiv);
        // var roomOccupants = document.createElement("a");
        // roomOccupants.setAttribute("class", "waves-effect waves-light btn btn-success");
        // roomOccupants.id = genRoomOccupantName(roomName);
        // roomOccupants.className = "roomOccupants";
        // roomdiv.appendChild(roomOccupants);
        //$(roomdiv).append(" -<a href=\"javascript:\leaveRoom('" + roomName + "')\">leave</a>");
    }
    var roomParms = null;
    if (parmString && parmString !== "") {
        try {
            roomParms = JSON.parse(parmString);
        } catch (error) {
            roomParms = null;
            functions.xhr("/error", JSON.stringify({ myId: mysessionid, errorCode: easyrtc.errCodes.DEVELOPER_ERR, errorText: "Room Parameters must be an object containing key/value pairs. eg: {\"fruit\":\"banana\",\"color\":\"yellow\"}" }));
            return;
        }
    }
    addRoomButton();
    easyrtc.joinRoom(roomid, roomParms,
        function () {
            /* we'll geta room entry event for the room we were actually added to */
        },
        function (errorCode, errorText, roomName) {
            functions.xhr("/error", JSON.stringify({ myId: mysessionid, errorCode: errorCode, errorText: errorText }));
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
    DetectRTC.load(function () {
        if (DetectRTC.hasMicrophone)
            audioConstraints = true;
        else
            audioConstraints = false;
    });

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
    myusername = functions.checkCookie("username");
    myuid = functions.checkCookie("uid");
    easyrtc.setUsername(myusername);
    easyrtc.connect("easyrtc", loginSuccess, loginFailure);
    // var screenShareButton = createLabelledButton("Desktop capture/share");
    // screenShareButton.onclick = function () {
    //     var streamName = "screen" + randomInteger(4, 99);
    //     easyrtc.initDesktopStream(
    //         function (stream) {
    //             createLocalVideo(stream, streamName);
    //             if (otherEasyrtcid) {
    //                 easyrtc.addStreamToCall(otherEasyrtcid, streamName);
    //             }
    //         },
    //         function (errCode, errText) {
    //             easyrtc.showError(errCode, errText);
    //         },
    //         streamName);
    // };
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
        functions.xhr("/error", JSON.stringify({ myId: mysessionid, errorCode: "user error", errorText: "no destination selected" }));
        return;
    }

    if (text === "empty") {
        easyrtc.sendPeerMessage(dest, "message");
    }
    else {
        easyrtc.sendDataWS(dest, "messageToChat", { text: text, senderName: myusername }, function (reply) {
            if (reply.msgType === "error") {
                functions.xhr("/error", JSON.stringify({ myId: mysessionid, errorCode: messageToChat, errorText: "sendDataWS: error with chat message transport" }));
            }
        });
    }
    addToConversation("Me", "messageToChat", { text: text, senderName: myusername });
    document.getElementById('sendMessageText').value = "";
    functions.xhr("/room/:roomId/saveMessage", JSON.stringify({ user_id: mysessionid, roomId: myroomname, name: myusername, chat: functions.checkCookie("lastMessage") }));
}


function loginSuccess(easyrtcid) {
    window.opener.postMessage("windows checking", window.opener.location.href);
    if (functions.checkCookie(myroomname)) {
        console.log(1);
        logloginToBD(easyrtcid);
    }
    else {
        easyrtc.getRoomList(function (roomName) {
            myroomname = JSON.parse(roomName);
            functions.setCookie("myroomname", myroomname);
            addRoom(myroomname, null, true);
            logloginToBD(easyrtcid);
        }, function (errorCode, errorText) {
            console.log(errorCode + errorText);
            functions.xhr("/error", JSON.stringify({ myId: mysessionid, errorCode: errorCode, errorText: errorText }));
        });
    }
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

function logloginToBD(easyrtcid) {
    functions.xhr("/room/login", JSON.stringify({ external_client_id: myuid, room_id: myroomname, name: myusername, myeasyrtcid: easyrtcid }), function (responseText) {
        if (Number.isInteger(Number(JSON.parse(responseText).result))) {
            functions.setCookie("myId", JSON.parse(responseText).result);
            mysessionid = JSON.parse(responseText).result;
        }
    });
}


function loginFailure(errorCode, message) {
    easyrtc.showError("LOGIN-FAILURE", message);
    functions.xhr("/error", JSON.stringify({ myId: mysessionid, errorCode: "LOGIN-FAILURE", errorText: message }));
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
            functions.xhr("/event", JSON.stringify({ myId: mysessionid, eventId: 3 }));
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
        otherusername = easyrtc.idToName(easyrtcid);
        setTimeout(() => {
            if (needCall) {
                startMyscreen(true);
                playSound();
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
    //if (pointOfStart) {
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
        easyrtc.initDesktopStream(
            function (stream) {
                createLocalVideo(stream, streamName);
                myStreamName = streamName;
                swal.close();
                if (otherEasyrtcid) {
                    easyrtc.addStreamToCall(otherEasyrtcid, streamName);
                }
            },
            function (errorCode, errorText) {
                functions.xhr("/error", JSON.stringify({ myId: mysessionid, errorCode: errorCode, errorText: errorText }));
                swal({
                    type: 'error',
                    title: 'Oops...',
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    html: '<div style="font-family: Arial, Helvetica, sans-serif;">You need to allow your browser to share your screen! Please reload the page and share your screen.</div>',
                });
            },
            streamName);
    //}
   // else {

        // swal({
        //     type: 'error',
        //     title: 'Oops...',
        //     showConfirmButton: false,
        //     allowOutsideClick: false,
        //     text:'We can`t determine your screen. Please reload a page and try once more.'
        //     //html: '<div style="font-family: Arial, Helvetica, sans-serif;">You have chosen the wrong screen! Please select the window <b>"WebSearch - Mozilla Firefox"</b> from the drop down menu and allow to share it.</div>',
        // });
    //}
};

function postFilesForInterval() {
    postFiles();
    localRecorder.startRecording();
}


function postFiles() {
    var blob = localRecorder.getBlob();
    var fileName = "myId=" + mysessionid + "--time=" + new Date().toLocaleString().split(":").join(".") + '.webm';
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
            setTimeout(function(){
                resolve();
            }, 1500);

        }
        easyrtc.setVideoObjectSrc(video, stream);

    });
}
function checkVideo() {
    return new Promise((resolve, reject) => {
        var frame = captureVideoFrame('myVideo', 'png');
        var img = new Image();
        var cvs = document.getElementById("myCanvas");
        var ctx = cvs.getContext("2d");
        var idt;
        var pix;
        img.onload = function () {
            cvs.width = img.width; cvs.height = img.height;
            ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
            idt = ctx.getImageData(0, 0, cvs.width, cvs.height);
            pix = idt.data;
            const code = jsQR(pix, cvs.width, cvs.height);
            if (code == null) {
                functions.xhr("/error", JSON.stringify({ myId: mysessionid, errorCode: "wrongScreen", errorText: "user selected wrong screen or QR code not recognized." }));
            }
                document.getElementById("myVideo").parentNode.removeChild(document.getElementById("myVideo"));
                resolve();
            // }
            // else {
            //     reject();
            // }
        };
        img.setAttribute('src', frame.dataUri);
    });
}