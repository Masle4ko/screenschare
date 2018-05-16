var username="";
function initApp() {
    username=checkCookie("username");
    if(username !="") {
        document.getElementById("userNameField").value=username;
    }
}

function connect() {
    windowOpen("http://demo4.kbs.uni-hannover.de/?uid=4", "search",0,0,screen.width/2,screen.height);
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
    var roomName= document.getElementById("roomNameField").value;
    var checkboxForRoom= document.getElementById("roomBox").value;
    username=document.getElementById("userNameField").value;
    if (username !=undefined) {
      setCookie("username", username)
    }
    if (((checkboxForRoom =="on") || (checkboxForRoom =="true"))  &&(roomName && roomName.length > 0)){
      setCookie("selfEasyrtcid", roomName);
      setCookie("roomCreator", 0);
      windowOpen("/room/"+roomName+"", "room",0,screen.height,screen.width/2,screen.height);
      windowOpen("http://demo4.kbs.uni-hannover.de/?uid=4", "search",0,0,screen.width/2,screen.height);
    }
    else{
      setCookie("selfEasyrtcid", easyrtcid);
      setCookie("roomCreator", 1);
      windowOpen("/room/"+easyrtcid+"", "room",0,screen.height,screen.width/2,screen.height);
      windowOpen("http://demo4.kbs.uni-hannover.de/?uid=4", "search",0,0,screen.width/2,screen.height);
    }
}

function loginFailure(errorCode, message) {
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

function windowOpen(url,title, top,left,width, height,location="1",toolbar="1",menubar="1", scrollbars="1" ){
     window.open(url, title, "top="+0+", left="+left+", width="+width+",height="+height+", location="+location+", toolbar="+toolbar+", menubar="+menubar+",scrollbars="+scrollbars+"");
}
