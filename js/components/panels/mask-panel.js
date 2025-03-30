export const maskPanelComponent = () => ({
  isActive: false,

  init() {
    // Listen for tool changes
    window.addEventListener("tool-changed", (e) => {
      this.isActive = e.detail.type === "mask";
    });
  },

  // Apply a mask to the currently selected object
  applyMask(maskUrl) {
    if (!window.canvas) return;

    const activeObject = window.canvas.getActiveObject();
    if (!activeObject) {
      // Alert user to select an object first
      alert("Please select an image to apply a mask to");
      return;
    }

    // Check if the active object is an image
    if (activeObject.type !== "image") {
      alert("Masks can only be applied to images");
      return;
    }

    // Load the mask SVG
    fabric.loadSVGFromURL(maskUrl, (objects, options) => {
      // Create a group from all the SVG objects
      const svgGroup = fabric.util.groupSVGElements(objects, options);

      // Scale and position the mask to match the image
      svgGroup.set({
        scaleX: (activeObject.width * activeObject.scaleX) / svgGroup.width,
        scaleY: (activeObject.height * activeObject.scaleY) / svgGroup.height,
        originX: "center",
        originY: "center",
      });

      // Apply the mask as clipPath
      activeObject.clipPath = svgGroup;

      // Update the canvas
      window.canvas.renderAll();
    });
  },
});
