var username = "";
function initApp() {
    username = functions.checkCookie("username");
    if (username != "") {
        document.getElementById("userNameField").value = username;
    }
}

function refreshRoomList(easyrtcid) {
    easyrtc.getRoomList(function (roomList) {
        var iscon = false;
        for (var roomName in roomList) {
            if (roomList[roomName].numberClients < 2) {
                functions.setCookie("selfEasyrtcid", roomName);
                windowOpen("http://demo4.kbs.uni-hannover.de/?uid=" + functions.checkCookie("uid") + "", "search", 0, 0, screen.width / 2, screen.height);
                windowOpen("/room/" + roomName + "", "room", 0, screen.height, screen.width / 2, screen.height);
                iscon = true;
            }
        }
        if (!iscon) {
            functions.setCookie("selfEasyrtcid", easyrtcid);
            functions.setCookie("roomCreator", true);
            windowOpen("http://demo4.kbs.uni-hannover.de/?uid=" + functions.checkCookie("uid") + "", "search", 0, 0, screen.width / 2, screen.height);
            windowOpen("/room/" + easyrtcid + "", "room", 0, screen.height, screen.width / 2, screen.height);
        }
    }, null);
}

function connect() {
    easyrtc.setRoomOccupantListener();
    easyrtc.setRoomEntryListener();
    easyrtc.connect("easyrtc.instantMessaging", loginSuccess, loginFailure);
}

function loginSuccess(easyrtcid) {
    username = document.getElementById("userNameField").value;
    if (username != undefined) {
        functions.setCookie("username", username)

    }
    refreshRoomList(easyrtcid);
    var uid = getUrlParam("uid");
    functions.setCookie("uid", uid);
    $.post("/lobby/roomLog", { external_client_id: uid, room_id: functions.checkCookie("selfEasyrtcid"), name: username });
    $.post("/event", { external_client_id: uid, action_id: 1 });
}

function loginFailure(errorCode, message) {
    console.log(message);
}


function windowOpen(url, title, top, left, width, height, location = "1", toolbar = "1", menubar = "1", scrollbars = "1") {
    window.open(url, title, "top=" + 0 + ", left=" + left + ", width=" + width + ",height=" + height + ", location=" + location + ", toolbar=" + toolbar + ", menubar=" + menubar + ",scrollbars=" + scrollbars + "");
}

function getUrlParam(id) {
    var params = window
        .location
        .search
        .replace('?', '')
        .split('&')
        .reduce(
            function (p, e) {
                var a = e.split('=');
                p[decodeURIComponent(a[0])] = decodeURIComponent(a[1]);
                return p;
            },
            {}
        );
    return (params[id]);
}