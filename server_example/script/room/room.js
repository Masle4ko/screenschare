
var selfEasyrtcid = "";
var waitingForRoomList = true;
var isConnected = false;
var haveSelfVideo = false;
var otherEasyrtcid = null;
var easyRTCid = "";
//var numScreens = 0;

function initApp() {
    selfEasyrtcid= checkCookie("selfEasyrtcid");
    connect();
}
function addToConversation(who, msgType, content, targeting) {
    // Escape html special characters, then add linefeeds.
    if( !content) {
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
            "<b>" + who + " sent " + targetingStr + ":</b>&nbsp;" + content + "<br />";
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
        roomName = checkCookie("selfEasyrtcid");
    }
    var roomid = genRoomDivName(roomName);
    if (document.getElementById(roomid)) {
        return;
    }
    function addRoomButton() {
        var roomButtonHolder = document.getElementById('rooms');
        var roomdiv = document.createElement("a");
        roomdiv.setAttribute("class","waves-effect waves-light btn-small");
        roomdiv.id = roomid;
        roomdiv.className = "roomDiv";
        var roomButton = document.createElement("a");
        roomButton.setAttribute("class","waves-effect waves-light btn-small");
        roomButton.onclick = function() {
            sendMessage(null, roomName);
        };
        var roomLabel = (document.createTextNode(roomName));
        roomButton.appendChild(roomLabel);
        roomdiv.appendChild(roomButton);
        roomButtonHolder.appendChild(roomdiv);
        var roomOccupants = document.createElement("a");
        roomOccupants.setAttribute("class","waves-effect waves-light btn-small");
        roomOccupants.id = genRoomOccupantName(roomName);
        roomOccupants.className = "roomOccupants";
        roomdiv.appendChild(roomOccupants);
       // $(roomdiv).append(" -<a href=\"javascript:\leaveRoom('" + roomName + "')\">leave</a>");
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

        easyrtc.joinRoom(roomName, roomParms,
                function() {
                   /* we'll geta room entry event for the room we were actually added to */
                },
                function(errorCode, errorText, roomName) {
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

function roomEntryListener(entered, roomName) {
    if (entered) { // entered a room
        console.log("saw add of room " + roomName);
        addRoom(roomName, null, false);
    }
    else {
        var roomNode = document.getElementById(genRoomDivName(roomName));
        if (roomNode) {
            document.getElementById('#rooms').removeChildNode(roomNode);
        }
    }
    //refreshRoomList();
}

// function refreshRoomList() {
//     if( isConnected) {
//         easyrtc.getRoomList(addQuickJoinButtons, null);
//     }
// }

function peerListener(who, msgType, content, targeting) {
    addToConversation(who, msgType, content, targeting);
}
function randomInteger(min, max) {
    var rand = min - 0.5 + Math.random() * (max - min + 1)
    rand = Math.round(rand);
    return rand;
  }
function connect() {
    easyrtc.setRoomOccupantListener(convertListToButtons);
    easyrtc.setPeerListener(peerListener);
    easyrtc.setRoomEntryListener(roomEntryListener);
    // easyrtc.setUsername("Maslo"); 
    // easyrtc.idtoname=selfEasyrtcid;
    easyrtc.setDisconnectListener(function() {
        jQuery('#rooms').empty();
        document.getElementById("main").className = "notconnected";
        console.log("disconnect listener fired");
    });
    updatePresence();
     easyrtc.connect("easyrtc.instantMessaging", loginSuccess, loginFailure);
        easyrtc.getVideoSourceList(function(videoSrcList) {
        for (var i = 0; i < videoSrcList.length; i++) {
            var videoEle = videoSrcList[i];
           // if(videoSrcList[i].label && videoSrcList[i].label.length > 0)
            //var videoLabel=videoSrcList[i].label
            var videoLabel = (videoSrcList[i].label && videoSrcList[i].label.length > 0) ?
                    (videoSrcList[i].label) : ("src_" + i);
            addSrcButton(videoLabel, videoSrcList[i].deviceId);
        }
    });
    var screenShareButton = createLabelledButton("Desktop capture/share"); 
        screenShareButton.onclick = function() {
            var streamName = "screen"+randomInteger(4, 99);
            //var streamName = easyrtc.idToName(easyrtcid);
            easyrtc.initDesktopStream(
                    function(stream) {
                        createLocalVideo(stream, streamName);
                        if (otherEasyrtcid) {
                            easyrtc.addStreamToCall(otherEasyrtcid, streamName);
                        }
                    },
                    function(errCode, errText) {
                        easyrtc.showError(errCode, errText);
                    },
                    streamName);
        };
};

function startMyscreen(id) {
    var streamName = "screen"+randomInteger(4, 99);
    easyrtc.initDesktopStream(
            function(stream) {
                createLocalVideo(stream, streamName);
                if (id) {
                    easyrtc.addStreamToCall(id, streamName);
                }
            },
            function(errCode, errText) {
                easyrtc.showError(errCode, errText);
            },
            streamName);
};

function disconnect() {
    easyrtc.disconnect();
}

function occupantListener(roomName, occupants, isPrimary) {
    // if (roomName === null) {
    //     return;
    // }
    var roomId = genRoomOccupantName(roomName);
    var roomDiv = document.getElementById(roomId);
    if (!roomDiv) {
        addRoom(roomName, "", false);
        roomDiv = document.getElementById(roomId);
    }
    else {
        jQuery(roomDiv).empty();
    }
    for (var easyrtcid in occupants) {
        var button = document.createElement("button");
        button.onclick = (function(roomname, easyrtcid) {
            return function() {
                sendMessage(easyrtcid, roomName);
            };
        })(roomName, easyrtcid);
        var presenceText = "";
        if (occupants[easyrtcid].presence) {
            presenceText += "(";
            if (occupants[easyrtcid].presence.show) {
                presenceText += "show=" + occupants[easyrtcid].presence.show + " ";
            }
            if (occupants[easyrtcid].presence.status) {
                presenceText += "status=" + occupants[easyrtcid].presence.status;
            }
            presenceText += ")";
        }
        var label = document.createTextNode(easyrtc.idToName(easyrtcid) + presenceText);
        button.appendChild(label);
        roomDiv.appendChild(button);
    }
   // refreshRoomList();
}

function getGroupId() {
        return null;
}

function sendMessage(destTargetId, destRoom) {
    var text = document.getElementById('sendMessageText').value;
    if (text.replace(/\s/g, "").length === 0) { // Don't send just whitespace
        return;
    }
    setCookie('lastMessage',text);
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

    if( text === "empty") {
         easyrtc.sendPeerMessage(dest, "message");
    }
    else {
    easyrtc.sendDataWS(dest, "message", text, function(reply) {
        if (reply.msgType === "error") {
            easyrtc.showError(reply.msgData.errorCode, reply.msgData.errorText);
        }
    });
    }
    addToConversation("Me", "message", text);
    document.getElementById('sendMessageText').value = "";
}


function loginSuccess(easyrtcid) {
  //  document.getElementById("iam").innerHTML =checkCookie("username");
  //  refreshRoomList();
    if (checkCookie("roomCreator")==1)
    {
        setCookie("userID",easyrtcid);
    }
    if (checkCookie("roomCreator")==0)
    {
        setCookie("userID",easyrtcid);
    }
    isConnected = true;
    easyRTCid = easyrtcid;    
    document.getElementById("main").className = "connected";
    addRoom(null, null, true);
    enable('otherClients');
    updatePresence();
    // var atay1= easyrtc.getRoomOccupantsAsArray("zLCJNgKvXTCeC2cz");
    // var atay2= convertListToButtons(selfEasyrtcid, easyrtc.occupants);
    // for (var easyrtcid in easyrtc.getRoomOccupantsAsArray(selfEasyrtcid)) {
    //     performCall(easyrtcid);
    // }
    //setTimeout(startMyscreen(),5000);
    if (checkCookie("roomCreator")==1)
    {
    startMyscreen(easyrtcid);
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

function updatePresence()
{
    easyrtc.updatePresence(currentShowState, currentShowText);
}


function setCookie(cname,cvalue) {
    var d = new Date();
    d.setTime(d.getTime() + (60*60*1000));
    var expires = "expires=" + d.toGMTString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function checkCookie(something) {
     return getCookie(something);  
}

function windowOpen(something){
    var newWin = window.open("http://localhost:8000/room/"+something+"/client", "client", "top=0, left="+screen.height+", width="+screen.width/2+",height="+ screen.height+", location=yes, toolbar=yes, menubar=yes, scrollbars=yes");
}

