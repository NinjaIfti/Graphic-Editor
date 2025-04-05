/**
 * Text Panel Component for the Image Editor
 * Manages text editing UI and communicates with the canvas via events
 */
import Alpine from "alpinejs";
export const textPanelComponent = function () {
  return {
    // Panel state
    isActive: false,
    selectedObject: null,

    // UI state for dropdowns and accordions
    showFontDropdown: false,
    showDistortion: false,
    showShadow: false,
    showCurve: false,

    // Text curve properties
    curveValue: 2500,
    curveAngle: 0,

    // Font management
    fontSearch: "",
    availableFonts: [
      "Arial",
      "Helvetica",
      "Times New Roman",
      "Courier New",
      "Georgia",
      "Verdana",
      "Roboto",
      "Open Sans",
      "Lato",
      "Montserrat",
      "Oswald",
      "Raleway",
      "Ubuntu",
    ],
    filteredFonts: [],

    // Text properties model
    textProperties: {
      fill: "#000000",
      fontFamily: "Arial",
      fontSize: 20,
      fontWeight: "normal",
      fontStyle: "normal",
      underline: false,
      opacity: 1,
      stroke: "#000000",
      strokeWidth: 0,
      charSpacing: 0,
      rotation: 0,
      skewX: 0,
      skewY: 0,
      shadowEnabled: false,
      shadowColor: "#000000",
      shadowBlur: 5,
      shadowOffsetX: 5,
      shadowOffsetY: 5,
    },

    /**
     * Initialize the component
     */
    init() {
      // Initialize filtered fonts
      this.filteredFonts = [...this.availableFonts];

      // Set up event listeners
      this.setupEventListeners();
    },

    /**
     * Set up event listeners for communication with the canvas
     */
    setupEventListeners() {
      // Listen for text selection from canvas
      window.addEventListener(
        "text-selected",
        this.handleTextSelected.bind(this)
      );

      // Listen for tool changes
      window.addEventListener(
        "tool-changed",
        this.handleToolChanged.bind(this)
      );

      // The event listeners below are no longer needed since we'll dispatch events directly
      // We're removing this DOMContentLoaded setup to avoid confusion
    },

    /**
     * Helper method to call a method on the canvasManager via events
     * @param {String} methodName - Name of method to call
     * @param {Array} args - Arguments to pass to method
     */
    callCanvasManagerMethod(methodName, args) {
      // Direct event dispatch approach
      window.dispatchEvent(
        new CustomEvent(`canvas:${methodName}`, {
          detail: { args },
        })
      );
    },

    /**
     * Handle text selection events from the canvas
     * @param {CustomEvent} e - The text selection event
     */
    handleTextSelected(e) {
      if (e.detail.type === "text") {
        this.selectedObject = true;
        this.updatePropertiesFromSelectedObject(e.detail.object);
      } else {
        this.selectedObject = null;
      }
    },

    /**
     * Handle tool changed events
     * @param {CustomEvent} e - The tool changed event
     */
    handleToolChanged(e) {
      this.isActive = e.detail.type === "text";
    },

    /**
     * Update UI properties from the selected text object
     * @param {Object} obj - The selected fabric.js text object
     */
    updatePropertiesFromSelectedObject(obj) {
      // Update text properties from selected object
      this.textProperties = {
        fill: this.convertToHex(obj.fill) || "#000000",
        fontFamily: obj.fontFamily || "Arial",
        fontSize: obj.fontSize || 20,
        fontWeight: obj.fontWeight || "normal",
        fontStyle: obj.fontStyle || "normal",
        underline: obj.underline || false,
        opacity: obj.opacity !== undefined ? obj.opacity : 1,
        stroke: this.convertToHex(obj.stroke) || "#000000",
        strokeWidth: obj.strokeWidth || 0,
        charSpacing: obj.charSpacing || 0,
        rotation: obj.angle || 0,
        skewX: obj.skewX || 0,
        skewY: obj.skewY || 0,
        shadowEnabled: !!obj.shadow,
        shadowColor: obj.shadow
          ? this.convertToHex(obj.shadow.color)
          : "#000000",
        shadowBlur: obj.shadow ? obj.shadow.blur : 5,
        shadowOffsetX: obj.shadow ? obj.shadow.offsetX : 5,
        shadowOffsetY: obj.shadow ? obj.shadow.offsetY : 5,
      };

      // Update curve value based on skew
      this.updateCurveFromSkew(obj.skewX);
    },

    /**
     * Convert RGB/RGBA color to HEX
     * @param {String} color - RGB or HEX color value
     * @returns {String} HEX color
     */
    convertToHex(color) {
      if (!color) return "#000000";
      if (color.startsWith("#")) return color;

      // Extract RGB values
      const rgbMatch = color.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/
      );
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        return `#${((1 << 24) + (r << 16) + (g << 8) + b)
          .toString(16)
          .slice(1)}`;
      }

      return "#000000";
    },

    /**
     * Update curve values based on skew
     * @param {Number} skewX - The skew X value
     */
    updateCurveFromSkew(skewX) {
      if (skewX) {
        this.curveValue = 2500 + skewX * 50;
        this.curveAngle = skewX;
      } else {
        this.curveValue = 2500;
        this.curveAngle = 0;
      }
    },

    /**
     * Add text to the canvas
     * @param {String} type - The type of text to add (defaults to 'paragraph' if not specified)
     */
    addText(type = "paragraph") {
      this.callCanvasManagerMethod("addText", [type]);
    },

    /**
     * Add heading text to the canvas (for backward compatibility)
     * @param {String} type - The type of heading ('full', 'sub', 'paragraph')
     */
    addHeading(type) {
      this.addText(type);
    },

    /**
     * Update a text property on the canvas
     * @param {String} property - The property name to update
     * @param {*} value - The new value
     */
    updateTextProperty(property, value) {
      this.callCanvasManagerMethod("updateTextProperty", [property, value]);
    },

    /**
     * Update text rotation on the canvas
     */
    updateTextRotation() {
      this.callCanvasManagerMethod("updateTextRotation", [
        this.textProperties.rotation,
      ]);
    },

    /**
     * Toggle font weight (bold/normal)
     */
    toggleFontWeight() {
      this.textProperties.fontWeight =
        this.textProperties.fontWeight === "bold" ? "normal" : "bold";
      this.callCanvasManagerMethod("toggleFontWeight", []);
    },

    /**
     * Toggle font style (italic/normal)
     */
    toggleFontStyle() {
      this.textProperties.fontStyle =
        this.textProperties.fontStyle === "italic" ? "normal" : "italic";
      this.callCanvasManagerMethod("toggleFontStyle", []);
    },

    /**
     * Toggle text underline
     */
    toggleUnderline() {
      this.textProperties.underline = !this.textProperties.underline;
      this.callCanvasManagerMethod("toggleUnderline", []);
    },

    /**
     * Toggle shadow on text
     */
    toggleShadow() {
      this.callCanvasManagerMethod("toggleShadow", [
        this.textProperties.shadowEnabled,
      ]);
    },

    /**
     * Update a shadow property
     * @param {String} property - The shadow property to update
     * @param {*} value - The new value
     */
    updateShadow(property, value) {
      this.callCanvasManagerMethod("updateShadow", [property, value]);
    },

    /**
     * Filter fonts based on search input
     */
    filterFonts() {
      if (!this.fontSearch) {
        this.filteredFonts = [...this.availableFonts];
      } else {
        const search = this.fontSearch.toLowerCase();
        this.filteredFonts = this.availableFonts.filter((font) =>
          font.toLowerCase().includes(search)
        );
      }
    },

    /**
     * Select a font
     * @param {String} font - The font name
     */
    selectFont(font) {
      this.textProperties.fontFamily = font;
      this.updateTextProperty("fontFamily", font);
      this.showFontDropdown = false;
    },

    /**
     * Update text curve
     * @param {Number} value - Curve value
     */
    updateTextCurve(value) {
      // Just set local state and dispatch event
      this.curveValue = value;

      // Calculate angle from curve value
      this.curveAngle = (value - 2500) / 50;

      // Dispatch event to fabric.js
      this.callCanvasManagerMethod("updateTextCurve", [value]);
    },

    /**
     * Update curve from angle input
     * @param {Number} angle - Angle value
     */
    updateCurveFromAngle(angle) {
      const value = 2500 + angle * 50;
      this.curveValue = value;
      this.updateTextCurve(value);
    },

    /**
     * Get percentage display from curve range value
     * @param {Number} value - Curve value
     * @returns {Number} Percentage
     */
    getPercentageFromRange(value) {
      return Math.round(Math.abs(((value - 2500) / 2500) * 100));
    },
  };
};
