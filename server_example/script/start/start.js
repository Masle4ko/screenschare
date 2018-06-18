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
    if (username != undefined) {
        functions.setCookie("username", username)

    }
    if (((checkboxForRoom == "on") || (checkboxForRoom == "true")) && (roomName && roomName.length > 0)) {
        functions.setCookie("selfEasyrtcid", roomName);
        functions.setCookie("roomCreator", false);
        windowOpen("/room/" + roomName + "", "room", 0, screen.height, screen.width / 2, screen.height);
    }
    else {
        functions.setCookie("selfEasyrtcid", easyrtcid);
        functions.setCookie("roomCreator", true);
        windowOpen("/room/" + easyrtcid + "", "room", 0, screen.height, screen.width / 2, screen.height);
    }
}

function loginFailure(errorCode, message) {
    console.log(message);
    easyrtc.showError("LOGIN-FAILURE", message);
    document.getElementById('connectButton').disabled = false;
    jQuery('#rooms').empty();
}


function windowOpen(url, title, top, left, width, height, location = "1", toolbar = "1", menubar = "1", scrollbars = "1") {
    window.open(url, title, "top=" + 0 + ", left=" + left + ", width=" + width + ",height=" + height + ", location=" + location + ", toolbar=" + toolbar + ", menubar=" + menubar + ",scrollbars=" + scrollbars + "");
}
