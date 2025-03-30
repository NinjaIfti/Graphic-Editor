export const exportFunctionsComponent = () => ({
  exportInProgress: false,

  // Download canvas as PNG
  downloadPNG() {
    if (!window.canvas || this.exportInProgress) return;

    this.exportInProgress = true;

    try {
      // Create a download link
      const link = document.createElement("a");
      link.download = "steve-editor-design.png";

      // Get the canvas data URL
      link.href = window.canvas.toDataURL({
        format: "png",
        quality: 1,
      });

      // Trigger the download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting as PNG:", error);
    } finally {
      this.exportInProgress = false;
    }
  },

  // Download canvas as JPG
  downloadJPG() {
    if (!window.canvas || this.exportInProgress) return;

    this.exportInProgress = true;

    try {
      // Save current background color
      const originalBgColor = window.canvas.backgroundColor;

      // For JPG, we need a solid background (white)
      if (!originalBgColor) {
        window.canvas.setBackgroundColor("#ffffff", () => {
          window.canvas.renderAll();

          // Export with white background
          this.triggerJPGDownload();

          // Restore original background
          window.canvas.setBackgroundColor(originalBgColor || "", () => {
            window.canvas.renderAll();
          });
        });
      } else {
        // Already has a background, just export
        this.triggerJPGDownload();
      }
    } catch (error) {
      console.error("Error exporting as JPG:", error);
      this.exportInProgress = false;
    }
  },

  // Helper function to trigger the actual JPG download
  triggerJPGDownload() {
    // Create a download link
    const link = document.createElement("a");
    link.download = "steve-editor-design.jpg";

    // Get the canvas data URL as JPG
    link.href = window.canvas.toDataURL({
      format: "jpeg",
      quality: 0.9,
    });

    // Trigger the download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.exportInProgress = false;
  },
});
