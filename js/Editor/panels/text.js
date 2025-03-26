// js/Editor/panels/text.js
import { canvas } from "../app.js";
import { AddItemToEditor } from "../Editor.js";
import Alpine from "alpinejs";

// Alpine.js component for text panel
export function textPanel() {
  return {
    isActive: false,
    headings: {
      full: {
        fontSize: 50,
        fontWeight: "bold",
        text: "Add a heading",
      },
      sub: {
        fontSize: 35,
        fontWeight: "bold",
        text: "Add a subheading",
      },
      paragraph: {
        fontSize: 20,
        fontWeight: "normal",
        text: "Add a little bit of body text",
      },
    },
    textProperties: {
      fill: "#000000",
      fontFamily: "Arial",
      fontSize: 30,
      fontWeight: "normal",
      fontStyle: "normal",
      underline: false,
      opacity: 1,
      stroke: "#000000",
      strokeWidth: 0,
      charSpacing: 0,
      skewX: 0,
      skewY: 0,
      shadowEnabled: false,
      shadowColor: "#000000",
      shadowBlur: 5,
      shadowOffsetX: 5,
      shadowOffsetY: 5,
      rotation: 0,
    },
    showDistortion: false,
    showShadow: false,
    selectedObject: null,
    fonts: [
      "Arial",
      "Helvetica",
      "Times New Roman",
      "Courier New",
      "Verdana",
      "Georgia",
      "Palatino",
      "Garamond",
      "Bookman",
      "Tahoma",
      "Trebuchet MS",
    ],

    init() {
      // Initialize component

      // Listen for tool panel changes
      window.addEventListener("change-tool", (event) => {
        this.isActive = event.detail.type === "text";
      });

      // Listen for text object selection
      if (typeof canvas !== "undefined") {
        canvas.on("selection:created", this.onObjectSelected.bind(this));
        canvas.on("selection:updated", this.onObjectSelected.bind(this));
        canvas.on("selection:cleared", this.onSelectionCleared.bind(this));
      }
    },

    onObjectSelected() {
      const obj = canvas.getActiveObject();
      if ((obj && obj.type === "text") || obj.type === "i-text") {
        this.selectedObject = obj;
        this.updateTextPropertiesFromObject(obj);
      }
    },

    onSelectionCleared() {
      this.selectedObject = null;
    },

    updateTextPropertiesFromObject(obj) {
      // Update properties from the selected text object
      this.textProperties = {
        fill: obj.fill || "#000000",
        fontFamily: obj.fontFamily || "Arial",
        fontSize: obj.fontSize || 30,
        fontWeight: obj.fontWeight || "normal",
        fontStyle: obj.fontStyle || "normal",
        underline: obj.underline || false,
        opacity: obj.opacity !== undefined ? obj.opacity : 1,
        stroke: obj.stroke || "#000000",
        strokeWidth: obj.strokeWidth || 0,
        charSpacing: obj.charSpacing || 0,
        skewX: obj.skewX || 0,
        skewY: obj.skewY || 0,
        shadowEnabled: !!obj.shadow,
        shadowColor: obj.shadow ? obj.shadow.color : "#000000",
        shadowBlur: obj.shadow ? obj.shadow.blur : 5,
        shadowOffsetX: obj.shadow ? obj.shadow.offsetX : 5,
        shadowOffsetY: obj.shadow ? obj.shadow.offsetY : 5,
        rotation: obj.angle || 0,
      };
    },

    addText() {
      // Discard any active object
      canvas.discardActiveObject();

      // Add basic text
      AddItemToEditor(
        {
          type: "text",
          src: "Lorem ipsum....",
        },
        {
          strokeWidth: 0,
        }
      );
    },

    addHeading(type) {
      if (!this.headings[type]) return;

      const props = { ...this.headings[type] };
      props.strokeWidth = 0;

      // Add heading with specific properties
      AddItemToEditor(
        {
          src: props.text || "Lorem ipsum....",
          type: "text",
        },
        props
      );
    },

    updateObjectProperty(property, value) {
      if (!this.selectedObject) return;

      // Update object property
      this.selectedObject.set(property, value);
      canvas.renderAll();
    },

    toggleFontWeight() {
      if (!this.selectedObject) return;

      const newWeight =
        this.textProperties.fontWeight === "bold" ? "normal" : "bold";
      this.textProperties.fontWeight = newWeight;
      this.selectedObject.set("fontWeight", newWeight);
      canvas.renderAll();
    },

    toggleFontStyle() {
      if (!this.selectedObject) return;

      const newStyle =
        this.textProperties.fontStyle === "italic" ? "normal" : "italic";
      this.textProperties.fontStyle = newStyle;
      this.selectedObject.set("fontStyle", newStyle);
      canvas.renderAll();
    },

    toggleUnderline() {
      if (!this.selectedObject) return;

      const newUnderline = !this.textProperties.underline;
      this.textProperties.underline = newUnderline;
      this.selectedObject.set("underline", newUnderline);
      canvas.renderAll();
    },

    updateShadow(property, value) {
      if (!this.selectedObject) return;

      if (!this.selectedObject.shadow) {
        this.selectedObject.setShadow({
          color: this.textProperties.shadowColor,
          blur: this.textProperties.shadowBlur,
          offsetX: this.textProperties.shadowOffsetX,
          offsetY: this.textProperties.shadowOffsetY,
        });
      }

      // Update shadow property
      if (property === "color") {
        this.textProperties.shadowColor = value;
        this.selectedObject.shadow.color = value;
      } else if (property === "blur") {
        this.textProperties.shadowBlur = parseFloat(value);
        this.selectedObject.shadow.blur = parseFloat(value);
      } else if (property === "offsetX") {
        this.textProperties.shadowOffsetX = parseFloat(value);
        this.selectedObject.shadow.offsetX = parseFloat(value);
      } else if (property === "offsetY") {
        this.textProperties.shadowOffsetY = parseFloat(value);
        this.selectedObject.shadow.offsetY = parseFloat(value);
      }

      canvas.renderAll();
    },

    toggleShadow() {
      if (!this.selectedObject) return;

      if (this.textProperties.shadowEnabled) {
        // Add shadow
        this.selectedObject.setShadow({
          color: this.textProperties.shadowColor,
          blur: this.textProperties.shadowBlur,
          offsetX: this.textProperties.shadowOffsetX,
          offsetY: this.textProperties.shadowOffsetY,
        });
      } else {
        // Remove shadow
        this.selectedObject.setShadow(null);
      }

      canvas.renderAll();
    },

    selectFont(font) {
      if (!this.selectedObject) return;

      this.textProperties.fontFamily = font;
      this.selectedObject.set("fontFamily", font);
      canvas.renderAll();
    },

    updateTextCurve(value) {
      // If you have curved text functionality, implement it here
      // This would depend on your curved text implementation
    },

    filterFonts() {
      this.filteredFonts = this.fonts.filter((font) =>
        font.toLowerCase().includes(this.search.toLowerCase())
      );
    },
  };
}

// Curved text specific functionality
export function curvedTextPanel() {
  return {
    curveValue: 2500,
    curveAngle: 0,

    updateCurveFromRange() {
      const value = this.curveValue;
      // Calculate curve angle from range value
      this.curveAngle = Math.floor(((value - 2500) / 2500) * 180);

      // Update text curve based on the angle
      this.updateTextCurve();
    },

    updateCurveFromAngle() {
      // Calculate range value from angle
      this.curveValue = Math.floor(2500 + (this.curveAngle / 180) * 2500);

      // Update text curve based on the angle
      this.updateTextCurve();
    },

    updateTextCurve() {
      const obj = canvas.getActiveObject();
      if (!obj || (obj.type !== "text" && obj.type !== "i-text")) return;

      // Implement actual curved text functionality based on your requirements
      // This could involve setting a custom property or using a curved text extension

      // For example:
      // obj.set('radius', calculateRadius(this.curveAngle));
      // canvas.renderAll();
    },
  };
}
