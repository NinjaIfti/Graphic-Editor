export const quickOptionsBarComponent = () => ({
  hasSelection: false,
  canCrop: false,
  cropActive: false,
  cropInstance: null,

  init() {
    // Listen for canvas initialization
    window.addEventListener("canvas:initialized", () => {
      // Listen for selection changes
      window.canvas.on("selection:created", this.handleSelection.bind(this));
      window.canvas.on("selection:updated", this.handleSelection.bind(this));
      window.canvas.on(
        "selection:cleared",
        this.handleSelectionCleared.bind(this)
      );
    });
  },

  // Handle selection on canvas
  handleSelection(e) {
    const activeObject = e.selected
      ? e.selected[0]
      : window.canvas.getActiveObject();
    this.hasSelection = !!activeObject;

    // Check if the selected object is an image (can be cropped)
    this.canCrop = activeObject && activeObject.type === "image";
  },

  // Handle selection cleared
  handleSelectionCleared() {
    this.hasSelection = false;
    this.canCrop = false;
  },

  // Align selected objects
  alignObjects(alignType) {
    if (!window.canvas || !this.hasSelection) return;

    const activeObject = window.canvas.getActiveObject();
    if (!activeObject) return;

    // Get canvas dimensions
    const canvasWidth = window.canvas.width;
    const canvasHeight = window.canvas.height;

    // Calculate new position based on alignment type
    let newLeft, newTop;

    switch (alignType) {
      case "left":
        newLeft = activeObject.getScaledWidth() / 2;
        activeObject.set({ left: newLeft, originX: "center" });
        break;
      case "centerH":
        window.canvas.centerObjectH(activeObject);
        break;
      case "right":
        newLeft = canvasWidth - activeObject.getScaledWidth() / 2;
        activeObject.set({ left: newLeft, originX: "center" });
        break;
      case "top":
        newTop = activeObject.getScaledHeight() / 2;
        activeObject.set({ top: newTop, originY: "center" });
        break;
      case "centerV":
        window.canvas.centerObjectV(activeObject);
        break;
      case "bottom":
        newTop = canvasHeight - activeObject.getScaledHeight() / 2;
        activeObject.set({ top: newTop, originY: "center" });
        break;
    }

    // Update canvas
    window.canvas.renderAll();
  },

  // Start crop mode
  startCrop() {
    if (!window.canvas || !this.canCrop) return;

    const activeObject = window.canvas.getActiveObject();
    if (!activeObject || activeObject.type !== "image") return;

    // Enable crop mode
    this.cropActive = true;

    // Store original object properties
    this.originalImageState = {
      scaleX: activeObject.scaleX,
      scaleY: activeObject.scaleY,
      left: activeObject.left,
      top: activeObject.top,
      width: activeObject.width,
      height: activeObject.height,
    };

    // Create a crop rect (simulating a crop interface)
    const cropRect = new fabric.Rect({
      left: activeObject.left,
      top: activeObject.top,
      width: activeObject.width * activeObject.scaleX,
      height: activeObject.height * activeObject.scaleY,
      fill: "rgba(0,0,0,0)",
      stroke: "#2196F3",
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      cornerColor: "#2196F3",
      cornerSize: 10,
      transparentCorners: false,
      hasRotatingPoint: false,
    });

    // Add the crop rect to canvas
    window.canvas.add(cropRect);
    window.canvas.setActiveObject(cropRect);
    this.cropInstance = cropRect;

    window.canvas.renderAll();
  },

  // Apply crop
  applyCrop() {
    if (!window.canvas || !this.cropActive || !this.cropInstance) return;

    // Get the active image
    const image = window.canvas
      .getObjects()
      .find((obj) => obj.type === "image");
    if (!image) {
      this.resetCrop();
      return;
    }

    // Get crop rect dimensions and position
    const cropRect = this.cropInstance;

    // Apply the crop (this is a simplified version - real implementation would be more complex)
    // Real implementation would use Fabric.js specific cropping logic

    // Remove crop interface
    window.canvas.remove(this.cropInstance);
    this.cropInstance = null;
    this.cropActive = false;

    // Update canvas
    window.canvas.renderAll();
  },

  // Reset crop
  resetCrop() {
    if (!window.canvas || !this.cropActive || !this.cropInstance) return;

    // Remove crop interface without applying changes
    window.canvas.remove(this.cropInstance);
    this.cropInstance = null;
    this.cropActive = false;

    // Restore original image state if needed
    const image = window.canvas
      .getObjects()
      .find((obj) => obj.type === "image");
    if (image && this.originalImageState) {
      image.set(this.originalImageState);
    }

    // Update canvas
    window.canvas.renderAll();
  },

  // Delete selected object
  deleteSelected() {
    if (!window.canvas || !this.hasSelection) return;

    const activeObject = window.canvas.getActiveObject();
    if (!activeObject) return;

    window.canvas.remove(activeObject);
    this.hasSelection = false;
    window.canvas.renderAll();
  },
});
