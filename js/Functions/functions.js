import $ from 'jquery';
let GLOBAL_COUNT = 0;

function isFloat(n) {
    return Number(n) === n && n % 1 !== 0;
}

function getRand(len) {
    return createKey(len);
}
// Craete random key
function createKey(len) {
    let chars = "adeh9i8jklw6xo4bcmnp5q2rs3tu1fgv7yz0ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        key = "";
    for (let i = 0; i < len; i++) {
        key += chars[Math.floor(Math.random() * ((chars.length - 1) + 1))];
    }
    return key;
}
// is json
function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}    // Get Number
function toNumber(str) {
    if (typeof (str) == "number" || typeof (str) == "float") return str;
    if (str) {
        str = str.replace(/[^\d.]/g, "");
        if (str.length > 0) {
            str = parseFloat(str);
        }
    }
    str = parseFloat(str);
    if (isNaN(str)) {
        return false;
    } else {
        return str;
    }
}
// To boolean
function toBoolean(data) {
    if (typeof data === "boolean") return data;
    if (isJson(data)) {
        data = JSON.parse(data);
    }

    return data ? true : false;
}

// check if image file
function isImageFile(file) {
    let allowedExt = ['jpg', 'png', 'jpeg', 'gif', 'jfif'];
    let ext = file.name.split('.').pop().toLowerCase();
    if (allowedExt.includes(ext)) {
        return true;
    } else {
        return false;
    }
}

function mergePath(...paths) {
    let url = '';
    paths.forEach(path => {
        path = trim(path);
        path = trim(path, '/');
        if (path.length) url += `/${path}`;
    });
    url = trim(url, '/');
    return url;
}

function trim(str, charlist) {
    let whitespace = [' ', '\n', '\r', '\t', '\f', '\x0b', '\xa0', '\u2000', '\u2001', '\u2002', '\u2003', '\u2004', '\u2005', '\u2006', '\u2007', '\u2008', '\u2009', '\u200a', '\u200b', '\u2028', '\u2029', '\u3000'].join('')
    let l = 0
    let i = 0
    str += ''
    if (charlist) {
        whitespace = (charlist + '').replace(/([[\]().?/*{}+$^:])/g, '$1')
    }
    l = str.length
    for (i = 0; i < l; i++) {
        if (whitespace.indexOf(str.charAt(i)) === -1) {
            str = str.substring(i)
            break
        }
    }
    l = str.length
    for (i = l - 1; i >= 0; i--) {
        if (whitespace.indexOf(str.charAt(i)) === -1) {
            str = str.substring(0, i + 1)
            break
        }
    }
    return whitespace.indexOf(str.charAt(0)) === -1 ? str : ''
}

// Download File
function downloadFile(name, url) {
    let a = document.createElement('a');
    a.style.display = 'none';
    a.download = name;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Get File Extension
function getExtension(path) {
    let basename = path.split(/[\\/]/).pop(),
        pos = basename.lastIndexOf(".");
    if (basename === "" || pos < 1)
        return "";
    return basename.slice(pos + 1);
}

// Convert file to base 64
function getBase64(file) {
    return new Promise(async (res, rej) => {
        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function () {
            res(reader.result);
        };
        reader.onerror = function (error) {
            res(false)
        };
    });
}

export {
    isFloat,
    getRand,
    createKey,
    isJson,
    toNumber,
    toBoolean,
    isImageFile,
    mergePath,
    downloadFile,
    getExtension,
    getBase64,
    GLOBAL_COUNT
}

