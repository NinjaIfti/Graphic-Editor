// js/Functions/dom-utils.js

/**
 * Checks if an element has a specific attribute
 * @param {HTMLElement} element - DOM element to check
 * @param {string} attrName - Name of the attribute to check for
 * @returns {boolean} - True if the attribute exists
 */
export function hasAttr(element, attrName) {
  if (!element) return false;
  return element.hasAttribute(attrName);
}

/**
 * Gets a data attribute value from an element
 * @param {HTMLElement} element - DOM element
 * @param {string} dataName - Name of the data attribute (without "data-" prefix)
 * @param {*} defaultValue - Default value to return if attribute doesn't exist
 * @returns {string} - Attribute value or default value
 */
export function dataVal(element, dataName, defaultValue = false) {
  if (!element) return defaultValue;
  const attrName = `data-${dataName}`;
  return element.hasAttribute(attrName)
    ? element.getAttribute(attrName)
    : defaultValue;
}

/**
 * Toggles d-none class on an element
 * @param {HTMLElement} element - DOM element
 * @param {boolean} toggle - True to add class, false to remove
 */
export function dnone(element, toggle = true) {
  if (!element) return;
  if (toggle) {
    element.classList.add("d-none");
  } else {
    element.classList.remove("d-none");
  }
}

/**
 * Gets input type or tag name
 * @param {HTMLElement} element - DOM element
 * @returns {string} - Input type or tag name
 */
export function inputType(element) {
  if (!element) return "";

  const tag = element.tagName.toLowerCase();
  let type = tag;

  if (tag === "input") {
    if (["checkbox", "radio", "file"].includes(element.getAttribute("type"))) {
      type = element.getAttribute("type");
    }
  }

  return type;
}

/**
 * Checks if an input is checked
 * @param {HTMLElement} element - DOM element (input)
 * @returns {boolean} - True if checked
 */
export function isChecked(element) {
  if (!element) return false;
  return element.checked;
}

/**
 * Gets tag name of an element
 * @param {HTMLElement} element - DOM element
 * @returns {string} - Tag name in lowercase
 */
export function tagName(element) {
  if (!element) return "";
  return element.tagName.toLowerCase();
}

/**
 * Checks if an object is a File
 * @param {*} data - Object to check
 * @returns {boolean} - True if it's a File
 */
export function isFile(data) {
  return data && data.lastModified && data.size;
}

// For backward compatibility during migration
export function setupCompat() {
  // Create a jQuery-like function that can be used as a drop-in replacement
  window.$ = function (selector) {
    let elements;

    if (typeof selector === "string") {
      elements = document.querySelectorAll(selector);
    } else if (selector instanceof HTMLElement) {
      elements = [selector];
    } else if (selector instanceof NodeList || Array.isArray(selector)) {
      elements = selector;
    } else {
      elements = [];
    }

    // Add our utility methods to the collection
    const collection = Array.from(elements);

    collection.hasAttr = function (attrName) {
      return this[0] ? hasAttr(this[0], attrName) : false;
    };

    collection.dataVal = function (dataName, defaultValue = false) {
      return this[0] ? dataVal(this[0], dataName, defaultValue) : defaultValue;
    };

    collection.dnone = function (toggle = true) {
      this.forEach((element) => dnone(element, toggle));
      return this;
    };

    collection.inputType = function () {
      return this[0] ? inputType(this[0]) : "";
    };

    collection.isChecked = function () {
      return this[0] ? isChecked(this[0]) : false;
    };

    collection.tagName = function () {
      return this[0] ? tagName(this[0]) : "";
    };

    // Add standard methods to make it more jQuery-like
    collection.length = elements.length;

    collection.get = function (index) {
      return this[index];
    };

    collection.attr = function (name, value) {
      if (value === undefined) {
        return this[0] ? this[0].getAttribute(name) : null;
      }
      this.forEach((element) => element.setAttribute(name, value));
      return this;
    };

    collection.addClass = function (className) {
      this.forEach((element) => element.classList.add(className));
      return this;
    };

    collection.removeClass = function (className) {
      this.forEach((element) => element.classList.remove(className));
      return this;
    };

    collection.is = function (selector) {
      if (selector === ":checked") {
        return this[0] ? this[0].checked : false;
      }
      return this[0] ? this[0].matches(selector) : false;
    };

    return collection;
  };

  // Maintain jQuery.fn for backward compatibility
  window.$.fn = {
    hasAttr: function (attrName) {
      return this.length > 0 ? hasAttr(this[0], attrName) : false;
    },
    dataVal: function (dataName, defaultValue = false) {
      return this.length > 0
        ? dataVal(this[0], dataName, defaultValue)
        : defaultValue;
    },
    dnone: function (toggle = true) {
      if (this.length > 0) {
        dnone(this[0], toggle);
      }
      return this;
    },
    inputType: function () {
      return this.length > 0 ? inputType(this[0]) : "";
    },
    isChecked: function () {
      return this.length > 0 ? isChecked(this[0]) : false;
    },
    tagName: function () {
      return this.length > 0 ? tagName(this[0]) : "";
    },
  };

  // Add the isFile utility globally
  window.isFile = isFile;
}
