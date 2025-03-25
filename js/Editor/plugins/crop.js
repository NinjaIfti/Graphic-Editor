// js/Editor/plugins/crop.js
import { canvas, CANVAS_OBJECT_DYNAMIC_KEYS } from "../app.js";
import { getObjById } from "../functions.js";
import { canvasDimensions, resizeCanvas } from "./aspect-ratio.js";
import { hideAllPositioningLines } from "./canvas-guides.js";
import { startDownloadCanvas, finishDownloadCanvas } from "./aspect-ratio.js";
import { AddItemToEditor } from "../Editor.js";
import { Rect } from "fabric";
import { createNewId } from "../functions.js";
import { layerReload } from "../panels/layers.js";

// toggle object selection
function toggleObjectsSelection(toggle) {
  canvas._objects.forEach((obj) => {
    if (toggle) {
      if ("selectableCache" in obj) obj.selectable = obj.selectableCache;
    } else {
      obj.selectableCache = obj.selectable;
      obj.selectable = false;
    }
  });
  canvas.renderAll();
}

// Selection Rectangle Remove
const selectionRectRemove = () => {
  toggleObjectsSelection(true);
  let rect = canvas._objects.find((obj) => obj.name === "selectionRect");
  if (!rect) return true;

  let obj = getObjById(rect.cropObjId);
  if (obj) {
    if (!obj.clipPath && obj.clipPathOld) {
      obj.dirty = true;
      obj.clipPath = obj.clipPathOld;
    }
  }

  canvas.remove(rect);

  // Notify Alpine components that crop has been removed
  document.dispatchEvent(new CustomEvent("crop-selection-removed"));
};

// Hide all objects
function hideAllObjects(exclude = null) {
  canvas.forEachObject((obj) => {
    if (obj.id === exclude) return true;
    obj.set("visible", false);
  });
  canvas.renderAll();
}

// Show all objects
function showAllObjects(exclude = null) {
  canvas.forEachObject((obj) => {
    if (obj.id === exclude) return true;
    obj.set("visible", true);
  });
  canvas.renderAll();
}

// Start crop process
function startCrop(cropType = "free") {
  let activeObj = canvas.getActiveObject();
  if (!activeObj) return false;
  if (activeObj.originalItem.fileType != "image") return false;

  // Notify Alpine components crop has started
  document.dispatchEvent(
    new CustomEvent("crop-started", {
      detail: { activeObj, cropType },
    })
  );

  let dim = {
    top: 0,
    left: 0,
    width: canvasDimensions.resizedWidth,
    height: canvasDimensions.resizedHeight,
    cropType: "canvas",
    cropObjId: 0,
  };

  selectionRectRemove();

  if (activeObj) {
    if (activeObj.name === "selectionRect" && activeObj.cropObjId)
      activeObj = getObjById(activeObj.cropObjId);

    dim = {
      top: activeObj.top,
      left: activeObj.left,
      width: activeObj.width,
      height: activeObj.height,
      cropType: "object",
      cropObjId: activeObj.id,
      scaleX: activeObj.scaleX,
      scaleY: activeObj.scaleY,
    };

    activeObj.set({
      dirty: true,
      clipPathOld: activeObj.clipPath,
      clipPath: null,
    });
  }

  // Free crop
  if (cropType === "free") {
    if (activeObj) cropShape(activeObj.id);
    return true;
  }

  toggleObjectsSelection(false);

  let selectionRect = new Rect({
    fill: "rgba(0,0,0,0.3)",
    opacity: 1,
    name: "selectionRect",
    hasRotatingPoint: false,
    originalItem: {
      id: createNewId(),
      type: "rect",
      fileType: "rect",
      class: "selectionRect",
    },
    ...dim,
  });

  if (cropType === "circle") {
    selectionRect.rx = dim.width;
    selectionRect.ry = dim.height;
  }

  canvas.add(selectionRect);
  selectionRect.controls.mtr.visible = false;

  canvas.setActiveObject(selectionRect);
  canvas.renderAll();

  // Notify Alpine components crop selection is active
  document.dispatchEvent(
    new CustomEvent("crop-active-change", {
      detail: { active: true },
    })
  );

  return true;
}

// Object to svg
function canvasObjToSVG(activeObj) {
  let width = activeObj.width,
    height = activeObj.height;

  let output = activeObj.toSVG();
  output = output.replace(/(transform=")([^"]*)(")/gm, "");
  output = `<svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
        viewBox="0 0 ${width} ${height}" style="enable-background:new 0 0 ${width} ${height};" xml:space="preserve">
        ${output}
        </svg>`;

  let svgStr = output,
    svg64 = btoa(svgStr);
  let b64Start = "data:image/svg+xml;base64,";

  output = b64Start + svg64;
  return output;
}

// Apply crop
function applyCrop() {
  let selectionRect = canvas._objects.find(
    (obj) => obj.name === "selectionRect"
  );

  if (!selectionRect) return false;

  let cropDimensions = {
    top: selectionRect.top,
    left: selectionRect.left,
    width: selectionRect.getScaledWidth(),
    height: selectionRect.getScaledHeight(),
  };

  // Canvas Crop
  if (selectionRect.cropType === "canvas") {
    let cnCropData = canvas.toJSON(CANVAS_OBJECT_DYNAMIC_KEYS);
    canvas.loadFromJSON(
      cnCropData,
      function () {
        canvas.renderAll();
        hideAllPositioningLines();
        if (cropDimensions) {
          // Resize Canvas
          resizeCanvas({
            width: cropDimensions.width,
            height: cropDimensions.height,
          });
        }
        selectionRectRemove();
      },
      function (obj, object) {
        object.top = object.top - cropDimensions.top;
        object.left = object.left - cropDimensions.left;
        canvas.renderAll();
      }
    );

    // Notify Alpine components crop has been applied
    document.dispatchEvent(
      new CustomEvent("crop-applied", {
        detail: { type: "canvas" },
      })
    );

    return true;
  }

  // Object Crop
  let activeObj = getObjById(selectionRect.cropObjId);
  if (!activeObj) return false;

  let objType = activeObj.originalItem.fileType;
  if (objType === "svg") {
    // Add Clippath to svg
    let left0 = -(selectionRect.width / 2),
      top0 = -(selectionRect.height / 2),
      cropLeftPer =
        ((selectionRect.left - activeObj.left) /
          selectionRect.getScaledWidth()) *
        100,
      cropTopPer =
        ((selectionRect.top - activeObj.top) /
          selectionRect.getScaledHeight()) *
        100,
      left = (cropLeftPer * selectionRect.width) / 100,
      top = (cropTopPer * selectionRect.height) / 100;

    left = left0 + left;
    top = top0 + top;

    // Width and height
    let rectWidthPer =
        (selectionRect.getScaledWidth() / activeObj.getScaledWidth()) * 100,
      rectHeightPer =
        (selectionRect.getScaledHeight() / activeObj.getScaledHeight()) * 100,
      rectWidth = (rectWidthPer * selectionRect.width) / 100,
      rectHeight = (rectHeightPer * selectionRect.height) / 100;

    let rect = {
      originX: "left",
      originY: "top",
      left,
      top,
      width: rectWidth,
      height: rectHeight,
      scaleX: 1,
      scaleY: 1,
    };

    let newRect = fabric.util.object.clone(selectionRect);
    newRect.set(rect);
    activeObj.set("dirty", true);
    activeObj.set("clipPath", newRect);
    selectionRectRemove();

    // Notify Alpine components crop has been applied
    document.dispatchEvent(
      new CustomEvent("crop-applied", {
        detail: { type: "svg" },
      })
    );

    return true;
  }

  // Init new image instance
  var cropped = new Image();

  // Disable all object expect the current one
  hideAllObjects(selectionRect.cropObjId);
  startDownloadCanvas();

  // set src value of canvas cropped area as toDataURL
  cropped.src = canvas.toDataURL(cropDimensions);

  // Show all objects
  finishDownloadCanvas();
  showAllObjects();

  // after onload clear the canvas and add cropped image to the canvas
  cropped.onload = function () {
    let item = activeObj.originalItem;
    item.fileType = "image";
    item.resetSrc = item.src;
    item.src = cropped.src;

    AddItemToEditor(
      item,
      {
        top: cropDimensions.top,
        left: cropDimensions.left,
      },
      {
        centerObject: false,
      }
    );

    canvas.remove(activeObj);
    canvas.requestRenderAll();

    layerReload();

    // Notify Alpine components crop has been applied
    document.dispatchEvent(
      new CustomEvent("crop-applied", {
        detail: { type: "image" },
      })
    );
  };

  selectionRectRemove();
  canvas.renderAll();

  return true;
}

// Reset crop
function resetCrop() {
  let selectionRect = canvas._objects.find(
    (obj) => obj.name === "selectionRect"
  );

  if (!selectionRect) return false;

  let obj = getObjById(selectionRect.cropObjId);
  if (!obj) return false;

  selectionRectRemove();

  let dims = {
      top: obj.top,
      left: obj.left,
      width: obj.getScaledWidth(),
      height: obj.getScaledHeight(),
    },
    item = obj.originalItem;

  item.src = item.resetSrc;
  delete item.resetSrc;

  AddItemToEditor(
    item,
    {
      top: dims.top,
      left: dims.left,
    },
    {
      centerObject: false,
    }
  );

  canvas.remove(obj);
  layerReload();

  // Notify Alpine components crop has been reset
  document.dispatchEvent(new CustomEvent("crop-reset"));

  return true;
}

// Initialize event listeners for crop functionality
function initCropEvents() {
  // Setup event listeners for custom events from Alpine components
  document.addEventListener("start-crop", (e) => {
    startCrop(e.detail?.cropType || "free");
  });

  document.addEventListener("apply-crop", () => {
    applyCrop();
  });

  document.addEventListener("reset-crop", () => {
    resetCrop();
  });
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initCropEvents();
});

// Create Alpine component for crop functionality
document.addEventListener("alpine:init", () => {
  Alpine.data("cropTools", () => ({
    canCrop: false,
    cropActive: false,

    init() {
      // Listen for selection events to enable crop tools
      document.addEventListener("selection-created", (e) => {
        // Only enable crop for image objects
        this.canCrop = e.detail.object?.originalItem?.fileType === "image";
      });

      document.addEventListener("active-object-cleared", () => {
        this.canCrop = false;
        this.cropActive = false;
      });

      document.addEventListener("crop-started", () => {
        this.cropActive = true;
      });

      document.addEventListener("crop-selection-removed", () => {
        this.cropActive = false;
      });

      document.addEventListener("crop-applied", () => {
        this.cropActive = false;
      });

      document.addEventListener("crop-reset", () => {
        this.cropActive = false;
      });
    },

    startCrop() {
      document.dispatchEvent(
        new CustomEvent("start-crop", {
          detail: { cropType: "free" },
        })
      );
    },

    applyCrop() {
      document.dispatchEvent(new CustomEvent("apply-crop"));
    },

    resetCrop() {
      document.dispatchEvent(new CustomEvent("reset-crop"));
    },
  }));
});

export { selectionRectRemove, startCrop, applyCrop, resetCrop };
