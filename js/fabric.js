import { Canvas, Textbox, IText, Shadow, Text, Group } from "fabric";

import updateTextCurve from "./curveTextBridge";

export default function () {
  let canvas;
  let selectedTextObject = null;

  return {
    // Canvas state properties
    hasSelection: false,
    canCrop: false,
    cropActive: false,

    // Initialize the canvas
    init() {
      // Initialize the canvas with explicit dimensions
      canvas = new Canvas(this.$refs.canvas, {
        width: 800,
        height: 600,
        preserveObjectStacking: true,
        backgroundColor: "#ffffff",
        selection: true,
      });

      // Force the HTML canvas element to match these dimensions
      this.$refs.canvas.style.width = "800px";
      this.$refs.canvas.style.height = "600px";
      this.$refs.canvas.style.position = "relative";

      // Set up event listeners
      canvas.on("selection:created", this.handleObjectSelected);
      canvas.on("selection:updated", this.handleObjectSelected);
      canvas.on("selection:cleared", this.handleSelectionCleared);

      console.log("Canvas initialized with dimensions 800x600");
      canvas.requestRenderAll();
    },

    // Selection handling
    handleObjectSelected(e) {
      this.hasSelection = true;
      const obj = e.selected[0];
      console.log("Object selected:", obj.type);

      if (obj && (obj.type === "textbox" || obj.type === "i-text")) {
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
          textObj = new Textbox("New Heading", {
            left: 100,
            top: 100,
            width: 300,
            fontSize: 48,
            fontWeight: "bold",
            editable: true,
          });
          break;
        case "sub":
          textObj = new Textbox("New Subheading", {
            left: 100,
            top: 150,
            width: 250,
            fontSize: 32,
            fontWeight: "normal",
            editable: true,
          });
          break;
        case "paragraph":
          textObj = new Textbox("Add your text here", {
            left: 100,
            top: 200,
            width: 400,
            fontSize: 16,
            fontWeight: "normal",
            editable: true,
          });
          break;
        default:
          textObj = new Textbox("New Text", {
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
          new Shadow({
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
          new Shadow({
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
        const textObj = new Textbox(text, {
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
  };
}
