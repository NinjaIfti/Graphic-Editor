export const drawingPanelComponent = () => ({
  isActive: false,
  activeTab: "brush",

  // Brush settings
  brushSettings: {
    size: 20,
    opacity: 1,
    color: "#264653",
  },

  // Eraser settings
  eraserSettings: {
    size: 20,
    invert: false,
  },

  // Pencil settings
  pencilSettings: {
    brushType: "Pencil",
    size: 20,
    shadowWidth: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    color: "#333333",
    shadowColor: "#000000",
  },

  // Store original canvas state for undo/redo
  canvasHistory: [],
  historyIndex: -1,
  maxHistorySteps: 20,

  init() {
    // Listen for tool changes
    window.addEventListener("tool-changed", (e) => {
      const wasActive = this.isActive;
      this.isActive = e.detail.type === "drawing";

      // Toggle drawing mode based on activation
      if (this.isActive && !wasActive) {
        this.activateDrawingMode();
      } else if (!this.isActive && wasActive) {
        this.deactivateDrawingMode();
      }
    });

    // Add watchers for settings changes
    this.$watch(
      "brushSettings",
      () => {
        if (this.isActive && this.activeTab === "brush") {
          this.setupBrush();
        }
      },
      { deep: true }
    );

    this.$watch(
      "eraserSettings",
      () => {
        if (this.isActive && this.activeTab === "eraser") {
          this.setupEraser();
        }
      },
      { deep: true }
    );

    this.$watch(
      "pencilSettings",
      () => {
        if (this.isActive && this.activeTab === "pencil") {
          this.setupPencil();
        }
      },
      { deep: true }
    );

    // Add tab change listener
    this.$watch("activeTab", (newTab) => {
      if (this.isActive) {
        this.updateDrawingMode(newTab);
      }
    });

    // Add canvas history events
    this.setupCanvasHistory();
  },

  // Setup canvas history tracking
  setupCanvasHistory() {
    if (!window.canvas) return;

    // Save initial state
    this.saveCanvasState();

    // Add event listener for object modifications
    window.canvas.on("object:added", () => this.saveCanvasState());
    window.canvas.on("object:modified", () => this.saveCanvasState());
    window.canvas.on("object:removed", () => this.saveCanvasState());
  },

  // Save current canvas state
  saveCanvasState() {
    if (!window.canvas) return;

    // Don't save if we're in the middle of applying history
    if (this._applyingHistory) return;

    try {
      // Get JSON representation of canvas
      const json = window.canvas.toJSON();

      // Remove any states beyond current index
      if (this.historyIndex < this.canvasHistory.length - 1) {
        this.canvasHistory = this.canvasHistory.slice(0, this.historyIndex + 1);
      }

      // Add new state
      this.canvasHistory.push(json);

      // Trim history if too long
      if (this.canvasHistory.length > this.maxHistorySteps) {
        this.canvasHistory.shift();
      } else {
        this.historyIndex++;
      }
    } catch (error) {
      console.error("Error saving canvas state:", error);
    }
  },

  // Undo last action
  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.applyCanvasState(this.canvasHistory[this.historyIndex]);
  },

  // Redo last undone action
  redo() {
    if (this.historyIndex >= this.canvasHistory.length - 1) return;
    this.historyIndex++;
    this.applyCanvasState(this.canvasHistory[this.historyIndex]);
  },

  // Apply a saved canvas state
  applyCanvasState(state) {
    if (!window.canvas) return;

    try {
      this._applyingHistory = true;
      window.canvas.loadFromJSON(state, () => {
        window.canvas.renderAll();
        this._applyingHistory = false;
      });
    } catch (error) {
      console.error("Error applying canvas state:", error);
      this._applyingHistory = false;
    }
  },

  // Update brush preview (UI only)
  updateBrushPreview() {
    // This is handled by Alpine.js binding in the template
    if (this.isActive) {
      this.updateDrawingMode(this.activeTab);
    }
  },

  // Activate drawing mode on the canvas
  activateDrawingMode() {
    if (!window.canvas) {
      console.error("Canvas not found!");
      return;
    }

    // Enable Fabric.js free drawing mode
    window.canvas.isDrawingMode = true;

    // Apply current settings based on active tab
    this.updateDrawingMode(this.activeTab);
  },

  // Update drawing mode based on active tab
  updateDrawingMode(tabName) {
    if (!window.canvas) {
      console.error("Canvas not found when updating drawing mode");
      return;
    }

    // Clean up previous mode
    this.deactivateDrawingMode();

    this.activeTab = tabName;

    switch (tabName) {
      case "brush":
        this.setupBrush();
        break;
      case "eraser":
        this.setupEraser();
        break;
      case "pencil":
        this.setupPencil();
        break;
    }
  },

  // Setup brush drawing
  setupBrush() {
    if (!window.canvas) return;

    try {
      // Create a new brush
      const brush = new fabric.PencilBrush(window.canvas);

      // Set brush properties
      brush.width = parseInt(this.brushSettings.size);
      const opacity = parseFloat(this.brushSettings.opacity);

      // Set opacity through rgba color if opacity is less than 1
      if (opacity < 1) {
        // Parse the hex color to rgb
        const hex = this.brushSettings.color.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        brush.color = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      } else {
        brush.color = this.brushSettings.color;
      }

      // Apply brush to canvas
      window.canvas.freeDrawingBrush = brush;
      window.canvas.isDrawingMode = true;
    } catch (error) {
      console.error("Error setting up brush:", error);
    }
  },

  // Setup eraser - improved version
  setupEraser() {
    if (!window.canvas) return;

    try {
      // Create a composite eraser using destination-out blend mode
      const eraserBrush = new fabric.PencilBrush(window.canvas);
      eraserBrush.width = parseInt(this.eraserSettings.size);
      eraserBrush.color = this.eraserSettings.invert
        ? "rgba(0,0,0,1)"
        : "rgba(255,255,255,1)";

      // Store original path creation method
      const originalCreatePath = fabric.PencilBrush.prototype._renderPath;

      // Override the internal method to create paths with 'destination-out' blend mode
      fabric.PencilBrush.prototype._renderPath = function (ctx) {
        ctx.globalCompositeOperation = "destination-out";
        originalCreatePath.call(this, ctx);
        ctx.globalCompositeOperation = "source-over"; // Reset to default
      };

      // Apply eraser brush to canvas
      window.canvas.freeDrawingBrush = eraserBrush;
      window.canvas.isDrawingMode = true;

      // Save the original method so we can restore it later
      window.canvas._originalCreatePath = originalCreatePath;

      // Add a path complete handler to add the eraser path as a real path
      if (!window.canvas._pathCreatedHandler) {
        window.canvas._pathCreatedHandler = (options) => {
          // Get the current path
          const path = options.path;

          // Mark this path as an eraser path
          path.eraserPath = true;

          // Save canvas state after erasing
          this.saveCanvasState();
        };

        window.canvas.on("path:created", window.canvas._pathCreatedHandler);
      }
    } catch (error) {
      console.error("Error setting up eraser:", error);
    }
  },

  // Clean up when switching tools
  deactivateDrawingMode() {
    if (!window.canvas) return;

    // Disable drawing mode
    window.canvas.isDrawingMode = false;

    // Restore original path creation method if it was overridden by eraser
    if (window.canvas._originalCreatePath) {
      fabric.PencilBrush.prototype._renderPath =
        window.canvas._originalCreatePath;
      delete window.canvas._originalCreatePath;
    }

    // Remove path created handler if it exists
    if (window.canvas._pathCreatedHandler) {
      window.canvas.off("path:created", window.canvas._pathCreatedHandler);
      delete window.canvas._pathCreatedHandler;
    }

    // Clean up eraser event handlers
    if (window.canvas.__eraser_mousedown) {
      window.canvas.off("mouse:down", window.canvas.__eraser_mousedown);
      delete window.canvas.__eraser_mousedown;
    }

    if (window.canvas.__eraser_mousemove) {
      window.canvas.off("mouse:move", window.canvas.__eraser_mousemove);
      delete window.canvas.__eraser_mousemove;
    }

    if (window.canvas.__eraser_mouseup) {
      window.canvas.off("mouse:up", window.canvas.__eraser_mouseup);
      delete window.canvas.__eraser_mouseup;
    }
  },

  // Setup pencil with different brush types
  setupPencil() {
    if (!window.canvas) return;

    try {
      let brush;
      const brushType = this.pencilSettings.brushType;
      const size = parseInt(this.pencilSettings.size);
      const color = this.pencilSettings.color;

      // Create brush based on type
      switch (brushType) {
        case "Circle":
          brush =
            typeof fabric.CircleBrush === "function"
              ? new fabric.CircleBrush(window.canvas)
              : new fabric.PencilBrush(window.canvas);
          break;

        case "Spray":
          brush =
            typeof fabric.SprayBrush === "function"
              ? new fabric.SprayBrush(window.canvas)
              : new fabric.PencilBrush(window.canvas);
          break;

        case "hLine":
        case "vLine":
        case "square":
        case "diamond":
        case "texture":
          if (typeof fabric.PatternBrush === "function") {
            brush = new fabric.PatternBrush(window.canvas);
            brush.getPatternSrc = () => {
              const patternCanvas = document.createElement("canvas");
              const ctx = patternCanvas.getContext("2d");
              patternCanvas.width = patternCanvas.height = 10;

              ctx.fillStyle = color;

              switch (brushType) {
                case "hLine":
                  ctx.fillRect(0, 5, 10, 1);
                  break;
                case "vLine":
                  ctx.fillRect(5, 0, 1, 10);
                  break;
                case "square":
                  ctx.fillRect(2, 2, 6, 6);
                  break;
                case "diamond":
                  ctx.beginPath();
                  ctx.moveTo(5, 0);
                  ctx.lineTo(10, 5);
                  ctx.lineTo(5, 10);
                  ctx.lineTo(0, 5);
                  ctx.closePath();
                  ctx.fill();
                  break;
                case "texture":
                  ctx.fillRect(1, 1, 2, 2);
                  ctx.fillRect(5, 5, 2, 2);
                  ctx.fillRect(8, 2, 1, 1);
                  ctx.fillRect(2, 8, 1, 1);
                  break;
              }

              return patternCanvas;
            };
          } else {
            brush = new fabric.PencilBrush(window.canvas);
          }
          break;

        default:
          brush = new fabric.PencilBrush(window.canvas);
      }

      // Apply common properties
      brush.width = size;
      brush.color = color;

      // Apply shadow if enabled
      if (parseInt(this.pencilSettings.shadowWidth) > 0) {
        try {
          brush.shadow = new fabric.Shadow({
            blur: parseInt(this.pencilSettings.shadowWidth),
            offsetX: parseInt(this.pencilSettings.shadowOffsetX),
            offsetY: parseInt(this.pencilSettings.shadowOffsetY),
            color: this.pencilSettings.shadowColor,
          });
        } catch (error) {
          console.error("Error setting shadow:", error);
        }
      }

      // Apply brush to canvas
      window.canvas.freeDrawingBrush = brush;
      window.canvas.isDrawingMode = true;
    } catch (error) {
      console.error("Error setting up pencil:", error);
    }
  },
});
