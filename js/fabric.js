// src/fabric.js - Consolidated Fabric.js integration
import * as fabric from "fabric";

// Import utility functions
import {
  centerAll,
  fitToCanvas,
  clearCanvas,
  align,
  group,
  ungroup,
  bringToFront,
  bringForward,
  sendBackward,
  sendToBack,
  deleteObject,
  cloneObject,
  toggleLock,
} from "./utils/canvas-utils.js";

import {
  downloadCanvas,
  downloadPNG,
  downloadJPG,
} from "./utils/export-utils.js";

import {
  initHistoryManager,
  addToHistory,
  undo,
  redo,
} from "./utils/history-manager.js";

// Make Fabric available globally
window.fabric = fabric;

// Import filters
import "./filters/fabric-filters-polyfill.js";

export default function () {
  let canvas;
  let selectedTextObject = null;

  return {
    // Canvas state properties
    hasSelection: false,
    canCrop: false,
    cropActive: false,
    activeTool: "select",

    init() {
      // Initialize the canvas when the DOM is ready
      this.$nextTick(() => {
        this.initCanvas();

        // Make necessary utilities available globally
        window.downloadCanvas = downloadCanvas;
        window.canvasUtils = {
          centerAll,
          fitToCanvas,
          clearCanvas,
          align,
          group,
          ungroup,
          bringForward,
          sendBackward,
          bringToFront,
          sendToBack,
          deleteObject,
          cloneObject,
          toggleLock,
        };

        // Initialize history manager
        initHistoryManager();
      });
    },

    // Initialize the main canvas
    initCanvas() {
      // Create canvas instance
      canvas = new fabric.Canvas(this.$refs.canvas || "image-editor", {
        preserveObjectStacking: true,
        width: 1200,
        height: 600,
        backgroundColor: "#ffffff",
        selection: true,
      });

      // Make it globally available
      window.canvas = canvas;

      // Set up event listeners
      canvas.on("selection:created", this.handleObjectSelected);
      canvas.on("selection:updated", this.handleObjectSelected);
      canvas.on("selection:cleared", this.handleSelectionCleared);
      canvas.on("object:modified", this.handleObjectModified);
      canvas.on("object:added", this.handleObjectAdded);
      canvas.on("object:removed", this.handleObjectRemoved);

      // Add some demo objects if needed
      const welcomeText = new fabric.Text("Welcome to Steve Editor", {
        fontFamily: "Roboto",
        fontSize: 30,
        fill: "#333333",
        left: 400,
        top: 100,
      });

      const rectangle = new fabric.Rect({
        width: 200,
        height: 150,
        fill: "#ff5555",
        left: 300,
        top: 300,
        rx: 10,
        ry: 10,
      });

      canvas.add(welcomeText);
      canvas.add(rectangle);
      canvas.centerObject(welcomeText);

      // Notify other components that canvas is ready
      window.dispatchEvent(
        new CustomEvent("canvas:initialized", {
          detail: { canvas: canvas },
        })
      );

      console.log("Canvas initialized");
      canvas.requestRenderAll();
    },

    // Handle selection events
    handleObjectSelected(e) {
      this.hasSelection = true;
      const obj = e.selected ? e.selected[0] : canvas.getActiveObject();

      if (!obj) return;
      console.log("Object selected:", obj.type);

      // Dispatch event to notify panels about selection
      window.dispatchEvent(
        new CustomEvent("object:selected", {
          detail: obj,
        })
      );

      if (
        obj &&
        (obj.type === "textbox" || obj.type === "i-text" || obj.type === "text")
      ) {
        selectedTextObject = obj;
        this.canCrop = false;

        // Notify text panel of selection with all properties
        window.dispatchEvent(
          new CustomEvent("text-selected", {
            detail: {
              type: "text",
              object: {
                fill: obj.fill,
                fontFamily: obj.fontFamily,
                fontSize: obj.fontSize,
                fontWeight: obj.fontWeight,
                fontStyle: obj.fontStyle,
                underline: obj.underline,
                opacity: obj.opacity,
                stroke: obj.stroke,
                strokeWidth: obj.strokeWidth,
                charSpacing: obj.charSpacing,
                angle: obj.angle,
                skewX: obj.skewX,
                skewY: obj.skewY,
                shadow: obj.shadow,
              },
            },
          })
        );
      } else {
        selectedTextObject = null;
        this.canCrop = obj && obj.type === "image";

        // Notify text panel no text is selected
        window.dispatchEvent(
          new CustomEvent("text-selected", {
            detail: { type: "other" },
          })
        );
      }
    },

    handleSelectionCleared() {
      this.hasSelection = false;
      selectedTextObject = null;

      // Notify text panel no text is selected
      window.dispatchEvent(
        new CustomEvent("text-selected", {
          detail: { type: "none" },
        })
      );

      // Notify other components that selection is cleared
      window.dispatchEvent(new CustomEvent("selection:cleared"));
    },

    // Handle object modified events
    handleObjectModified(e) {
      // Add to history stack for undo
      addToHistory();

      // Notify panels about modification
      window.dispatchEvent(
        new CustomEvent("object:modified", {
          detail: e.target,
        })
      );
    },

    // Handle object added events
    handleObjectAdded(e) {
      // Add to history stack for undo
      addToHistory();

      // Notify panels about new object
      window.dispatchEvent(
        new CustomEvent("object:added", {
          detail: e.target,
        })
      );
    },

    // Handle object removed events
    handleObjectRemoved(e) {
      // Add to history stack for undo
      addToHistory();

      // Notify panels about removed object
      window.dispatchEvent(
        new CustomEvent("object:removed", {
          detail: e.target,
        })
      );
    },

    // Text Methods
    addText(type) {
      console.log("Fabric addText called with type:", type);

      if (!canvas) {
        console.error("Canvas is not initialized");
        return;
      }

      let textObj;

      // Use Textbox instead of CurvedText
      switch (type) {
        case "full":
          textObj = new fabric.Textbox("New Heading", {
            left: 100,
            top: 100,
            width: 300,
            fontSize: 48,
            fontWeight: "bold",
            editable: true,
          });
          break;
        case "sub":
          textObj = new fabric.Textbox("New Subheading", {
            left: 100,
            top: 150,
            width: 250,
            fontSize: 32,
            fontWeight: "normal",
            editable: true,
          });
          break;
        case "paragraph":
          textObj = new fabric.Textbox("Add your text here", {
            left: 100,
            top: 200,
            width: 400,
            fontSize: 16,
            fontWeight: "normal",
            editable: true,
          });
          break;
        default:
          textObj = new fabric.Textbox("New Text", {
            left: 100,
            top: 100,
            width: 200,
            fontSize: 20,
            fontWeight: "normal",
            editable: true,
          });
      }

      canvas.add(textObj);
      canvas.setActiveObject(textObj);
      selectedTextObject = textObj;
      canvas.requestRenderAll();
    },

    updateTextProperty(property, value) {
      console.log("Update text property:", property, value);

      if (!selectedTextObject || !canvas) {
        console.error("No text selected or canvas not initialized");
        return;
      }

      // Handle numeric values
      if (typeof value === "string" && !isNaN(parseFloat(value))) {
        if (
          property === "fontSize" ||
          property === "charSpacing" ||
          property === "strokeWidth" ||
          property === "skewX" ||
          property === "skewY"
        ) {
          value = parseFloat(value);
        }
      }

      selectedTextObject.set(property, value);
      canvas.requestRenderAll();
    },

    updateTextRotation(value) {
      console.log("Update rotation:", value);

      if (!selectedTextObject || !canvas) {
        console.error("No text selected or canvas not initialized");
        return;
      }

      // Convert to number if it's a string
      if (typeof value === "string") {
        value = parseFloat(value);
      }

      selectedTextObject.set("angle", value);
      canvas.requestRenderAll();
    },

    toggleFontWeight() {
      console.log("Toggle font weight");

      if (!selectedTextObject || !canvas) {
        console.error("No text selected or canvas not initialized");
        return;
      }

      const newWeight =
        selectedTextObject.fontWeight === "bold" ? "normal" : "bold";
      selectedTextObject.set("fontWeight", newWeight);
      canvas.requestRenderAll();

      // Update the text panel
      window.dispatchEvent(
        new CustomEvent("text-selected", {
          detail: {
            type: "text",
            object: selectedTextObject,
          },
        })
      );
    },

    toggleFontStyle() {
      console.log("Toggle font style");

      if (!selectedTextObject || !canvas) {
        console.error("No text selected or canvas not initialized");
        return;
      }

      const newStyle =
        selectedTextObject.fontStyle === "italic" ? "normal" : "italic";
      selectedTextObject.set("fontStyle", newStyle);
      canvas.requestRenderAll();

      // Update the text panel
      window.dispatchEvent(
        new CustomEvent("text-selected", {
          detail: {
            type: "text",
            object: selectedTextObject,
          },
        })
      );
    },

    toggleUnderline() {
      console.log("Toggle underline");

      if (!selectedTextObject || !canvas) {
        console.error("No text selected or canvas not initialized");
        return;
      }

      selectedTextObject.set("underline", !selectedTextObject.underline);
      canvas.requestRenderAll();

      // Update the text panel
      window.dispatchEvent(
        new CustomEvent("text-selected", {
          detail: {
            type: "text",
            object: selectedTextObject,
          },
        })
      );
    },

    toggleShadow(enabled) {
      console.log("Toggle shadow:", enabled);

      if (!selectedTextObject || !canvas) {
        console.error("No text selected or canvas not initialized");
        return;
      }

      if (enabled) {
        selectedTextObject.set(
          "shadow",
          new fabric.Shadow({
            color: "#000000",
            blur: 5,
            offsetX: 5,
            offsetY: 5,
          })
        );
      } else {
        selectedTextObject.set("shadow", null);
      }

      canvas.requestRenderAll();
    },

    updateShadow(property, value) {
      console.log("Update shadow:", property, value);

      if (!selectedTextObject || !canvas) {
        console.error("No text selected or canvas not initialized");
        return;
      }

      // Create shadow if it doesn't exist
      if (!selectedTextObject.shadow) {
        selectedTextObject.set(
          "shadow",
          new fabric.Shadow({
            color: "#000000",
            blur: 5,
            offsetX: 5,
            offsetY: 5,
          })
        );
      }

      // Convert value to number if appropriate
      if (property !== "color" && typeof value === "string") {
        value = parseFloat(value);
      }

      selectedTextObject.shadow[property] = value;
      selectedTextObject.set("shadow", selectedTextObject.shadow);

      canvas.requestRenderAll();
    },

    updateTextCurve(value) {
      console.log("Update text curve:", value);

      if (!selectedTextObject || !canvas) {
        console.error("No text selected or canvas not initialized");
        return;
      }

      // Use the bridge module that leverages the global fabric object
      const curvedText = updateTextCurve(selectedTextObject, value);

      if (curvedText !== selectedTextObject) {
        // We got a new curved text object, replace the original
        canvas.remove(selectedTextObject);
        canvas.add(curvedText);
        canvas.setActiveObject(curvedText);
        selectedTextObject = curvedText;
      }

      canvas.requestRenderAll();
    },

    // Helper method to recreate curved text as normal text
    recreateTextAsNormal(groupObject) {
      if (!groupObject || !canvas) return;

      // Extract original text from the group
      const letters = groupObject._objects || [];
      const text = letters.map((obj) => obj.text || "").join("");

      // Use properties from the first letter as a reference
      if (letters.length > 0) {
        const firstLetter = letters[0];
        const originalProps = {
          left: groupObject.left,
          top: groupObject.top,
          fontSize: firstLetter.fontSize || 20,
          fontFamily: firstLetter.fontFamily || "Arial",
          fontWeight: firstLetter.fontWeight || "normal",
          fontStyle: firstLetter.fontStyle || "normal",
          fill: firstLetter.fill || "#000000",
          stroke: firstLetter.stroke || "",
          strokeWidth: firstLetter.strokeWidth || 0,
          underline: firstLetter.underline || false,
        };

        // Remove the group
        canvas.remove(groupObject);

        // Create a new regular text object
        const textObj = new fabric.Textbox(text, {
          left: originalProps.left,
          top: originalProps.top,
          width: text.length * originalProps.fontSize * 0.6,
          fontSize: originalProps.fontSize,
          fontFamily: originalProps.fontFamily,
          fontWeight: originalProps.fontWeight,
          fontStyle: originalProps.fontStyle,
          fill: originalProps.fill,
          stroke: originalProps.stroke,
          strokeWidth: originalProps.strokeWidth,
          underline: originalProps.underline,
          editable: true,
        });

        // Add to canvas
        canvas.add(textObj);
        canvas.setActiveObject(textObj);
        selectedTextObject = textObj;

        canvas.requestRenderAll();
      }
    },

    // Alignment methods for the quick options bar
    alignObjects(direction) {
      console.log("Align objects:", direction);

      if (!canvas || !canvas.getActiveObject()) {
        console.error("No canvas or active object");
        return;
      }

      const activeObj = canvas.getActiveObject();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      switch (direction) {
        case "left":
          activeObj.set("left", 0);
          break;
        case "centerH":
          activeObj.centerH();
          break;
        case "right":
          activeObj.set("left", canvasWidth - activeObj.getScaledWidth());
          break;
        case "top":
          activeObj.set("top", 0);
          break;
        case "centerV":
          activeObj.centerV();
          break;
        case "bottom":
          activeObj.set("top", canvasHeight - activeObj.getScaledHeight());
          break;
      }

      canvas.requestRenderAll();
    },

    // Canvas utilities methods
    centerAll() {
      centerAll(canvas);
    },

    fitToCanvas() {
      fitToCanvas(canvas);
    },

    clearCanvas() {
      clearCanvas(canvas);
    },

    alignObjects(direction) {
      align(canvas, direction);
    },

    groupObjects() {
      group(canvas);
    },

    ungroupObjects() {
      ungroup(canvas);
    },

    bringForward() {
      bringForward(canvas);
    },

    sendBackward() {
      sendBackward(canvas);
    },

    bringToFront() {
      bringToFront(canvas);
    },

    sendToBack() {
      sendToBack(canvas);
    },

    deleteSelectedObject() {
      deleteObject(canvas);
    },

    cloneSelectedObject() {
      cloneObject(canvas);
    },

    toggleObjectLock() {
      toggleLock(canvas);
    },

    // Export methods
    downloadAsCanvas() {
      downloadCanvas(canvas);
    },

    downloadAsPNG() {
      downloadPNG(canvas);
    },

    downloadAsJPG() {
      downloadJPG(canvas);
    },

    // History methods
    undo() {
      undo(canvas);
    },

    redo() {
      redo(canvas);
    },
  };
}
