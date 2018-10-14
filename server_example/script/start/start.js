var username = "";
function initApp() {
    username = functions.checkCookie("username");
    if (username != "") {
        document.getElementById("userNameField").value = username;
    }
}

function connect() {
    easyrtc.connect("easyrtc.instantMessaging", loginSuccess, loginFailure);
    disconnect();
}

function disconnect() {
    easyrtc.disconnect();
}
function isEmpty(str) {
    return (!str || 0 === str.length);
}
function loginSuccess(easyrtcid) {
    var roomName = document.getElementById("roomNameField").value;
    var checkboxForRoom = document.getElementById("roomBox").value;
    username = document.getElementById("userNameField").value;
    var uid = getUrlParam("uid");
    if (uid != null) {
        xhr("/lobby/roomLog", JSON.stringify({ external_client_id: uid, room_id: functions.checkCookie("selfEasyrtcid"), name: username }), function (responseText) {
            if (Number.isInteger(Number(JSON.parse(responseText).result))) {
                functions.setCookie("uid", uid);
                functions.setCookie("myId", JSON.parse(responseText).result);
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
    if (username != undefined) {
        functions.setCookie("username", username)

    }
    if (((checkboxForRoom == "on") || (checkboxForRoom == "true")) && (roomName && roomName.length > 0)) {
        functions.setCookie("selfEasyrtcid", roomName);
        functions.setCookie("roomCreator", false);
        windowOpen("http://demo5.kbs.uni-hannover.de/pairsearch/?uid=" + functions.checkCookie("uid") + "", "search", 0, 0, screen.width / 2, screen.height);
        windowOpen("/room/" + roomName + "", "room", 0, screen.height, screen.width / 2, screen.height);
    }
    else {
        functions.setCookie("selfEasyrtcid", easyrtcid);
        functions.setCookie("roomCreator", true);
        windowOpen("http://demo5.kbs.uni-hannover.de/pairsearch/?uid=" + functions.checkCookie("uid") + "", "search", 0, 0, screen.width / 2, screen.height);
        windowOpen("/room/" + easyrtcid + "", "room", 0, screen.height, screen.width / 2, screen.height);
    }
}

function loginFailure(errorCode, message) {
    console.log(message);
    easyrtc.showError("LOGIN-FAILURE", message);
    document.getElementById('connectButton').disabled = false;
    jQuery('#rooms').empty();
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