import {
  Canvas,
  Textbox,
  Rect,
  Path,
  PencilBrush,
  Circle,
  Line,
  FabricImage,
  ActiveSelection,
  filters,
} from "fabric";
import textComponent from "./components/text";
import uploadsComponent from "./components/uploads";
import drawingComponent from "./components/drawing";
import layersComponent from "./components/layers";
import clipArtsComponent from "./components/clipArts";
import masksComponent from "./components/masks";
import settingsComponent from "./components/settings";
import toolbarComponent from "./components/toolbar";
import contextMenuComponent from "./components/contextMenu";

import { downloadJPG, downloadPNG } from "./utils/export-utils";

// Create the unified fabric component
export default function fabricComponent() {

  return {


    // Main component properties
    activeTool: "templates", // Default active tool
    canvas: null,

    // Import all the components
    contextMenu: contextMenuComponent(),
    text: textComponent(),
    uploads: uploadsComponent(),
    drawing: drawingComponent(),
    layers: layersComponent(),
    clipArts: clipArtsComponent(),
    masks: masksComponent(),
    settings: settingsComponent(),
    toolbar: toolbarComponent(),

    // Include utility functions directly in the Alpine state
    centerAll() {
      if (!window.canvas) return;
      const objects = window.canvas.getObjects();
      if (objects.length === 0) return;

      const selection = new ActiveSelection(objects, { canvas: window.canvas });
      selection.center();
      window.canvas.discardActiveObject();
      this.addToHistory();
      window.canvas.requestRenderAll();
    },

    fitToCanvas() {
      if (!window.canvas) return;
      const objects = window.canvas.getObjects();
      if (objects.length === 0) return;

      const selection = new ActiveSelection(objects, { canvas: window.canvas });
      const canvasWidth = window.canvas.width;
      const canvasHeight = window.canvas.height;
      const selectionWidth = selection.width * selection.scaleX;
      const selectionHeight = selection.height * selection.scaleY;
      const scaleX = (canvasWidth - 40) / selectionWidth;
      const scaleY = (canvasHeight - 40) / selectionHeight;
      const scale = Math.min(scaleX, scaleY);

      selection.scale(scale);
      selection.center();
      window.canvas.discardActiveObject();
      this.addToHistory();
      window.canvas.requestRenderAll();
    },

    clearCanvas() {
      if (!window.canvas) return;
      window.canvas.clear();
      window.canvas.setBackgroundColor(
          "#ffffff",
          window.canvas.renderAll.bind(window.canvas)
      );
      this.addToHistory();
    },

    align(direction) {
      if (!window.canvas) return;
      const activeObject = window.canvas.getActiveObject();
      if (!activeObject) return;

      const canvasWidth = window.canvas.width;
      const canvasHeight = window.canvas.height;
      const objectWidth = activeObject.width * activeObject.scaleX;
      const objectHeight = activeObject.height * activeObject.scaleY;

      switch (direction) {
        case "left":
          activeObject.set({ left: objectWidth / 2 });
          break;
        case "horizontalCenter":
          activeObject.set({ left: canvasWidth / 2 });
          break;
        case "right":
          activeObject.set({ left: canvasWidth - objectWidth / 2 });
          break;
        case "top":
          activeObject.set({ top: objectHeight / 2 });
          break;
        case "verticalCenter":
          activeObject.set({ top: canvasHeight / 2 });
          break;
        case "bottom":
          activeObject.set({ top: canvasHeight - objectHeight / 2 });
          break;
      }

      activeObject.setCoords();
      window.canvas.requestRenderAll();
      this.addToHistory();
    },

    group() {
      if (!window.canvas) return;
      if (!window.canvas.getActiveObject()) return;
      if (window.canvas.getActiveObject().type !== "activeSelection") return;

      window.canvas.getActiveObject().toGroup();
      window.canvas.requestRenderAll();
      this.addToHistory();
    },

    ungroup() {
      if (!window.canvas) return;
      if (!window.canvas.getActiveObject()) return;
      if (window.canvas.getActiveObject().type !== "group") return;

      window.canvas.getActiveObject().toActiveSelection();
      window.canvas.requestRenderAll();
      this.addToHistory();
    },

    bringToFront() {
      if (!window.canvas) return;
      const activeObject = window.canvas.getActiveObject();
      if (activeObject) {
        window.canvas.bringToFront(activeObject);
        this.addToHistory();
      }
    },

    bringForward() {
      if (!window.canvas) return;
      const activeObject = window.canvas.getActiveObject();
      if (activeObject) {
        window.canvas.bringForward(activeObject);
        this.addToHistory();
      }
    },

    sendBackward() {
      if (!window.canvas) return;
      const activeObject = window.canvas.getActiveObject();
      if (activeObject) {
        window.canvas.sendBackwards(activeObject);
        this.addToHistory();
      }
    },

    sendToBack() {
      if (!window.canvas) return;
      const activeObject = window.canvas.getActiveObject();
      if (activeObject) {
        window.canvas.sendToBack(activeObject);
        this.addToHistory();
      }
    },

    deleteObject() {
      if (!window.canvas) return;
      const activeObject = window.canvas.getActiveObject();
      if (activeObject) {
        window.canvas.remove(activeObject);
        this.addToHistory();
      }
    },

    cloneObject() {
      if (!window.canvas) return;
      const activeObject = window.canvas.getActiveObject();
      if (!activeObject) return;

      activeObject.clone((cloned) => {
        cloned.set({
          left: activeObject.left + 10,
          top: activeObject.top + 10,
        });
        window.canvas.add(cloned);
        window.canvas.setActiveObject(cloned);
        this.addToHistory();
      });
    },

    toggleLock() {
      if (!window.canvas) return;
      const activeObject = window.canvas.getActiveObject();
      if (activeObject) {
        activeObject.set({
          lockMovementX: !activeObject.lockMovementX,
          lockMovementY: !activeObject.lockMovementY,
          lockRotation: !activeObject.lockRotation,
          lockScalingX: !activeObject.lockScalingX,
          lockScalingY: !activeObject.lockScalingY,
        });
        window.canvas.requestRenderAll();
        this.addToHistory();
      }
    },

    // History management
    historyStack: [],
    historyPosition: -1,
    maxHistorySteps: 50,

    initHistoryManager() {
      this.historyStack = [];
      this.historyPosition = -1;
      this.saveCanvasState();
    },

    saveCanvasState() {
      if (!window.canvas) return;
      const json = window.canvas.toJSON([
        "lockMovementX",
        "lockMovementY",
        "lockRotation",
        "lockScalingX",
        "lockScalingY",
      ]);
      const canvasState = JSON.stringify(json);

      // If we're not at the end of the stack, remove future states
      if (this.historyPosition < this.historyStack.length - 1) {
        this.historyStack = this.historyStack.slice(
            0,
            this.historyPosition + 1
        );
      }

      // Add the new state
      this.historyStack.push(canvasState);

      // Limit the history size
      if (this.historyStack.length > this.maxHistorySteps) {
        this.historyStack.shift();
      } else {
        this.historyPosition++;
      }
    },

    addToHistory() {
      this.saveCanvasState();
    },

    undo() {
      if (this.historyPosition > 0) {
        this.historyPosition--;
        this.loadCanvasState(this.historyStack[this.historyPosition]);
      }
    },

    redo() {
      if (this.historyPosition < this.historyStack.length - 1) {
        this.historyPosition++;
        this.loadCanvasState(this.historyStack[this.historyPosition]);
      }
    },

    loadCanvasState(state) {
      if (!window.canvas || !state) return;

      window.canvas.clear();
      window.canvas.loadFromJSON(JSON.parse(state), () => {
        window.canvas.requestRenderAll();
      });
    },

    exportFunctions: {
      downloadCanvas(format) {
        if (!window.canvas) return;

        if (format === "png") {
          downloadPNG();
        } else if (format === "jpg" || format === "jpeg") {
          downloadJPG();
        }
      },
    },

    // Main component initialization
    init() {
      this.$nextTick(() => {
        this.initCanvas();
        this.initHistoryManager();

        // Initialize context menu
        if (this.contextMenu && typeof this.contextMenu.init === 'function') {
          this.contextMenu.init();
        }

        // Keep this important log for initialization verification
        console.log("Canvas initialized:", !!window.canvas);
      });

      this.$watch("activeTool", (value) => {
        this.activeTool = value;
      });
    },

    // Change tool method
    changeTool(toolName) {
      this.activeTool = toolName;

      // Deactivate drawing mode when switching to non-drawing tools
      if (window.canvas && toolName !== "drawing") {
        window.canvas.isDrawingMode = false;
      }

      // If drawing tool is selected, initialize it
      if (toolName === "drawing" && this.drawing) {
        // Initialize the drawing mode
        this.drawing.updateDrawingMode("brush");
      }
    },

    initCanvas() {
      try {
        const canvas = new Canvas("image-editor", {
          preserveObjectStacking: true,
          width: 1200,
          height: 600,
          backgroundColor: "#ffffff",
          enableRetinaScaling: true,
          renderOnAddRemove: false,
        });

        window.canvas = canvas;
        this.canvas = canvas;

        // Make this component accessible globally for child components
        window.fabricComponent = this;

        // Make wheel event passive for better performance
        if (canvas.wrapperEl) {
          const originalAddEventListener = canvas.wrapperEl.addEventListener;
          canvas.wrapperEl.addEventListener = function (
              type,
              listener,
              options
          ) {
            if (type === "wheel") {
              if (typeof options === "object") {
                options.passive = true;
              } else {
                options = { passive: true };
              }
            }
            return originalAddEventListener.call(this, type, listener, options);
          };
        }

        // Set up native Fabric event listeners with proper context binding
        canvas.on("selection:created", (e) => this.handleSelection(e));
        canvas.on("selection:updated", (e) => this.handleSelection(e));
        canvas.on("selection:cleared", () => this.handleSelectionCleared());
        canvas.on("object:modified", (e) => this.handleObjectModified(e));
        canvas.on("object:added", (e) => this.handleObjectAdded(e));
        canvas.on("object:removed", (e) => this.handleObjectRemoved(e));

        // Initial render
        canvas.requestRenderAll();
      } catch (error) {
        // Silent error handling
      }
    },

    handleSelection(e) {
      try {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject) {
          // Update specific component states
          if (this.toolbar) {
            this.toolbar.hasSelection = true;
            this.toolbar.canCrop = activeObject.type === "image";
            this.toolbar.isMultiSelection =
                activeObject.type === "activeSelection";
          }

          // Handle text objects
          if (activeObject.type && activeObject.type.includes("text")) {
            if (this.text) {
              this.text.selectedObject = activeObject;
              if (typeof this.text.syncTextProperties === "function") {
                this.text.syncTextProperties(activeObject);
              }
            }
          }
          // Handle image objects
          else if (activeObject.type === "image") {
            if (this.uploads) {
              this.uploads.selectedObject = activeObject;
              this.uploads.selectedImage = activeObject;
              if (typeof this.uploads.syncObjectProperties === "function") {
                this.uploads.syncObjectProperties();
              }
            }
          }
        }
      } catch (error) {
        // Silent error handling
      }
    },

    handleSelectionCleared() {
      try {
        // Reset selection states
        if (this.toolbar) {
          this.toolbar.hasSelection = false;
          this.toolbar.canCrop = false;
          this.toolbar.isMultiSelection = false;
        }

        if (this.text) {
          this.text.selectedObject = null;
        }

        if (this.uploads) {
          this.uploads.selectedObject = null;
          this.uploads.selectedImage = null;
        }
      } catch (error) {
        // Silent error handling
      }
    },

    handleObjectModified(e) {
      try {
        // Add to history for undo/redo
        this.addToHistory();
      } catch (error) {
        // Silent error handling
      }
    },

    handleObjectAdded(e) {
      try {
        // Add to history for undo/redo
        this.addToHistory();

        // Update layers panel if available
        if (this.layers && typeof this.layers.syncLayers === "function") {
          this.layers.syncLayers();
        }
      } catch (error) {
        // Silent error handling
      }
    },

    handleObjectRemoved(e) {
      try {
        // Add to history for undo/redo
        this.addToHistory();

        // Update layers panel if available
        if (this.layers && typeof this.layers.syncLayers === "function") {
          this.layers.syncLayers();
        }
      } catch (error) {
        // Silent error handling
      }
    },

    // Image manipulation methods
    applyFilter(imageObject, filterType, options) {
      if (!imageObject) return;

      // Clear existing filters
      imageObject.filters = [];

      // Apply Fabric's built-in filters based on filter type
      switch (filterType) {
        case "grayscale":
          imageObject.filters.push(new filters.Grayscale());
          break;
        case "sepia":
          imageObject.filters.push(new filters.Sepia());
          break;
        case "invert":
          imageObject.filters.push(new filters.Invert());
          break;
        case "blur":
          imageObject.filters.push(
              new filters.Blur({
                blur: options?.amount || 0.5,
              })
          );
          break;
        case "contrast":
          imageObject.filters.push(
              new filters.Contrast({
                contrast: options?.amount || 0.25,
              })
          );
          break;
        case "brightness":
          imageObject.filters.push(
              new filters.Brightness({
                brightness: options?.amount || 0.1,
              })
          );
          break;
        case "saturation":
          imageObject.filters.push(
              new filters.Saturation({
                saturation: options?.amount || 0.3,
              })
          );
          break;
        case "noise":
          imageObject.filters.push(
              new filters.Noise({
                noise: options?.amount || 100,
              })
          );
          break;
        case "pixelate":
          imageObject.filters.push(
              new filters.Pixelate({
                blocksize: options?.amount || 10,
              })
          );
          break;
      }

      // Apply the filters
      imageObject.applyFilters();
      this.canvas.requestRenderAll();
      this.addToHistory();
    },

    addImage(url) {
      if (!this.canvas) return;

      FabricImage.fromURL(url, (img) => {
        // Set reasonable defaults
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const imgRatio = img.width / img.height;

        // Scale to fit within 80% of canvas (maintain aspect ratio)
        const maxWidth = canvasWidth * 0.8;
        const maxHeight = canvasHeight * 0.8;

        if (img.width > maxWidth || img.height > maxHeight) {
          if (imgRatio > 1) {
            img.scaleToWidth(maxWidth);
          } else {
            img.scaleToHeight(maxHeight);
          }
        }

        // Center the image
        img.set({
          left: canvasWidth / 2,
          top: canvasHeight / 2,
          originX: "center",
          originY: "center",
        });

        this.canvas.add(img);
        this.canvas.setActiveObject(img);
        this.canvas.requestRenderAll();
        this.addToHistory();

        if (this.uploads && typeof this.uploads.imageAdded === "function") {
          this.uploads.imageAdded(img);
        }
      });
    },

    addText(text, options = {}) {
      if (!this.canvas) return;

      const textbox = new Textbox(text || "Double-click to edit", {
        left: this.canvas.width / 2,
        top: this.canvas.height / 2,
        originX: "center",
        originY: "center",
        fontSize: options.fontSize || 40,
        fontFamily: options.fontFamily || "Arial",
        fill: options.fill || "#000000",
        textAlign: options.textAlign || "center",
        fontWeight: options.fontWeight || "normal",
        fontStyle: options.fontStyle || "normal",
        underline: options.underline || false,
        linethrough: options.linethrough || false,
        charSpacing: options.charSpacing || 0,
        lineHeight: options.lineHeight || 1.16,
        stroke: options.stroke || "",
        strokeWidth: options.strokeWidth || 0,
        backgroundColor: options.backgroundColor || "",
        width: options.width || 250,
      });

      this.canvas.add(textbox);
      this.canvas.setActiveObject(textbox);
      this.canvas.requestRenderAll();
      this.addToHistory();

      if (this.text && typeof this.text.textAdded === "function") {
        this.text.textAdded(textbox);
      }
    },
  };
}