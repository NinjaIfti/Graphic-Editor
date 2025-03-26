// js/Editor/plugins/export.js
import { startDownloadCanvas, finishDownloadCanvas } from "./aspect-ratio.js";
import { canvas } from "../app.js";
import Alpine from "alpinejs";

// Export canvas
function exportCanvasFile(type, options = {}) {
  if (!type) return false;
  startDownloadCanvas();

  let downloadLink,
    downloadFile = "downloadFile" in options ? options.downloadFile : true;

  if (type == "svg") {
    let svgStr = canvas.toSVG(),
      svg64 = btoa(svgStr),
      b64Start = "data:image/svg+xml;base64,";
    downloadLink = b64Start + svg64;
  } else if (type == "png") {
    downloadLink = canvas.toDataURL("image/png");
  } else {
    let bgColor = canvas.backgroundColor;
    if (!bgColor) canvas.backgroundColor = "#fff";
    downloadLink = canvas.toDataURL("image/jpeg");
    canvas.backgroundColor = bgColor;
  }

  if (downloadFile) {
    var anchor = document.createElement("a");
    anchor.href = downloadLink;
    anchor.target = "_blank";
    anchor.download = "image." + type;
    anchor.click();
  }

  finishDownloadCanvas();

  // Notify Alpine components download is complete
  document.dispatchEvent(
    new CustomEvent("canvas-exported", {
      detail: { type, downloadLink },
    })
  );

  return downloadLink;
}

// Initialize export functionality
function initExportEvents() {
  // Listen for export events from Alpine components
  document.addEventListener("export-canvas", (e) => {
    exportCanvasFile(e.detail.type, e.detail.options);
  });
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initExportEvents();
});

// Create Alpine component for export functionality
document.addEventListener("alpine:init", () => {
  Alpine.data("exportTools", () => ({
    init() {
      // Any initialization needed for export tools
    },

    downloadCanvas(type) {
      document.dispatchEvent(
        new CustomEvent("export-canvas", {
          detail: {
            type,
            options: { downloadFile: true },
          },
        })
      );
    },
  }));
});

export { exportCanvasFile };
