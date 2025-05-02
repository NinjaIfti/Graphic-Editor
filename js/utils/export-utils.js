// src/utils/export-utils.js
export function downloadPNG() {
  if (!window.canvas) return;

  // Store current dimensions
  const currentWidth = window.canvas.width;
  const currentHeight = window.canvas.height;
  const currentCSSWidth = window.canvas.lowerCanvasEl.style.width;
  const currentCSSHeight = window.canvas.lowerCanvasEl.style.height;

  // Get export dimensions from fabricComponent
  const exportWidth = window.fabricComponent?.exportWidth || currentWidth;
  const exportHeight = window.fabricComponent?.exportHeight || currentHeight;

  console.log(`Exporting PNG at ${exportWidth}x${exportHeight}`);

  // Set canvas to export dimensions
  window.canvas.setDimensions({
    width: exportWidth,
    height: exportHeight
  });

  // Also set CSS dimensions to match export size for proper rendering
  window.canvas.setDimensions({
    width: exportWidth,
    height: exportHeight
  }, { cssOnly: true });

  // Render at export size
  window.canvas.requestRenderAll();

  // Generate the data URL at the export dimensions
  const dataURL = window.canvas.toDataURL({
    format: "png",
    quality: 1,
  });

  // Create and trigger download
  const link = document.createElement("a");
  link.download = "canvas-export.png";
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Restore original canvas dimensions
  window.canvas.setDimensions({
    width: currentWidth,
    height: currentHeight
  });

  // Restore responsive CSS dimensions
  window.canvas.setDimensions({
    width: currentCSSWidth,
    height: currentCSSHeight
  }, { cssOnly: true });

  window.canvas.requestRenderAll();
  console.log("Canvas restored to responsive display");
}

export function downloadJPG() {
  if (!window.canvas) return;

  // Store current dimensions
  const currentWidth = window.canvas.width;
  const currentHeight = window.canvas.height;
  const currentCSSWidth = window.canvas.lowerCanvasEl.style.width;
  const currentCSSHeight = window.canvas.lowerCanvasEl.style.height;

  // Get export dimensions from fabricComponent
  const exportWidth = window.fabricComponent?.exportWidth || currentWidth;
  const exportHeight = window.fabricComponent?.exportHeight || currentHeight;

  console.log(`Exporting JPG at ${exportWidth}x${exportHeight}`);

  // Set canvas to export dimensions
  window.canvas.setDimensions({
    width: exportWidth,
    height: exportHeight
  });

  // Also set CSS dimensions to match export size for proper rendering
  window.canvas.setDimensions({
    width: exportWidth,
    height: exportHeight
  }, { cssOnly: true });

  // Render at export size
  window.canvas.requestRenderAll();

  // Generate the data URL at the export dimensions
  const dataURL = window.canvas.toDataURL({
    format: "jpeg",
    quality: 0.8,
  });

  // Create and trigger download
  const link = document.createElement("a");
  link.download = "canvas-export.jpg";
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Restore original canvas dimensions
  window.canvas.setDimensions({
    width: currentWidth,
    height: currentHeight
  });

  // Restore responsive CSS dimensions
  window.canvas.setDimensions({
    width: currentCSSWidth,
    height: currentCSSHeight
  }, { cssOnly: true });

  window.canvas.requestRenderAll();
  console.log("Canvas restored to responsive display");
}