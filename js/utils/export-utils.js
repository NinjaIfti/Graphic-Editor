// src/utils/export-utils.js

export function downloadCanvas(format) {
  console.log("Exporting canvas as", format);
  if (!window.canvas) {
    console.error("Canvas not found!");
    return;
  }

  // Validate format
  if (format !== "jpg" && format !== "png") {
    console.error("Invalid format. Must be 'jpg' or 'png'.");
    return;
  }

  // Check if export is already in progress
  if (window.exportInProgress) {
    console.log("Export already in progress, please wait...");
    return;
  }

  window.exportInProgress = true;

  try {
    // Create a download link
    const link = document.createElement("a");

    // Set filename with appropriate extension
    link.download = `steve-editor-design.${format}`;

    // Get current canvas dimensions
    const canvasWidth = window.canvas.getWidth();
    const canvasHeight = window.canvas.getHeight();

    if (format === "jpg") {
      // Save current background color
      const originalBgColor = window.canvas.backgroundColor;

      // For JPG, we need a solid background (white if none exists)
      if (!originalBgColor) {
        window.canvas.backgroundColor = "#ffffff" || "";
        window.canvas.renderAll();
        window.exportInProgress = false;

        // Get the canvas data URL as JPG
        link.href = window.canvas.toDataURL({
          format: "jpeg",
          quality: 0.9,
          width: canvasWidth,
          height: canvasHeight,
        });

        // Trigger the download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Restore original background
        window.canvas.backgroundColor = "#ffffff" || "";
        window.canvas.renderAll();
        window.exportInProgress = false;
      } else {
        // Already has a background, just export
        link.href = window.canvas.toDataURL({
          format: "jpeg",
          quality: 0.9,
          width: canvasWidth,
          height: canvasHeight,
        });

        // Trigger the download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.exportInProgress = false;
      }
    } else {
      // PNG format (with transparency supported)
      link.href = window.canvas.toDataURL({
        format: "png",
        quality: 1,
        width: canvasWidth,
        height: canvasHeight,
      });

      // Trigger the download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.exportInProgress = false;
    }
  } catch (error) {
    console.error(`Error exporting as ${format.toUpperCase()}:`, error);
    window.exportInProgress = false;
  }
}

// Export functions for specific formats
export function downloadPNG() {
  if (!window.canvas || window.exportInProgress) return;
  downloadCanvas("png");
}

export function downloadJPG() {
  if (!window.canvas || window.exportInProgress) return;
  downloadCanvas("jpg");
}
