var username="";
var test, test2;
function initApp() {
    username=checkCookie("username");
    if(username !="") {
        document.getElementById("userNameField").value=username;
    }
}

function connect() {
    easyrtc.connect("easyrtc.instantMessaging", loginSuccess, loginFailure);
}

function disconnect() {
    easyrtc.disconnect();
}
function isEmpty(str) {
    return (!str || 0 === str.length);
}
function loginSuccess(easyrtcid) {
    var roomName= document.getElementById("roomNameField").value;
    var z = roomName.length;
    var checkboxForRoom= document.getElementById("roomBox").value;
    username=document.getElementById("userNameField").value;
    if (username !=undefined) {
      setCookie("username", username)
    }
    if (((checkboxForRoom =="on") || (checkboxForRoom =="true"))  &&(roomName && roomName.length > 0)){
      setCookie("selfEasyrtcid", roomName);
      windowOpen("/room/"+roomName+"", "room",0,screen.height,screen.width/2,screen.height);
      windowOpen("http://demo4.kbs.uni-hannover.de/?uid=4", "search",0,0,screen.width/2,screen.height);
    }
    else{
      setCookie("selfEasyrtcid", easyrtcid);
      windowOpen("/room/"+easyrtcid+"", "room",0,screen.height,screen.width/2,screen.height);
      windowOpen("http://demo4.kbs.uni-hannover.de/?uid=4", "search",0,0,screen.width/2,screen.height);
    }
}

function loginFailure(errorCode, message) {
    console.log("2");
    console.log(message);
    easyrtc.showError("LOGIN-FAILURE", message);
    document.getElementById('connectButton').disabled = false;
    jQuery('#rooms').empty();
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

function windowOpen(url,title, top,left,width, height,location="yes",toolbar="yes",menubar="yes", scrollbars="yes" ){
     window.open(url, title, "top="+0+", left="+left+", width="+width+",height="+height+", location="+location+", toolbar="+toolbar+", menubar="+menubar+",scrollbars="+scrollbars+"");
}
