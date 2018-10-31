var functions = {
    setCookie: function (cname, cvalue) {
        var d = new Date();
        d.setTime(d.getTime() + (60 * 60 * 1000 * 1000));
        var expires = "expires=" + d.toGMTString();
        document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    },

    getCookie: function (cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    },

    checkCookie: function (something) {
        return functions.getCookie(something);
    },
    getUrlParam: function (id) {
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
    },
    windowOpen: function (url, title, top, left, width, height, location = "1", toolbar = "1", menubar = "1", scrollbars = "1", resizable = "0") {
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
    },
    xhr: function (url, data,  callback = null) {
        var request = new XMLHttpRequest();
        if (callback !=null) {
            request.onreadystatechange = function () {
                if (request.readyState == 4 && request.status == 200) {
                    callback(request.responseText);
                }
            };
        }
        request.open('POST', url);
        request.setRequestHeader('Content-type', 'application/json; charset=utf-8');
        request.send(data);
    }
}


