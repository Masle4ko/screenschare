
var selfEasyrtcid = "";
var waitingForRoomList = true;
var isConnected = false;
var haveSelfVideo = false;
var otherEasyrtcid = null;
var nickName;
var userId;
var needToCallOtherUsers;
function initApp() {
    // windowOpen("http://demo4.kbs.uni-hannover.de/?uid=4", "search",0,0,screen.width/2,screen.height);
    selfEasyrtcid = functions.checkCookie("selfEasyrtcid");
    connect();
}
function addToConversation(who, msgType, content, targeting) {
    // Escape html special characters, then add linefeeds.
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
        roomName = functions.checkCookie("selfEasyrtcid");
    }
    var roomid = genRoomDivName(roomName);
    if (document.getElementById(roomid)) {
        return;
    }
    function addRoomButton() {
        var roomButtonHolder = document.getElementById('rooms');
        var roomdiv = document.createElement("div");
        //roomdiv.setAttribute("class","waves-effect waves-light btn btn-success");
        roomdiv.id = roomid;
        roomdiv.className = "roomDiv";
        var roomButton = document.createElement("button");
        roomButton.id = "roomButton";
        roomButton.setAttribute("class", "waves-effect waves-light btn btn-success");
        roomButton.onclick = function () {
            sendMessage(null, roomName);
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
        easyrtc.joinRoom(roomName, roomParms,
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
    easyrtc.setRoomOccupantListener(RoomOccupantListener);
    easyrtc.setPeerListener(peerListener);
    easyrtc.setDisconnectListener(function () {
        jQuery('#rooms').empty();
        document.getElementById("main").className = "notconnected";
        console.log("disconnect listener fired");
    });
    updatePresence();
    easyrtc.connect("easyrtc.instantMessaging", loginSuccess, loginFailure);
    easyrtc.getVideoSourceList(function (videoSrcList) {
        for (var i = 0; i < videoSrcList.length - 1; i++) {
            var videoEle = videoSrcList[i];
            // if(videoSrcList[i].label && videoSrcList[i].label.length > 0)
            var videoLabel = videoSrcList[i].label;
            // var videoLabel = (videoSrcList[i].label && videoSrcList[i].label.length > 0) ?
            //     (videoSrcList[i].label) : ("src_" + i);
            addSrcButton(videoLabel, videoSrcList[i].deviceId);
        }
    });
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
    swal({
        title: "Hello!",
        text: "Please wait until the second user connects.",
        icon: "info",
        buttons: false,
        dangerMode: false,
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

function windowOpen(url, title, top, left, width, height, location = "1", toolbar = "1", menubar = "1", scrollbars = "1") {
    window.open(url, title, "top=" + 0 + ", left=" + left + ", width=" + width + ",height=" + height + ", location=" + location + ", toolbar=" + toolbar + ", menubar=" + menubar + ",scrollbars=" + scrollbars + "");
}

