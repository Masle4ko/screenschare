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
var otherEasyrtcid = null;
var needCall = true;
var streamNumbers = 0;
var setIntervalValue = true;
var topStream;
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

function addMediaStreamToDiv(divId, stream, streamName, isLocal) {
    var container = document.createElement("div");
    container.setAttribute("class", "carousel-item gray white-text");
    container.style.display = "block";
    var formattedName = streamName.replace("(", "<br>").replace(")", "");
    var labelBlock = document.createElement("div");
    labelBlock.style.width = "100px";
    labelBlock.innerHTML = formattedName;
    container.appendChild(labelBlock);
    var video = document.createElement("video");
    video.setAttribute("class", "responsive-video");
    video.type = "video/webm";
    video.controls = true;
    video.style.width = screen.width - 100;
    video.style.height = (screen.height / 2) - 100;
    video.muted = isLocal;
    video.style.marginBottom = "10px";
    video.style.verticalAlign = "middle";
    container.appendChild(video);
    document.getElementById(divId).appendChild(container);
    initializeCarousel(divId);
    if (divId == "remoteVideos") {
        labelBlock.style.width = "0px";
        document.getElementById("remoteVideos").style.height = video.style.height + 25;
        document.getElementById("remoteVideos").style.width = video.style.width + 25;
        if (++streamNumbers > 1) {
            document.getElementById("remoteVideosControlButtons").style.display = "block";
        }
    }
    video.autoplay = true;
    easyrtc.setVideoObjectSrc(video, stream);
    return labelBlock;
}

function createLocalVideo(stream, streamName) {
    var labelBlock = addMediaStreamToDiv("localVideos", stream, streamName, true);
    document.getElementById("localVideos").style.height = "500px";
    startRecord(stream, streamName);
    var closeButton = createLabelledButton("close");
    closeButton.onclick = function () {
        easyrtc.closeLocalStream(streamName);
        clearInterval(recordInterval);
        localRecorder.stopRecording(postFiles);
        initializeCarousel("localVideos");
        labelBlock.parentNode.parentNode.removeChild(labelBlock.parentNode);
        if (document.getElementById("localVideos").childElementCount == 0)
            document.getElementById("localVideos").style.height = "0px";
    }
    var recordInterval =  setInterval(function () {
        localRecorder.stopRecording(postFiles);
        localRecorder.startRecording();
    }, 10000);
    labelBlock.appendChild(closeButton);
}
function addSrcButton(buttonLabel, videoId) {
    var button = createLabelledButton(buttonLabel);
    button.onclick = function () {
        easyrtc.setVideoSource(videoId);
        easyrtc.initMediaSource(
            function (stream) {
                createLocalVideo(stream, buttonLabel);
                if (otherEasyrtcid) {
                    easyrtc.addStreamToCall(otherEasyrtcid, buttonLabel);
                }
            },
            function (errCode, errText) {
                easyrtc.showError(errCode, errText);
            }, buttonLabel);
    };
}

function RoomOccupantListener(roomName, occupants) {
    easyrtc.setAutoInitUserMedia(false);
    for (var easyrtcid in occupants) {
        easyrtc.sendDataWS(easyrtcid, 'otherusername', { username: functions.checkCookie("username") }, function (ackMesg) {
            if (ackMesg.msgType === 'error') {
                console.log(ackMesg.msgData.errorText);
            }
        });
        performCall(easyrtcid);
        if (needCall) {
            if (functions.checkCookie("roomCreator") == "true") {
                playSound();
                setTimeout(() => {
                    startMyscreen();
                }, 500);
            }
            else {
                setTimeout(() => {
                    startMyscreen();
                }, 500);

            }
            needCall = false;
        }
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


easyrtc.setStreamAcceptor(function (easyrtcid, stream, streamName) {
    if (document.getElementById("remoteBlock" + easyrtcid + streamName) == null && streamName != "default") {
        document.getElementById("progress").style.display = "none";
        document.getElementById("remoteVideos").style.height = "" + ((screen.height / 2) - 75) + "px";
        var labelBlock = addMediaStreamToDiv("remoteVideos", stream, streamName, false);
        labelBlock.parentNode.id = "remoteBlock" + easyrtcid + streamName;
    }
});

easyrtc.setOnStreamClosed(function (easyrtcid, stream, streamName) {
    var item;
    while (document.getElementById("remoteBlock" + easyrtcid + streamName) != null) {
        item = document.getElementById("remoteBlock" + easyrtcid + streamName);
        item.parentNode.removeChild(item);
        if (--streamNumbers < 2) {
            document.getElementById("remoteVideosControlButtons").style.display = "none";
        }

    }
    if (document.getElementById("remoteVideos").childElementCount == 1) {
        document.getElementById("progress").style.display = "block";
        document.getElementById("remoteVideos").style.height = "0px";
    }
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

function initializeCarousel(divId) {
    var slider = $('#' + divId + '');
    slider.carousel({
        full_width: true,
        indicators: false
    });
    if (slider.hasClass('initialized')) {
        slider.removeClass('initialized')
    }
    slider.carousel({
        full_width: true,
        indicators: false
    });
}

function playSound() {
    var snd = '<audio autoplay=true> <source src="/materals/ping.mp3"</audio>';
    $('body').append(snd);
}

function startMyscreen() {
    var streamName = "screen" + randomInteger(4, 99);
    swal({
        title: 'You have successfully been connected to user username='+functions.getCookie("otherusername")+'',
        text: 'Please select the window "WebSearch - Mozilla Firefox" from the drop down menu and allow to share it.',
        imageUrl: '/materals/arrow.gif',
        imageWidth: 130,
        imageHeight: 125,
        imageAlt: 'Custom image',
        animation: false
    })
    easyrtc.initDesktopStream(
        function (stream) {
            createLocalVideo(stream, streamName);
            swal.close();
            if (otherEasyrtcid) {
                easyrtc.addStreamToCall(otherEasyrtcid, streamName);
            }
        },
        function (errCode, errText) {
            easyrtc.showError(errCode, errText);
        },
        streamName);
};

//RECORDING PART FOR MULTI SCREENS
////////////////////////////////
// fetching DOM references
var recorder = new Map();
var localRecorder;
// this function submits recorded blob to nodejs server
function postFiles() {
    var blob = localRecorder.getBlob();
    var fileName = "uid=" + functions.checkCookie("uid") + "--time=" + new Date().toLocaleString().split(":").join(".") + '.webm';
    var file = new File([blob], fileName, {
        type: 'video/webm',
        name: fileName
    });
    xhr("/room/:roomId/saveRecord", file, function (responseText) {
        var fileName = JSON.parse(responseText).fileName;

        console.info('fileName', fileName);
    });
    //if (mediaStream) mediaStream.stop();
}

// XHR2/FormData
function xhr(url, data, callback) {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (request.readyState == 4 && request.status == 200) {
            callback(request.responseText);
        }
    };
    request.open('POST', url);

    var formData = new FormData();
    formData.append('file', data);
    request.send(formData);
}

// // generating random string
// function generateRandomString() {
//     if (window.crypto) {
//         var a = window.crypto.getRandomValues(new Uint32Array(3)),
//             token = '';
//         for (var i = 0, l = a.length; i < l; i++) token += a[i].toString(36);
//         return token;
//     } else {
//         return (Math.random() * new Date().getTime()).toString(36).replace(/\./g, '');
//     }
// }

// var mediaStream = null;
// // reusable getUserMedia
// function captureUserMedia(success_callback) {
//     var session = {
//         audio: true,
//         video: {
//             mediaSource: "window",
//             width: { max: '1920' },
//             height: { max: '1080' },
//             frameRate: { max: '10' }
//         }
//     };
//     navigator.getUserMedia(session, success_callback, function (error) {
//         console.error(error);
//     });
// }

// UI events handling
function startRecord(stream, streamName) {
    localRecorder = RecordRTC(stream, {
        type: 'video'
    });
    localRecorder.startRecording();
    recorder.set(streamName, localRecorder);
};


function endRecord() {
    //localRecorder = recorder.get(streamName);
    setTimeout(() => {
        localRecorder.stopRecording(postFiles);
        //recorder.set(streamName, localRecorder);
    }, 1000);
};

