// js/Editor/Editor.js
import { FabricImage, loadSVGFromURL, Textbox, version, Group } from "fabric";
console.log("Fabric js Version : ", version);
import * as fabric from "fabric";
import "../Functions/prototype.fn.js";
import {} from "../Functions/functions.js";
import {} from "../Functions/el-functions.js";

// Import other plugins as needed
import "./prototype.js";
import "./plugins/aspect-ratio.js";
import "./plugins/active-obj.js";
import "./plugins/filters.js";
import "./plugins/export.js";
import "./plugins/curve-text.js";
import "./plugins/test.js";
import { selectionRectRemove } from "./plugins/crop.js";
import { RotationState } from "./plugins/rotation-angle.js";
import { alignmentObject } from "./plugins/alignment.js";
import { hideAllPositioningLines } from "./plugins/canvas-guides.js";

import { createNewId, getObjById } from "./functions.js";
import { QUICK_OPTIONS } from "./quick-options.js";

// Panels imports
import "./panels/uploads.js";
import "./panels/text.js";
import "./panels/drawing.js";
import "./panels/settings.js";
import { addLayer } from "./panels/layers.js";
import "./panels/index.js";

// Initialize fabric canvas
let canvas;
let plugins = {};

// Initialize the editor when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  canvas = new fabric.Canvas("image-editor", {
    preserveObjectStacking: true,
    // Add other canvas options as needed
  });

  // Setup canvas events
  setupCanvasEvents();
});

function setupCanvasEvents() {
  // Mouse Up Event
  canvas.on("mouse:up", function () {
    let obj = canvas.getActiveObject();
    if (plugins.RotationAngle) RotationState.isRotating = false;
    if (plugins.CanvasGuides) hideAllPositioningLines();

    // Crop Plugin
    if (plugins.Crop) {
      if (!obj) {
        selectionRectRemove();
        // Using Alpine instead of jQuery to show/hide elements
        // We'll dispatch custom events that Alpine components can listen for
        document.dispatchEvent(
          new CustomEvent("crop-selection-removed", {
            detail: { active: false },
          })
        );
      }
    }

    if (!obj) {
      // Dispatch events for quick option buttons
      document.dispatchEvent(
        new CustomEvent("update-quick-options", {
          detail: {
            hasSelection: false,
            canCrop: false,
          },
        })
      );
    }
  });
}

// Add Item To Editor
async function AddItemToEditor(item, properties = {}, options = {}) {
  let shape = 0,
    { src, type, fileType } = item,
    id = createNewId();

  if (!fileType) fileType = type;

  // Item class
  if (!item.class) {
    let itemClasses = {
        svg: "shape",
      },
      itemClass = fileType in itemClasses ? itemClasses[fileType] : fileType;
    item.class = itemClass;
  }

  properties.id = id;
  properties.name = item.type;
  item.id = id;
  item.fileType = fileType;
  properties.options = options;
  properties.originalItem = item;
  properties.centeredScaling = true; // Center Scaling

  // Load SVG
  if (fileType == "svg") {
    properties = {
      ...properties,
    };

    let { objects, options } = await loadSVGFromURL(src);

    let obj = new Group(objects, options);
    if (item.type === "mask") {
      // add mask on active object
      let activeObj = canvas.getActiveObject();
      if (!activeObj) return false;
      let svgObj = obj,
        { width, height } = activeObj;
      svgObj.set({
        left: -(width / 2),
        top: -(height / 2),
      });
      let scale = width / svgObj.width;
      svgObj.scaleX = scale;
      scale = height / svgObj.height;
      svgObj.scaleY = scale;
      svgObj.fill = "transparent";

      activeObj.dirty = true;
      console.log(svgObj);
      activeObj.clipPath = svgObj;
      canvas.renderAll();
      return true;
    }
  } else if (fileType == "text") {
    properties = {
      fontFamily: "sans-serif",
      fill: "#262626",
      erasable: false,
      editable: true,
      textAlign: "center",
      width: 400,
      ...properties,
    };
    shape = new Textbox(src, properties);
    canvas.add(shape);
    addItemToEditorCallback(id);
  } else if (fileType == "image") {
    let img = await FabricImage.fromURL(src);
    img.set(properties);
    // Add item to Editor
    canvas.add(img);
    addItemToEditorCallback(id);
  }
}

// add layers, etc of editor object
function addItemToEditorCallback(objId) {
  let obj = getObjById(objId);
  if (!obj) return false;
  let options = obj.options || {},
    centerObject = "centerObject" in options ? options.centerObject : true,
    selected = "selected" in options ? options.selected : true;

  // Before Render Callback
  if (options.beforeRender) options.beforeRender(obj);

  // center object
  if (centerObject) {
    alignmentObject("centerH", obj);
    alignmentObject("centerV", obj);
  }

  // Make obj active
  if (selected) obj.erasable = false;

  // Check if is background
  if (obj.name === "background-image") {
    obj.moveTo(0);
    canvas.discardActiveObject();
  } else {
    canvas.setActiveObject(obj);
    addLayer(obj.id);
  }

  // Render canvas
  canvas.renderAll();
  canvas.requestRenderAll();

  // Notify Alpine components about the new object
  document.dispatchEvent(
    new CustomEvent("object-added", {
      detail: { object: obj },
    })
  );
}

// Export for use in other modules
export { canvas, plugins, addItemToEditorCallback, AddItemToEditor };
