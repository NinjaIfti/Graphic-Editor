// js/Functions/functions.js
let GLOBAL_COUNT = 0;

/**
 * Checks if a number is a float
 * @param {number} n - Number to check
 * @returns {boolean} - True if float, false otherwise
 */
function isFloat(n) {
  return Number(n) === n && n % 1 !== 0;
}

/**
 * Gets a random string of specified length
 * @param {number} len - Length of random string
 * @returns {string} - Random string
 */
function getRand(len) {
  return createKey(len);
}

/**
 * Creates a random key/string
 * @param {number} len - Length of the key
 * @returns {string} - Random key
 */
function createKey(len) {
  const chars =
    "adeh9i8jklw6xo4bcmnp5q2rs3tu1fgv7yz0ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let key = "";
  for (let i = 0; i < len; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

/**
 * Checks if a string is valid JSON
 * @param {string} str - String to check
 * @returns {boolean} - True if valid JSON, false otherwise
 */
function isJson(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

/**
 * Converts string to number
 * @param {string|number} str - Value to convert
 * @returns {number|boolean} - Number or false if not convertible
 */
function toNumber(str) {
  if (typeof str === "number") return str;
  if (str) {
    str = str.replace(/[^\d.]/g, "");
    if (str.length > 0) {
      str = parseFloat(str);
    }
  }
  str = parseFloat(str);
  return isNaN(str) ? false : str;
}

/**
 * Converts value to boolean
 * @param {*} data - Value to convert
 * @returns {boolean} - Boolean value
 */
function toBoolean(data) {
  if (typeof data === "boolean") return data;
  if (isJson(data)) {
    data = JSON.parse(data);
  }
  return !!data;
}

/**
 * Checks if file is an image
 * @param {File} file - File to check
 * @returns {boolean} - True if image, false otherwise
 */
function isImageFile(file) {
  const allowedExt = ["jpg", "png", "jpeg", "gif", "jfif", "svg"];
  const ext = file.name.split(".").pop().toLowerCase();
  return allowedExt.includes(ext);
}

/**
 * Combines multiple path segments
 * @param {...string} paths - Path segments
 * @returns {string} - Combined path
 */
function mergePath(...paths) {
  let url = "";
  paths.forEach((path) => {
    path = trim(path);
    path = trim(path, "/");
    if (path.length) url += `/${path}`;
  });
  url = trim(url, "/");
  return url;
}

/**
 * Trims characters from beginning and end of string
 * @param {string} str - String to trim
 * @param {string} charlist - Characters to trim (optional)
 * @returns {string} - Trimmed string
 */
function trim(str, charlist) {
  const whitespace = [
    " ",
    "\n",
    "\r",
    "\t",
    "\f",
    "\x0b",
    "\xa0",
    "\u2000",
    "\u2001",
    "\u2002",
    "\u2003",
    "\u2004",
    "\u2005",
    "\u2006",
    "\u2007",
    "\u2008",
    "\u2009",
    "\u200a",
    "\u200b",
    "\u2028",
    "\u2029",
    "\u3000",
  ].join("");

  let l = 0;
  let i = 0;
  str += "";

  let chars = whitespace;
  if (charlist) {
    chars = (charlist + "").replace(/([[\]().?/*{}+$^:])/g, "$1");
  }

  l = str.length;
  for (i = 0; i < l; i++) {
    if (chars.indexOf(str.charAt(i)) === -1) {
      str = str.substring(i);
      break;
    }
  }

  l = str.length;
  for (i = l - 1; i >= 0; i--) {
    if (chars.indexOf(str.charAt(i)) === -1) {
      str = str.substring(0, i + 1);
      break;
    }
  }

  return chars.indexOf(str.charAt(0)) === -1 ? str : "";
}

/**
 * Downloads a file
 * @param {string} name - File name
 * @param {string} url - File URL
 */
function downloadFile(name, url) {
  const a = document.createElement("a");
  a.style.display = "none";
  a.download = name;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Gets file extension from path
 * @param {string} path - File path
 * @returns {string} - File extension
 */
function getExtension(path) {
  const basename = path.split(/[\\/]/).pop();
  const pos = basename.lastIndexOf(".");
  if (basename === "" || pos < 1) return "";
  return basename.slice(pos + 1);
}

/**
 * Converts file to base64
 * @param {File} file - File to convert
 * @returns {Promise<string|boolean>} - Base64 string or false on error
 */
function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(false);
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
  GLOBAL_COUNT,
};
