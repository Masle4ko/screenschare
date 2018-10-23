var username = "";
function initApp() {
    // if (typeof InstallTrigger == 'undefined') {
    //     swal({
    //         type: 'error',
    //         title: 'Oops...',
    //         showConfirmButton: false,
    //         allowOutsideClick: false,
    //         html: '<div style="font-family: Arial, Helvetica, sans-serif;">Currently ScreenShare works only in Firefox.<br> Please open this page in Firefox.</div>'
    //     });
    // }

    username = functions.checkCookie("username");
    if (username != "") {
        document.getElementById("userNameField").value = username;
    }
}

function refreshRoomList(easyrtcid) {
    easyrtc.getRoomList(function (roomList) {

        for (var roomName in roomList) {
            if (roomList[roomName].numberClients < 2) {
                functions.setCookie("selfEasyrtcid", roomName);
                windowOpen("http://demo5.kbs.uni-hannover.de/pairsearch/?uid=" + functions.checkCookie("uid") + "&roomid=" + roomName, "search", 0, 0, screen.width / 2, screen.height);
                windowOpen("/room/" + roomName + "", "room", 0, screen.height, screen.width / 2, screen.height);
                    var xhr = new XMLHttpRequest();
                    var json = JSON.stringify({userId:1});
                    xhr.open("POST", 'eventEmit', false);
                    xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
                    xhr.send(json);
                return;
            }
        }

        functions.setCookie("selfEasyrtcid", easyrtcid);
        functions.setCookie("roomCreator", true);
        windowOpen("http://demo5.kbs.uni-hannover.de/pairsearch/?uid=" + functions.checkCookie("uid") + "&roomid=" + easyrtcid, "search", 0, 0, screen.width / 2, screen.height);
        windowOpen("/room/" + easyrtcid + "", "room", 0, screen.height, screen.width / 2, screen.height);

    }, function (errorCode, errorText) {
        console.log(errorCode + errorText);
    });
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
    var uid = getUrlParam("uid");
    if (uid != null) {
        xhr("/lobby/roomLog", JSON.stringify({ external_client_id: uid, room_id: functions.checkCookie("selfEasyrtcid"), name: username }), function (responseText) {
            if (Number.isInteger(Number(JSON.parse(responseText).result))) {
                functions.setCookie("uid", uid);
                functions.setCookie("myId", JSON.parse(responseText).result);
                refreshRoomList(easyrtcid);
            }
        });
    }
    else {
        swal({
            type: 'error',
            title: 'Oops...',
            showConfirmButton: false,
            allowOutsideClick: false,
            html: '<div style="font-family: Arial, Helvetica, sans-serif;">Bad uid.</div>'
        });
    }
}

function loginFailure(errorCode, message) {
    console.log(message);
}


function windowOpen(url, title, top, left, width, height, location = "1", toolbar = "1", menubar = "1", scrollbars = "1", resizable = "0") {
    var newWin = window.open(url, title, "top=" + 0 + ", left=" + left + ", width=" + width + ",height=" + height + ", location=" + location + ", toolbar=" + toolbar + ", menubar=" + menubar + ",scrollbars=" + scrollbars + ",resizable=" + resizable + "");
    if (!newWin || newWin.closed || typeof newWin.closed == 'undefined') {
        swal({
            type: 'error',
            title: 'Oops...',
            showConfirmButton: false,
            allowOutsideClick: false,
            html: '<div style="font-family: Arial, Helvetica, sans-serif;">Your browser blocked pop-up windows.<br>Please disable your pop-up blocker.</div>'
        });
    }
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


function xhr(url, data, callback) {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (request.readyState == 4 && request.status == 200) {
            callback(request.responseText);
        }
    };
    request.open('POST', url);
    request.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    request.send(data);
}