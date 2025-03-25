// js/Editor/plugins/aspect-ratio.js
import { canvas } from "../app.js";

// Get Ratio
function getRatio(width, height) {
  let _gcd = gcd(width, height),
    widthRatio = width / _gcd,
    heightRatio = height / _gcd;

  return {
    width: widthRatio,
    height: heightRatio,
  };
}

// Gcd Value fn
function gcd(a, b) {
  if (b == 0) {
    return a;
  }
  return gcd(b, a % b);
}

// Get Width|height of image
function getMissingValue(dimensions, ratio) {
  let result;
  if (!dimensions.width) {
    result = (dimensions.height / ratio.height) * ratio.width;
  } else {
    result = (dimensions.width / ratio.width) * ratio.height;
  }
  return Math.round(result);
}

// Initialize canvas dimensions
let canvasDimensions = {};

function initCanvasDimensions() {
  canvasDimensions = {
    orgWidth: canvas.getWidth(),
    orgHeight: canvas.getHeight(),
    resizedWidth: canvas.getWidth(),
    resizedHeight: canvas.getHeight(),
    adjustedWidth: canvas.getWidth(),
    adjustedHeight: canvas.getHeight(),
    zoom: canvas.getZoom(),
    defaultZoom: canvas.getZoom(),
  };

  // Notify Alpine components about canvas dimensions
  document.dispatchEvent(
    new CustomEvent("canvas-dimensions-updated", {
      detail: {
        dimensions: { ...canvasDimensions },
      },
    })
  );
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initCanvasDimensions();
});

// Resize Canvas
function resizeCanvas(data) {
  let isZoomResized = data.isZoomResized || false,
    width = parseInt(data.width),
    height = parseInt(data.height),
    ratio = getRatio(width, height),
    newHeight = canvasDimensions.orgHeight,
    newWidth = canvasDimensions.orgWidth;

  if (height > newHeight)
    newWidth = getMissingValue({ height: newHeight }, ratio);

  if (width > newWidth) newHeight = getMissingValue({ width: newWidth }, ratio);

  if (width <= newWidth && height <= newHeight) {
    newWidth = width;
    newHeight = height;
  }
  let decreaseImagePercentage = (newWidth / width) * 100,
    zoomPercentage = (decreaseImagePercentage / 100) * 1;

  console.log(newWidth, newHeight);
  // Set Canvas Dimensions Val
  canvasDimensions.resizedWidth = width;
  canvasDimensions.resizedHeight = height;
  canvasDimensions.adjustedWidth = newWidth;
  canvasDimensions.adjustedHeight = newHeight;
  canvasDimensions.zoom = zoomPercentage;
  if (!isZoomResized) canvasDimensions.defaultZoom = zoomPercentage;

  // Set Properties
  canvas.setZoom(zoomPercentage);
  canvas.setWidth(newWidth);
  canvas.setHeight(newHeight);
  canvas.renderAll();

  // Notify Alpine components about canvas dimensions change
  document.dispatchEvent(
    new CustomEvent("canvas-dimensions-updated", {
      detail: {
        dimensions: { ...canvasDimensions },
      },
    })
  );
}

// Load Image to canvas as window
function loadImageInCavnasAsWindow(
  imgSrc,
  properties = {},
  { createNewId, addLayer, saveHistory, originalItems } = {}
) {
  if (!createNewId || !addLayer || !saveHistory) {
    console.error(
      "Required functions not provided to loadImageInCavnasAsWindow"
    );
    return;
  }

  let img = new Image();
  img.src = imgSrc;
  let objId = createNewId();
  properties = {
    top: 0,
    left: 0,
    id: objId,
    ...properties,
    originalItem: {
      id: objId,
      src: imgSrc,
    },
  };

  img.onload = function () {
    // Load image to canvas
    let fImage = new fabric.Image(img);

    fImage.set(properties);
    canvas.add(fImage);
    resizeCanvas({
      width: img.width,
      height: img.height,
    });

    addLayer({
      item: {
        type: originalItems.type,
        image: imgSrc,
        id: objId,
      },
    });
    saveHistory();

    // Notify Alpine components about the new image
    document.dispatchEvent(
      new CustomEvent("image-loaded-as-window", {
        detail: {
          image: fImage,
        },
      })
    );
  };
}

// Resize canvas when downloading
function startDownloadCanvas() {
  let zoom = canvas.getZoom();
  canvasDimensions.tmpZoom = zoom;
  canvas.setWidth(canvasDimensions.resizedWidth);
  canvas.setHeight(canvasDimensions.resizedHeight);
  canvas.setZoom(1);
  canvas.renderAll();

  // Notify Alpine components about download start
  document.dispatchEvent(new CustomEvent("download-canvas-start"));
}

function finishDownloadCanvas() {
  canvas.setZoom(canvasDimensions.tmpZoom);
  canvas.setWidth(canvasDimensions.adjustedWidth);
  canvas.setHeight(canvasDimensions.adjustedHeight);
  canvas.renderAll();

  // Notify Alpine components about download finish
  document.dispatchEvent(new CustomEvent("download-canvas-finish"));
}

// Create Alpine component for canvas dimensions
document.addEventListener("alpine:init", () => {
  Alpine.data("settingsPanel", () => ({
    isActive: false,
    backgroundColor: "#ffffff",
    customSizeVisible: false,
    customWidth: 1080,
    customHeight: 1920,
    canvasSizes: [
      { name: "TikTok (1080x1920)", value: "1080x1920" },
      { name: "Instagram Post (1080x1080)", value: "1080x1080" },
      { name: "Instagram Story (1080x1920)", value: "1080x1920" },
      { name: "Facebook Post (1200x630)", value: "1200x630" },
      { name: "Twitter Post (1200x675)", value: "1200x675" },
      { name: "YouTube Thumbnail (1280x720)", value: "1280x720" },
      { name: "Custom Size", value: "custom" },
    ],

    init() {
      document.addEventListener("change-tool", (e) => {
        this.isActive = e.detail.type === "settings";
      });

      document.addEventListener("canvas-dimensions-updated", (e) => {
        // Update any dimensions in our panel if needed
      });
    },

    filterSizes() {
      if (!this.search) {
        this.filteredSizes = this.canvasSizes;
        return;
      }

      this.filteredSizes = this.canvasSizes.filter((size) =>
        size.name.toLowerCase().includes(this.search.toLowerCase())
      );
    },

    selectSize(size) {
      this.selected = size.name;
      this.value = size.value;

      if (size.value === "custom") {
        this.customSizeVisible = true;
        return;
      }

      this.customSizeVisible = false;

      // Parse dimensions from value (e.g., "1080x1920")
      const [width, height] = size.value.split("x").map(Number);

      // Apply canvas resize
      resizeCanvas({
        width,
        height,
      });
    },

    applyCustomSize() {
      if (!this.customWidth || !this.customHeight) return;

      resizeCanvas({
        width: this.customWidth,
        height: this.customHeight,
      });
    },

    updateBackgroundColor() {
      canvas.setBackgroundColor(this.backgroundColor, () => {
        canvas.renderAll();
      });
    },
  }));
});

export {
  canvasDimensions,
  resizeCanvas,
  startDownloadCanvas,
  finishDownloadCanvas,
  loadImageInCavnasAsWindow,
};
