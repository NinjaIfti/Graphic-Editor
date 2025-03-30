// src/components/core/canvas-manager.js
export const canvasManagerComponent = () => ({
  init() {
    console.log("Canvas manager initializing...");
    // this.filteredFonts = [...this.fonts];
    // Initialize canvas and make it globally available
    const canvas = new fabric.Canvas(this.$refs.canvas, {
      preserveObjectStacking: true,
      width: 800,
      height: 600,
    });

    // Make canvas available globally for other components
    window.canvas = canvas;

    // Set up event listeners to communicate with other components
    canvas.on("selection:created", this.handleSelection);
    canvas.on("selection:updated", this.handleSelection);
    canvas.on("selection:cleared", this.handleSelectionCleared);

    // Dispatch event that canvas is ready
    window.dispatchEvent(
      new CustomEvent("canvas:initialized", {
        detail: { canvas: canvas },
      })
    );

    // Listen for tool changes
    this.listenForToolChanges();
  },
  // ... methods ...
  handleSelection() {
    const activeObject = window.canvas.getActiveObject();
    if (activeObject) {
      // Dispatch event to notify panels about selection
      window.dispatchEvent(
        new CustomEvent("object:selected", {
          detail: activeObject,
        })
      );
    }
  },

  handleSelectionCleared() {
    // Notify panels that selection is cleared
    window.dispatchEvent(new CustomEvent("selection:cleared"));
  },

  listenForToolChanges() {
    window.addEventListener("tool-changed", (e) => {
      const toolType = e.detail.type;

      // Set drawing mode only when drawing tool is active
      if (toolType === "drawing") {
        // Enable drawing mode
        window.canvas.isDrawingMode = true;

        // Setup a default brush
        const brush = new fabric.PencilBrush(window.canvas);
        brush.width = 5;
        brush.color = "#000000";
        window.canvas.freeDrawingBrush = brush;
      } else {
        // Disable drawing mode for other tools
        window.canvas.isDrawingMode = false;
      }

      window.canvas.renderAll();
    });
  },
});
