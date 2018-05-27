//
//Copyright (c) 2016, Skedans Systems, Inc.
//All rights reserved.
//
//Redistribution and use in source and binary forms, with or without
//modification, are permitted provided that the following conditions are met:
//
//    * Redistributions of source code must retain the above copyright notice,
//      this list of conditions and the following disclaimer.
//    * Redistributions in binary form must reproduce the above copyright
//      notice, this list of conditions and the following disclaimer in the
//      documentation and/or other materials provided with the distribution.
//
//THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
//AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
//IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
//ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
//LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
//CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
//SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
//INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
//CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
//ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
//POSSIBILITY OF SUCH DAMAGE.
//
var selfEasyrtcid = "";
var haveSelfVideo = false;
var otherEasyrtcid = null;
var calls = [];
var streamNames = [];

function disable(domId) {
    console.log("about to try disabling " + domId);
    document.getElementById(domId).disabled = "disabled";
}


function enable(domId) {
    console.log("about to try enabling " + domId);
    document.getElementById(domId).disabled = "";
}


function createLabelledButton(buttonLabel) {
    var button = document.createElement("a");
    button.setAttribute("class","waves-effect waves-light btn-small");
    button.appendChild(document.createTextNode(buttonLabel));
    document.getElementById("videoSrcBlk").appendChild(button);
    return button;
}


function addMediaStreamToDiv(divId, stream, streamName, isLocal)
{
    var container = document.createElement("div");
    container.style.marginBottom = "10px";
    var formattedName = streamName.replace("(", "<br>").replace(")", "");
    var labelBlock = document.createElement("div");
    labelBlock.style.width = "640px";
    labelBlock.style.cssFloat = "left";
    labelBlock.innerHTML = "<pre>" + formattedName + "</pre><br>";
    container.appendChild(labelBlock);
    var video = document.createElement("video");
    video.width = 480;
    video.height = 640;
    video.muted = isLocal;
    video.style.verticalAlign = "middle";
    container.appendChild(video);
    document.getElementById(divId).appendChild(container);
    video.autoplay = true;
    easyrtc.setVideoObjectSrc(video, stream);
    return labelBlock;
}


function createLocalVideo(stream, streamName) {
    var labelBlock = addMediaStreamToDiv("localVideos", stream, streamName, true);
    startRecord(stream);
    var closeButton = createLabelledButton("close");
    closeButton.onclick = function() {
        easyrtc.closeLocalStream(streamName);
        endRecord();
        labelBlock.parentNode.parentNode.removeChild(labelBlock.parentNode);
    }
    labelBlock.appendChild(closeButton);
}

function addSrcButton(buttonLabel, videoId) {
    var button = createLabelledButton(buttonLabel);
    button.onclick = function() {
        easyrtc.setVideoSource(videoId);
        easyrtc.initMediaSource(
                function(stream) {
                    createLocalVideo(stream, buttonLabel);
                    if (otherEasyrtcid) {
                        easyrtc.addStreamToCall(otherEasyrtcid, buttonLabel);
                    }
                },
                function(errCode, errText) {
                    easyrtc.showError(errCode, errText);
                }, buttonLabel);
    };
}


function clearConnectList() {
    var otherClientDiv = document.getElementById('otherClients');
    while (otherClientDiv.hasChildNodes()) {
        otherClientDiv.removeChild(otherClientDiv.lastChild);
    }
}


function convertListToButtons(roomName, occupants) {
    clearConnectList();
    var otherClientDiv = document.getElementById('otherClients');
    for (var easyrtcid in occupants) {
        // var button = document.createElement('a');
        // button.setAttribute("class","waves-effect waves-light btn-small");
        // button.onclick = function(easyrtcid) {
        //     return function() {
        //         performCall(easyrtcid);
        //     };
        // }(easyrtcid);
        // var label = document.createTextNode("Call " + easyrtc.idToName(easyrtcid));
        // button.appendChild(label);
        // otherClientDiv.appendChild(button);
        if (calls.indexOf(easyrtcid)==-1){
            performCall(easyrtcid);
            calls.push(easyrtcid);
        }
    }

}


function performCall(targetEasyrtcId) {
    var acceptedCB = function(accepted, easyrtcid) {
        if (!accepted) {
            easyrtc.showError("CALL-REJECTED", "Sorry, your call to " + easyrtc.idToName(easyrtcid) + " was rejected");
            enable('otherClients');
        }
        else {
            otherEasyrtcid = targetEasyrtcId;
        }
    };

    var successCB = function() {
      //  enable('hangupButton');
    };
    var failureCB = function() {
        enable('otherClients');
    };
    var keys = easyrtc.getLocalMediaIds();

    easyrtc.call(targetEasyrtcId,successCB , failureCB, acceptedCB, keys);
  //  enable('hangupButton');
}


easyrtc.setStreamAcceptor(function(easyrtcid, stream, streamName) {
    document.getElementById("progress").style.display="none";
    //streamNames.splice(streamNames.indexOf("remoteBlock" + easyrtcid + streamName), 1);
    var labelBlock = addMediaStreamToDiv("remoteVideos", stream, streamName, false);
    labelBlock.parentNode.id = "remoteBlock" + easyrtcid + streamName;
    streamNames.push("remoteBlock" + easyrtcid + streamName);

});



easyrtc.setOnStreamClosed(function(easyrtcid, stream, streamName) {
   // calls.splice(calls.indexOf(easyrtcid), 1);
    document.getElementById("progress").style.display="block";
    var item = document.getElementById("remoteBlock" + easyrtcid + streamName);
    item.parentNode.removeChild(item);
});


var callerPending = null;

easyrtc.setCallCancelled(function(easyrtcid) {
    if (easyrtcid === callerPending) {
       // document.getElementById('acceptCallBox').style.display = "none";
        callerPending = false;
    }
});

easyrtc.setAcceptChecker(function(easyrtcid, callback) {
    otherEasyrtcid = easyrtcid;
    if (easyrtc.getConnectionCount() > 0) {
        //easyrtc.hangupAll();
    }
    callback(true, easyrtc.getLocalMediaIds());
});
easyrtc.setAcceptChecker(function(easyrtcid, responsefn) {
    function myCallFailureCB(errorCode, errorText) {
    console.log("call failed ", easyrtcid, errorcode, errorText);
    }
    responsefn(true, myOutgoingMediaStreams, myCallFailureCB);
    document.getElementById("connectbutton_" + easyrtcid).style.visibility = "hidden";
    });

function create( name, attributes ) {
    var el = document.createElement( name );
    if ( typeof attributes == 'object' ) {
    for ( var i in attributes ) {
    el.setAttribute( i, attributes[i] );
    
    if ( i.toLowerCase() == 'class' ) {
    el.className = attributes[i]; // for IE compatibility
    
    } else if ( i.toLowerCase() == 'style' ) {
    el.style.cssText = attributes[i]; // for IE compatibility
    }
    }
    }
    for ( var i = 2;i < arguments.length; i++ ) {
    var val = arguments[i];
    if ( typeof val == 'string' ) { val = document.createTextNode( val ) };
    el.appendChild( val );
    }
    return el;
    }

//OLD RECORDING PART
////////////////////////////////
// var selfRecorder = null;
// function startRecording(stream) {
//     var selfLink = document.getElementById("selfDownloadLink");
//     selfLink.innerText = "";

//     selfRecorder = easyrtc.recordToFile(stream, 
//                selfLink, "selfVideo");
// }

// function endRecording() {
//     if( selfRecorder ) {
//        selfRecorder.stop();
//     }
// }

//NEW RECORDING PART
////////////////////////////////
// fetching DOM references
var recorder;
// this function submits recorded blob to nodejs server
function postFiles() {
    var blob = recorder.getBlob();
    // getting unique identifier for the file name
    var fileName = generateRandomString() + '.webm';
    
    var file = new File([blob], fileName, {
        type: 'video/webm'
    });
    xhr("/room/:roomId", file, function(responseText) {
        var fileURL = JSON.parse(responseText).fileURL;

        console.info('fileURL', fileURL);
    });
    if(mediaStream) mediaStream.stop();
}

// XHR2/FormData
function xhr(url, data, callback) {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status == 200) {
            callback(request.responseText);
        }
    };
    request.open('POST', url);

    var formData = new FormData();
    formData.append('file', data);
    request.send(formData);
}

// generating random string
function generateRandomString() {
    if (window.crypto) {
        var a = window.crypto.getRandomValues(new Uint32Array(3)),
            token = '';
        for (var i = 0, l = a.length; i < l; i++) token += a[i].toString(36);
        return token;
    } else {
        return (Math.random() * new Date().getTime()).toString(36).replace( /\./g , '');
    }
}

var mediaStream = null;
// reusable getUserMedia
function captureUserMedia(success_callback) {
    var session = {
        audio: true,
        video: {
            // mediaSource: "screen", // whole screen sharing
                mediaSource: "window", // choose a window to share
            // mediaSource: "application", // choose a window to share
            width: {max: '1920'},
            height: {max: '1080'},
            frameRate: {max: '10'}
            }
    }; 
    navigator.getUserMedia(session, success_callback, function(error) {
        console.error(error);
    });
}

// UI events handling
 function startRecord(stream) {  
        recorder = RecordRTC(stream, {
            type: 'video'
        });     
        recorder.startRecording();
};


function endRecord() {
    recorder.stopRecording(postFiles);
};
