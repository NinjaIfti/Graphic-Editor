export const canvasUtilitiesComponent = () => ({
  // Center all objects on canvas
  centerAll() {
    if (!window.canvas) return;

    const objects = window.canvas.getObjects();
    if (objects.length === 0) return;

    // Create a selection of all objects
    const selection = new fabric.ActiveSelection(objects, {
      canvas: window.canvas,
    });

    // Center the selection
    window.canvas.centerObject(selection);

    // Discard the selection
    window.canvas.discardActiveObject();
    window.canvas.renderAll();
  },

  // Fit content to canvas bounds
  fitToCanvas() {
    if (!window.canvas) return;

    const objects = window.canvas.getObjects();
    if (objects.length === 0) return;

    // Create a selection of all objects
    const selection = new fabric.ActiveSelection(objects, {
      canvas: window.canvas,
    });

    // Get canvas dimensions with some padding
    const padding = 20;
    const canvasWidth = window.canvas.width - padding * 2;
    const canvasHeight = window.canvas.height - padding * 2;

    // Calculate scaling needed to fit
    const selectionWidth = selection.width * selection.scaleX;
    const selectionHeight = selection.height * selection.scaleY;

    if (selectionWidth > canvasWidth || selectionHeight > canvasHeight) {
      const scaleX = canvasWidth / selectionWidth;
      const scaleY = canvasHeight / selectionHeight;
      const scale = Math.min(scaleX, scaleY);

      // Apply scaling to all objects
      objects.forEach((obj) => {
        obj.scaleX *= scale;
        obj.scaleY *= scale;
        obj.left *= scale;
        obj.top *= scale;
      });
    }

    // Center everything
    this.centerAll();

    // Discard the selection
    window.canvas.discardActiveObject();
    window.canvas.renderAll();
  },

  // Clear the canvas completely
  clearCanvas() {
    if (!window.canvas) return;

    if (
      confirm(
        "Are you sure you want to clear the canvas? This action cannot be undone."
      )
    ) {
      window.canvas.clear();
      window.canvas.setBackgroundColor("#ffffff", () => {
        window.canvas.renderAll();
      });
    }
  },
});
