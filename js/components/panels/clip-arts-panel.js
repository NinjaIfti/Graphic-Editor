export const clipArtsPanelComponent = () => ({
  isActive: false,

  init() {
    // Listen for tool changes
    window.addEventListener("tool-changed", (e) => {
      this.isActive = e.detail.type === "clip_arts";
    });
  },

  // Add a clip art to the canvas
  addClipArt(url) {
    if (!window.canvas) return;

    fabric.Image.fromURL(url, (img) => {
      // Scale the image to a reasonable size
      const maxDimension = 200;
      if (img.width > maxDimension || img.height > maxDimension) {
        const scaleFactor = Math.min(
          maxDimension / img.width,
          maxDimension / img.height
        );
        img.scale(scaleFactor);
      }

      // Position the image in the center of the canvas
      img.set({
        left: window.canvas.width / 2,
        top: window.canvas.height / 2,
        originX: "center",
        originY: "center",
        name: "Clip Art",
      });

      // Add the image to the canvas
      window.canvas.add(img);
      window.canvas.setActiveObject(img);
      window.canvas.renderAll();

      // Dispatch event for other components to know about the new object
      window.dispatchEvent(
        new CustomEvent("object:added", {
          detail: img,
        })
      );
    });
  },
});
