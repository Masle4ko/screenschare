
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
var streamsforupdate = [];
var listforotheruid = [];
function initApp() {
    connect();
    window.onunload = function () {
        easyrtc.disconnect();
    };
}


function addToConversation(who, msgType, content, time = null) {
    if (msgType === 'uid') {
        listforotheruid[content.uid] = true;
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
        if (Object.prototype.toString.call(time) === '[object String]') {
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
    audioConstraints = true;
    videoConstraints = false;
    easyrtc.setAutoInitUserMedia(false);
    easyrtc.setRoomEntryListener();
    easyrtc.setPeerListener(peerListener);
    easyrtc.setRoomOccupantListener(RoomOccupantListenerBeforeInsert);
    easyrtc.setDisconnectListener(function () {
        easyrtc.closeLocalStream(myStreamName);
        easyrtc.hangupAll();
        jQuery('#rooms').empty();
    });
    updatePresence();
    easyrtc.connect("easyrtc.instantMessaging", loginSuccess, loginFailure);
    var screenShareButton = createLabelledButton("Desktop capture/share");
    screenShareButton.onclick = function () {
        if (videoConstraints != false) {
            var streamName = "video";
        }
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
    //enable('otherClients');
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


function addMediaStreamToLocalDiv(divId, stream, streamName, isLocal) {
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
    video.style.width = "0%";
    video.style.height = "0%";
    video.style.marginBottom = "10px";
    video.style.verticalAlign = "middle";
    video.muted = true;
    video.controls = false;
    video.autoplay = true;
    container.appendChild(video);
    container.setAttribute("class", "my-flex-block");
    document.getElementById(divId).appendChild(container);
    easyrtc.setVideoObjectSrc(video, stream);
    return labelBlock;
}

function addMediaStreamToRemotelDiv(divId, stream, streamName, easyrtcid) {
    let parent = document.getElementById(divId);
    let child = createelem("div", "my-flex-block1", streamName + easyrtcid);
    let indicators = createelem("div", "indicators", "indicators" + easyrtcid);
    let audio = createelem("div", "micro-btn", "audio" + easyrtcid);
    let iformicro = createelem("i", "material-icons small", "audioicon" + easyrtcid, { position: "absolute", width: "28px", height: "28px" }, "volume_up");
    audio.appendChild(iformicro);
    let video;
    if (streamName == "video")
        video = createelem("div", "micro-btn", "videobtn" + easyrtcid, { width: "100%", height: "100%" });
    else
        video = createelem("div", "micro-btn-disabled", "videobtn" + easyrtcid);
    let iforvideo = createelem("i", "material-icons small", "videoicon" + easyrtcid, { position: "absolute", width: "28px", height: "28px" }, "video_label");
    video.appendChild(iforvideo);
    indicators.appendChild(video);
    indicators.appendChild(audio);
    child.appendChild(indicators);
    let userinfo = createelem("div", "user-info", "userinfo" + easyrtcid, undefined, easyrtcid);
    child.appendChild(userinfo);
    let audioBlock = createelem("video", "", "mediablock" + easyrtcid);
    easyrtc.setVideoObjectSrc(audioBlock, stream);
    audioBlock.style.width = "100%";
    audioBlock.style.height = "100%";
    child.appendChild(audioBlock);
    parent.appendChild(child);
    appendeffect(audio.id, () => switcmicro(audioBlock.id, iformicro.id));
    appendeffect(video.id, () => streamtomain(video.id, stream));
}

function createelem(name, classname, id, style, innerHTML, disabled) {
    let elem = document.createElement(name);
    elem.setAttribute("class", classname);
    elem.id = id;
    if (style != undefined)
        elem.style = style;
    if (innerHTML != undefined)
        elem.innerHTML = innerHTML;
    if (disabled != undefined) {
        elem.disabled = disabled;
    }
    return elem;

}
function streamtomain(id, stream) {
    easyrtc.setVideoObjectSrc(document.getElementById("meinMedia"), stream);
}

function switcmicro(audioBlockid, iid) {
    var audioBlock = document.getElementById(audioBlockid);
    var i = document.getElementById(iid);
    if (audioBlock.muted === false) {
        audioBlock.muted = true;
        i.innerHTML = "volume_off";

    }
    else {
        if (audioBlock.muted == true) {
            audioBlock.muted = false;
            i.innerHTML = "volume_up";
        }
    }
}

function appendeffect(id, func) {
    $("#" + id + "").click(function (e) {
        func();
        // Remove any old one
        $(".ripple").remove();

        // Setup
        var posX = $(this).offset().left,
            posY = $(this).offset().top,
            buttonWidth = $(this).width(),
            buttonHeight = $(this).height();

        // Add the element
        $(this).prepend("<span class='ripple'></span>");


        // Make it round!
        if (buttonWidth >= buttonHeight) {
            buttonHeight = buttonWidth;
        } else {
            buttonWidth = buttonHeight;
        }

        // Get the center of the element
        var x = e.pageX - posX - buttonWidth / 2;
        var y = e.pageY - posY - buttonHeight / 2;

        // Add the ripples CSS and start the animation
        $(".ripple").css({
            width: buttonWidth,
            height: buttonHeight,
            top: y + 'px',
            left: x + 'px'
        }).addClass("rippleEffect");
    });
}

function createLocalVideo(stream, streamName) {
    addMediaStreamToLocalDiv("localVideos", stream, streamName, true);
};
function RoomOccupantListener(roomName, occupants) {
    for (var easyrtcid in occupants) {
        easyrtc.sendDataWS(easyrtcid, 'uid', { uid: functions.checkCookie("uid") }, function (ackMesg) {
            if (ackMesg.msgType === 'error') {
                console.log(ackMesg.msgData.errorText);
            }
        });
        if (listtocall.has(easyrtcid) != true)
            listtocall.set(easyrtcid, true);
        setTimeout(() => {
            if (needCall) {
                startMyscreen(true);
                needCall = false;
            }
            performCall(easyrtcid);
        }, 2000);
    }
}
var listtocall = new Map();
function RoomOccupantListenerBeforeInsert(roomName, occupants) {
    for (var easyrtcid in occupants) {
        easyrtc.sendDataWS(easyrtcid, 'uid', { uid: functions.checkCookie("uid") }, function (ackMesg) {
            if (ackMesg.msgType === 'error') {
                console.log(ackMesg.msgData.errorText);
            }
        });
        if (listtocall.has(easyrtcid) != true)
            listtocall.set(easyrtcid, true);
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


var forem = [];
easyrtc.setStreamAcceptor(function (easyrtcid, stream, streamName) {
    if (streamName == "video") {
        if (document.getElementById("video" + easyrtcid) == null) {
            addMediaStreamToRemotelDiv("remoteVideos", stream, streamName, easyrtcid);
            forem[easyrtcid] = streamName + easyrtcid;
        }
    }
    else {
        if (document.getElementById(streamName + easyrtcid) == null && streamName != "default") {
            addMediaStreamToRemotelDiv("remoteVideos", stream, streamName, easyrtcid);
            forem[easyrtcid] = streamName + easyrtcid;
        }
    }

});
easyrtc.setOnStreamClosed(function (easyrtcid, stream, streamName) {
    var item = document.getElementById(streamName + easyrtcid);
    item.parentNode.removeChild(item);
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

function startMyscreen(pointOfStart) {
    var streamName;
    if (audioConstraints != false && videoConstraints == false)
        streamName = "onlyaudio";
    if (audioConstraints != false && videoConstraints != false)
        streamName = "video";
    easyrtc.initDesktopStream(
        function (stream) {
            createLocalVideo(stream, streamName);
            myStreamName = streamName;
            if (otherEasyrtcid) {
                easyrtc.addStreamToCall(otherEasyrtcid, streamName);
            }
        },
        function (errCode, errText) {
            easyrtc.showError(errCode, errText);
        },
        streamName);
};


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

function hangupAll() {
    easyrtc.hangupAll();
    document.getElementById("hangupAll").disabled = true;
    document.getElementById("insertmediachat").disabled = false;
    document.getElementById("forremoteVideos").style.display = "none";
    document.getElementById("111").style.height = "5%";
    document.getElementById("mediachatcontrols").style.height = "100%";

    easyrtc.setRoomOccupantListener(RoomOccupantListenerBeforeInsert);

}

function insertmediachat() {
    document.getElementById("forremoteVideos").style.display = "block";
    document.getElementById("111").style.height = "50%";
    document.getElementById("mediachatcontrols").style.height = "5%";
    document.getElementById("hangupAll").disabled = false;
    document.getElementById("insertmediachat").disabled = true;
    easyrtc.setRoomOccupantListener(RoomOccupantListener);
    for (let easyrtcid of listtocall.keys()) {
        performCall(easyrtcid);
    }
}