// src/components/panels/text-panel.js
export const textPanelComponent = () => ({
  isActive: false,
  selectedObject: null,
  showDistortion: false,
  showShadow: false,
  showCurve: false,
  curveValue: 2500, // Default value (center of the range)
  curveAngle: 0, // Default angle value (no curve)
  isCurved: false, // Tracks if text is curved
  textContent: "", // Initialize textContent property
  fontSearch: "", // Initialize font search
  showFontDropdown: false, // Add missing property for font dropdown

  // For avoiding selectedImage errors (if this component is used alongside an image panel)
  selectedImage: {
    brightness: 1,
    contrast: 1,
    saturation: 1,
    vibrance: 0,
    noise: 0,
    blur: 0,
  },

  // Text properties
  textProperties: {
    fill: "#000000",
    fontFamily: "Roboto",
    fontSize: 40,
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
    shadowColor: "#dddddd",
    shadowBlur: 20,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  },

  // Font list
  fonts: [
    "Roboto",
    "Arial",
    "Times New Roman",
    "Courier New",
    "Georgia",
    "Verdana",
    "Helvetica",
    "Tahoma",
    "Trebuchet MS",
    "Impact",
  ],
  filteredFonts: [],

  init() {
    // Initialize filtered fonts
    this.filteredFonts = [...this.fonts];

    // Listen for tool changes
    window.addEventListener("tool-changed", (e) => {
      this.isActive = e.detail.type === "text";
      console.log("Text tool activated:", this.isActive);
    });

    // Setup Fabric.js event listeners
    if (window.canvas) {
      // Fabric.js 6 uses off() to remove listeners, so we need to ensure clean setup
      // Remove existing listeners to prevent duplicates if component is re-initialized
      window.canvas.off("selection:created", this.handleSelection);
      window.canvas.off("selection:updated", this.handleSelection);
      window.canvas.off("selection:cleared");
      window.canvas.off("text:changed");

      // Add listeners with Fabric.js 6 compatible syntax
      window.canvas.on("selection:created", this.handleSelection.bind(this));
      window.canvas.on("selection:updated", this.handleSelection.bind(this));
      window.canvas.on("selection:cleared", () => {
        console.log("Selection cleared");
        this.selectedObject = null;
        this.textContent = ""; // Clear text content when selection is cleared
        window.dispatchEvent(new CustomEvent("selection:cleared"));
      });

      // Text editing events
      window.canvas.on("text:changed", (e) => {
        console.log("Text changed:", e.target.text);
        if (this.selectedObject && this.selectedObject === e.target) {
          this.textContent = e.target.text; // Update textContent when text changes
        }
      });
    }
  },

  // Handle selection change
  handleSelection(e) {
    // Use Fabric.js 6 getActiveObject with proper error handling
    const activeObject = window.canvas ? window.canvas.getActiveObject() : null;

    if (activeObject) {
      console.log("Selected object type:", activeObject.type);

      // Handle text objects
      if (
        activeObject.type === "i-text" ||
        activeObject.type === "textbox" ||
        activeObject.type === "text"
      ) {
        console.log("Selected text object:", activeObject);
        this.selectedObject = activeObject;
        this.textContent = activeObject.text || "";
        this.syncTextProperties();
        this.isCurved = false;

        // Dispatch event for custom handling
        window.dispatchEvent(
          new CustomEvent("object:selected", {
            detail: {
              type: "text",
              ...this.selectedObject,
            },
          })
        );
      }
      // Handle our custom curved text (groups)
      else if (activeObject.type === "group" && activeObject.curvedText) {
        console.log("Selected curved text group:", activeObject);
        this.selectedObject = activeObject;
        this.isCurved = true;
        this.textContent = activeObject.originalText || "";

        // Sync whatever properties we can
        this.syncTextProperties();

        // Dispatch event for custom handling
        window.dispatchEvent(
          new CustomEvent("object:selected", {
            detail: {
              type: "curved-text",
              ...this.selectedObject,
            },
          })
        );
      }
      // Handle TextCurved objects if the class exists
      else if (activeObject.type === "text-curved") {
        console.log("Selected curved text:", activeObject);
        this.selectedObject = activeObject;
        this.isCurved = true;
        this.textContent = activeObject.text || "";

        // Calculate "curveValue" and "curveAngle" based on diameter
        const diameter = activeObject.diameter || 250;
        this.curveValue = this.getDiameterToValue(diameter);
        this.curveAngle = this.getDiameterToAngle(diameter);

        this.syncTextPropertiesFromCurvedText();

        window.dispatchEvent(
          new CustomEvent("object:selected", {
            detail: {
              type: "curved-text",
              ...this.selectedObject,
            },
          })
        );
      }
    }
  },

  // Convert diameter to UI slider value
  getDiameterToValue(diameter) {
    // Map diameter to our 0-5000 range slider with center at 2500
    // Lower diameter = more curve
    // Higher diameter = less curve
    // Invert the scale since our UI is opposite (higher = more curve)
    return 5000 - diameter * 10;
  },

  // Convert diameter to angle value for UI
  getDiameterToAngle(diameter) {
    // This is a rough approximation - may need adjusting
    return Math.round(360 - diameter / 2);
  },

  // Add pre-built heading
  addHeading(type) {
    if (!window.canvas) return;

    let props = {};

    switch (type) {
      case "full":
        props = {
          text: "Add a heading",
          fontSize: 48,
          fontWeight: "bold",
        };
        break;
      case "sub":
        props = {
          text: "Add a subheading",
          fontSize: 32,
          fontWeight: "normal",
        };
        break;
      case "paragraph":
        props = {
          text: "Add a little bit of body text",
          fontSize: 24,
          fontWeight: "normal",
        };
        break;
    }

    // Use Textbox for better compatibility with Fabric.js 6
    const text = new fabric.Textbox(props.text, {
      left: 100,
      top: 100,
      fontFamily: this.textProperties.fontFamily,
      fontSize: props.fontSize,
      fontWeight: props.fontWeight,
      fill: this.textProperties.fill,
      width: 300, // Added explicit width for Textbox
    });

    window.canvas.add(text);
    window.canvas.setActiveObject(text);
    window.canvas.requestRenderAll(); // Use requestRenderAll in Fabric.js 6

    this.selectedObject = text;
    this.textContent = text.text; // Set textContent when adding heading
    this.syncTextProperties();
  },

  // Rest of the methods for text panel...
  // Update text content from UI
  updateTextContent(value) {
    if (!this.selectedObject || !window.canvas) return;

    this.textContent = value;

    if (
      this.selectedObject.type === "text" ||
      this.selectedObject.type === "i-text" ||
      this.selectedObject.type === "textbox"
    ) {
      // Use setText for Fabric.js 6 to guarantee proper text updating
      this.selectedObject.set("text", value);
      window.canvas.requestRenderAll(); // Use requestRenderAll in Fabric.js 6
    } else if (this.isCurved) {
      if (this.selectedObject.type === "text-curved") {
        // Update the text property of the curved text object
        this.selectedObject.set("text", value);
        window.canvas.requestRenderAll();
      } else if (this.selectedObject.curvedText) {
        // For our custom curved text, we need to rebuild it
        this.selectedObject.originalText = value;

        // Store position for recreating
        const position = {
          left: this.selectedObject.left,
          top: this.selectedObject.top,
        };

        // Remove the current curved text
        window.canvas.remove(this.selectedObject);

        // Create a temporary text object to convert
        const tempText = new fabric.Textbox(value, {
          left: position.left,
          top: position.top,
          fontFamily: this.textProperties.fontFamily,
          fontSize: this.textProperties.fontSize,
          fontWeight: this.textProperties.fontWeight,
          fontStyle: this.textProperties.fontStyle,
          fill: this.textProperties.fill,
          stroke: this.textProperties.stroke,
          strokeWidth: this.textProperties.strokeWidth,
        });

        // Store it temporarily without adding to canvas
        this.selectedObject = tempText;

        // Convert it to curved text
        this.convertToCurvedText();
      }
    }
  },

  // Sync text properties when object is selected
  syncTextProperties() {
    if (!this.selectedObject) return;

    console.log("Syncing text properties for object:", this.selectedObject);
    const obj = this.selectedObject;

    // For our custom curved text groups, we can only get limited properties
    if (obj.curvedText) {
      const firstLetter = obj._objects && obj._objects[0];
      if (firstLetter) {
        this.textProperties = {
          fill: firstLetter.fill || "#000000",
          fontFamily: firstLetter.fontFamily || "Roboto",
          fontSize: firstLetter.fontSize || 40,
          fontWeight: firstLetter.fontWeight || "normal",
          fontStyle: firstLetter.fontStyle || "normal",
          underline: false, // Not supported in curved text
          opacity: obj.opacity || 1,
          stroke: firstLetter.stroke || "#000000",
          strokeWidth: firstLetter.strokeWidth || 0,
          charSpacing: 0, // Not directly accessible in curved text
          rotation: obj.angle || 0,
          skewX: 0, // Not applicable for curved text
          skewY: 0, // Not applicable for curved text
          shadowEnabled: false, // Not easily supported in curved text
          shadowColor: "#dddddd",
          shadowBlur: 20,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
        };
      }
    } else {
      // For regular text objects
      this.textProperties = {
        fill: obj.fill || "#000000",
        fontFamily: obj.fontFamily || "Roboto",
        fontSize: obj.fontSize || 40,
        fontWeight: obj.fontWeight || "normal",
        fontStyle: obj.fontStyle || "normal",
        underline: obj.underline || false,
        opacity: obj.opacity || 1,
        stroke: obj.stroke || "#000000",
        strokeWidth: obj.strokeWidth || 0,
        charSpacing: obj.charSpacing || 0,
        rotation: obj.angle || 0,
        skewX: obj.skewX || 0,
        skewY: obj.skewY || 0,
        shadowEnabled: !!obj.shadow,
        shadowColor: obj.shadow ? obj.shadow.color : "#dddddd",
        shadowBlur: obj.shadow ? obj.shadow.blur : 20,
        shadowOffsetX: obj.shadow ? obj.shadow.offsetX : 0,
        shadowOffsetY: obj.shadow ? obj.shadow.offsetY : 0,
      };
    }

    console.log("Synced text properties:", this.textProperties);
  },

  // Sync properties specifically from curved text object (TextCurved class)
  syncTextPropertiesFromCurvedText() {
    if (!this.selectedObject || this.selectedObject.type !== "text-curved")
      return;

    const obj = this.selectedObject;

    this.textProperties = {
      fill: obj.fill || "#000000",
      fontFamily: obj.fontFamily || "Roboto",
      fontSize: obj.fontSize || 40,
      fontWeight: obj.fontWeight || "normal",
      fontStyle: obj.fontStyle || "normal",
      underline: false, // Not supported by TextCurved
      opacity: obj.opacity || 1,
      stroke: obj.strokeStyle || "#000000", // Note the property name difference
      strokeWidth: obj.strokeWidth || 0,
      charSpacing: obj.kerning || 0, // Note the property name difference
      rotation: obj.angle || 0,
      skewX: 0, // Not directly supported
      skewY: 0, // Not directly supported
      shadowEnabled: false, // Not directly supported
      shadowColor: "#dddddd",
      shadowBlur: 20,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    };
  },

  // Update any object property
  updateObjectProperty(property, value) {
    if (!this.selectedObject || !window.canvas) return;

    // Call the more specific updateTextProperty method
    this.updateTextProperty(property, value);
  },

  // Update any text property
  updateTextProperty(property, value) {
    if (!this.selectedObject || !window.canvas) return;

    console.log(`Updating property ${property} to ${value}`);

    // Convert value types appropriately
    let finalValue = value;
    if (typeof finalValue === "string" && !isNaN(parseFloat(finalValue))) {
      finalValue = parseFloat(finalValue);
    }

    // Store in local properties
    this.textProperties[property] = finalValue;

    // Apply based on text type
    if (this.selectedObject.type === "text-curved") {
      // Map our property names to TextCurved property names
      const propertyMap = {
        fill: "fill",
        fontFamily: "fontFamily",
        fontSize: "fontSize",
        fontWeight: "fontWeight",
        fontStyle: "fontStyle",
        stroke: "strokeStyle", // Different name in TextCurved
        strokeWidth: "strokeWidth",
        charSpacing: "kerning", // Different name in TextCurved
        rotation: "angle",
        // Not all properties are supported by TextCurved
      };

      const curvedProperty = propertyMap[property];
      if (curvedProperty) {
        this.selectedObject.set(curvedProperty, finalValue);
      }
    } else if (this.selectedObject.curvedText) {
      // For our custom curved text, update the property for each letter
      if (this.selectedObject._objects) {
        this.selectedObject._objects.forEach((letter) => {
          if (property !== "rotation") {
            // Don't update rotation for individual letters
            letter.set(property, finalValue);
          }
        });
      }

      // For the group itself, only some properties apply
      if (property === "opacity" || property === "rotation") {
        this.selectedObject.set(
          property === "rotation" ? "angle" : property,
          finalValue
        );
      }

      // Store properties for rebuilding
      if (
        property === "fontFamily" ||
        property === "fontSize" ||
        property === "fontWeight" ||
        property === "fontStyle" ||
        property === "fill" ||
        property === "stroke" ||
        property === "strokeWidth"
      ) {
        // If it's a fundamental property, rebuild the curved text
        this.updateTextCurve(this.curveValue);
      }
    } else {
      // For regular text objects
      this.selectedObject.set(property, finalValue);
    }

    window.canvas.requestRenderAll(); // Use requestRenderAll in Fabric.js 6
    console.log(`Property ${property} updated to ${finalValue}`);
  },

  // Toggle font weight (bold/normal)
  toggleFontWeight() {
    if (!this.selectedObject || !window.canvas) return;

    const newWeight =
      this.textProperties.fontWeight === "bold" ? "normal" : "bold";
    this.textProperties.fontWeight = newWeight;

    if (this.selectedObject.curvedText) {
      // Update each letter in curved text
      this.selectedObject._objects.forEach((letter) => {
        letter.set("fontWeight", newWeight);
      });
      window.canvas.requestRenderAll();

      // Store for rebuilding
      this.updateTextCurve(this.curveValue);
    } else {
      // Update object property
      this.selectedObject.set("fontWeight", newWeight);
      window.canvas.requestRenderAll();
    }
  },

  // Toggle font style (italic/normal)
  toggleFontStyle() {
    if (!this.selectedObject || !window.canvas) return;

    const newStyle =
      this.textProperties.fontStyle === "italic" ? "normal" : "italic";
    this.textProperties.fontStyle = newStyle;

    if (this.selectedObject.curvedText) {
      // Update each letter in curved text
      this.selectedObject._objects.forEach((letter) => {
        letter.set("fontStyle", newStyle);
      });
      window.canvas.requestRenderAll();

      // Store for rebuilding
      this.updateTextCurve(this.curveValue);
    } else {
      // Update object property
      this.selectedObject.set("fontStyle", newStyle);
      window.canvas.requestRenderAll();
    }
  },

  // Toggle underline
  toggleUnderline() {
    if (!this.selectedObject || !window.canvas) return;

    // Underline only applies to regular text, not curved text
    if (
      !this.selectedObject.curvedText &&
      this.selectedObject.type !== "text-curved"
    ) {
      this.textProperties.underline = !this.textProperties.underline;
      this.selectedObject.set("underline", this.textProperties.underline);
      window.canvas.requestRenderAll();
    }
  },

  // Filter fonts based on search
  filterFonts() {
    console.log("Filtering fonts with search:", this.fontSearch);
    if (!this.fontSearch) {
      this.filteredFonts = this.fonts;
      return;
    }

    this.filteredFonts = this.fonts.filter((font) =>
      font.toLowerCase().includes(this.fontSearch.toLowerCase())
    );
    console.log("Filtered fonts:", this.filteredFonts);
  },

  // Select a font
  selectFont(font) {
    if (!this.selectedObject || !window.canvas) return;

    this.textProperties.fontFamily = font;

    if (this.selectedObject.curvedText) {
      // Update each letter in curved text
      this.selectedObject._objects.forEach((letter) => {
        letter.set("fontFamily", font);
      });
      window.canvas.requestRenderAll();

      // Store for rebuilding
      this.updateTextCurve(this.curveValue);
    } else {
      // Update object property
      this.selectedObject.set("fontFamily", font);
      window.canvas.requestRenderAll();
    }
  },

  // Update text rotation
  updateTextRotation() {
    if (!this.selectedObject || !window.canvas) return;

    this.selectedObject.set({
      angle: parseFloat(this.textProperties.rotation),
    });

    window.canvas.requestRenderAll();
  },

  // Toggle shadow on/off
  toggleShadow() {
    if (!this.selectedObject || !window.canvas) return;

    // Curved text doesn't support shadow directly
    if (
      this.selectedObject.curvedText ||
      this.selectedObject.type === "text-curved"
    ) {
      // Maybe show a notification or disable the control
      return;
    }

    this.textProperties.shadowEnabled = !this.textProperties.shadowEnabled;

    if (this.textProperties.shadowEnabled) {
      // Enable shadow - use Fabric.js 6 shadow syntax
      const shadow = new fabric.Shadow({
        color: this.textProperties.shadowColor,
        blur: this.textProperties.shadowBlur,
        offsetX: this.textProperties.shadowOffsetX,
        offsetY: this.textProperties.shadowOffsetY,
      });

      this.selectedObject.set("shadow", shadow);
    } else {
      // Disable shadow
      this.selectedObject.set("shadow", null);
    }

    window.canvas.requestRenderAll();
  },

  // Update shadow properties
  updateShadow(property, value) {
    if (
      !this.selectedObject ||
      !window.canvas ||
      !this.textProperties.shadowEnabled
    )
      return;

    // Curved text doesn't support shadow directly
    if (
      this.selectedObject.curvedText ||
      this.selectedObject.type === "text-curved"
    ) {
      return;
    }

    // Update local state
    const propName = `shadow${
      property.charAt(0).toUpperCase() + property.slice(1)
    }`;
    this.textProperties[propName] =
      property === "color" ? value : parseFloat(value);

    // Create a new shadow with updated properties
    this.selectedObject.set(
      "shadow",
      new fabric.Shadow({
        color: this.textProperties.shadowColor,
        blur: this.textProperties.shadowBlur,
        offsetX: this.textProperties.shadowOffsetX,
        offsetY: this.textProperties.shadowOffsetY,
      })
    );

    window.canvas.requestRenderAll();
  },

  // Get percentage from range value (for UI representation)
  getPercentageFromRange(value) {
    let percentage =
      value >= 2500 ? (value - 2500) / 25 : -((2500 - value) / 25);
    percentage = percentage.toFixed(0);
    if (percentage == -0 || percentage == "-0") percentage = 0;

    // Limit percentage to -90 to 90
    if (percentage > 90) percentage = 90;
    if (percentage < -90) percentage = -90;

    return parseInt(percentage);
  },

  // Get range value from percentage (for UI conversion)
  getRangeFromPercentage(percentage) {
    return percentage >= 0
      ? 2500 + percentage * 25
      : 2500 - Math.abs(percentage) * 25;
  },

  // Calculate diameter from slider value (for TextCurved class)
  getValueToDiameter(value) {
    // Convert 0-5000 range to diameter value (250-500 is typical)
    // Again, we invert the scale
    return Math.max(100, 500 - value / 10);
  },

  // Convert regular text to curved text
  convertToCurvedText() {
    if (!window.canvas || !this.selectedObject) return;

    // Only convert regular text objects
    if (this.isCurved) return;

    const obj = this.selectedObject;
    if (!obj.text) return;

    // Get position, dimensions and properties
    const position = { left: obj.left, top: obj.top };
    const text = obj.text;
    const chars = text.split("");

    // Calculate radius based on curve value
    // When curve is 2500 (center), we want essentially straight text (very large radius)
    let radius = 9999; // Start with essentially straight text
    let curveDirection = 0;

    if (this.curveValue !== 2500) {
      // Map the 0-5000 range to a reasonable radius
      // Higher curveValue = more inward curve (positive angle)
      // Lower curveValue = more outward curve (negative angle)
      const normalizedValue = (this.curveValue - 2500) / 25; // -100 to 100 range

      // Lower absolute value means larger radius (less curve)
      radius = 5000 / Math.abs(normalizedValue);

      // Store the direction: -1 for outward (value < 2500), 1 for inward (value > 2500)
      curveDirection = this.curveValue > 2500 ? 1 : -1;
    }

    // Create letters
    const letters = [];

    // The angle between each letter depends on the radius and number of chars
    const anglePerLetter = 20 / radius;
    const totalAngle = anglePerLetter * (chars.length - 1);
    const startAngle = -totalAngle / 2;

    // Create each letter and position it on the curve
    chars.forEach((char, i) => {
      const angle = startAngle + i * anglePerLetter;

      // Calculate position on circle
      const x = radius * Math.sin(angle);
      const y = radius * Math.cos(angle) * curveDirection * -1;

      // Create text object with all the properties from the original
      const textObject = new fabric.Text(char, {
        fontSize: obj.fontSize,
        fontFamily: obj.fontFamily,
        fontWeight: obj.fontWeight,
        fontStyle: obj.fontStyle,
        fill: obj.fill,
        stroke: obj.stroke,
        strokeWidth: obj.strokeWidth,
        originX: "center",
        originY: "center",
        left: x,
        top: y,
        angle: angle * (180 / Math.PI),
      });

      letters.push(textObject);
    });

    // Create a group from all the letters
    const curvedTextGroup = new fabric.Group(letters, {
      left: position.left,
      top: position.top,
      originX: "center",
      originY: "center",
      selectable: true,
      hasControls: true,
      hasBorders: true,
    });

    // Custom property to identify this as our curved text
    curvedTextGroup.curvedText = true;
    curvedTextGroup.originalText = text;

    // Get the index for z-order
    const objects = window.canvas.getObjects();
    const index = objects.indexOf(obj);

    // Remove original text
    window.canvas.remove(obj);

    // Add curved text
    window.canvas.add(curvedTextGroup);

    // Maintain z-index
    if (index >= 0) {
      window.canvas.remove(curvedTextGroup);
      let currentObjects = window.canvas.getObjects();

      let newObjects = [
        ...currentObjects.slice(0, index),
        curvedTextGroup,
        ...currentObjects.slice(index),
      ];

      window.canvas.clear();
      newObjects.forEach((obj) => window.canvas.add(obj));
    }

    window.canvas.setActiveObject(curvedTextGroup);
    this.selectedObject = curvedTextGroup;

    window.canvas.requestRenderAll();
  },

  // Convert curved text back to regular text
  convertToRegularText() {
    if (!window.canvas || !this.selectedObject) return;

    let obj = this.selectedObject;
    let position = { left: obj.left, top: obj.top };
    let text = "";

    // Handle both our custom curved text and TextCurved objects
    if (obj.curvedText) {
      text = obj.originalText || "";
    } else if (obj.type === "text-curved") {
      text = obj.text || "";
    } else {
      return; // Not a curved text object
    }

    // Get the index for z-order
    const objects = window.canvas.getObjects();
    const index = objects.indexOf(obj);

    // Remove curved text
    window.canvas.remove(obj);

    // Create a new regular text object
    const newText = new fabric.Textbox(text, {
      left: position.left,
      top: position.top,
      fontFamily: this.textProperties.fontFamily,
      fontSize: this.textProperties.fontSize,
      fontWeight: this.textProperties.fontWeight,
      fontStyle: this.textProperties.fontStyle,
      fill: this.textProperties.fill,
      stroke: this.textProperties.stroke,
      strokeWidth: this.textProperties.strokeWidth,
      width: 300,
    });

    // Add new text
    window.canvas.add(newText);

    // Maintain z-index
    if (index >= 0) {
      window.canvas.remove(newText);
      let currentObjects = window.canvas.getObjects();

      let newObjects = [
        ...currentObjects.slice(0, index),
        newText,
        ...currentObjects.slice(index),
      ];

      window.canvas.clear();
      newObjects.forEach((obj) => window.canvas.add(obj));
    }

    window.canvas.setActiveObject(newText);
    this.selectedObject = newText;

    window.canvas.requestRenderAll();
  },

  // Update curve from angle input
  updateCurveFromAngle(angle) {
    if (!window.canvas || !this.selectedObject) return;

    let val = parseInt(angle);

    // Limit angle to -360 to 360
    if (val > 360) val = 360;
    else if (val < -360) val = -360;

    // Convert angle to percentage and then to slider value
    let percentage = (val / 360) * 100;
    if (percentage > 90) percentage = 90;
    else if (percentage < -90) percentage = -90;

    this.curveValue = this.getRangeFromPercentage(percentage);
    this.curveAngle = val;

    // Auto-convert to curved text if needed
    if (
      !this.isCurved &&
      this.selectedObject &&
      (this.selectedObject.type === "text" ||
        this.selectedObject.type === "i-text" ||
        this.selectedObject.type === "textbox")
    ) {
      this.convertToCurvedText();
      this.isCurved = true;
    } else {
      // If already curved, just update the curve
      this.updateTextCurve(this.curveValue);
    }
  },
  updateTextCurve(value) {
    if (!window.canvas || !this.selectedObject) return;

    this.curveValue = parseInt(value);
    let percentage = this.getPercentageFromRange(value);
    this.curveAngle = (percentage * 3.6).toFixed(0);

    // If not curved yet, convert it first
    if (!this.isCurved) {
      if (
        this.selectedObject.type === "text" ||
        this.selectedObject.type === "i-text" ||
        this.selectedObject.type === "textbox"
      ) {
        this.convertToCurvedText();
        this.isCurved = true;
      }
      return;
    }

    // Handle already curved text group
    if (this.selectedObject.curvedText && this.selectedObject._objects) {
      const group = this.selectedObject;
      const text = group.originalText;
      const chars = text.split("");

      // Calculate new curve parameters
      let radius = 9999;
      let curveDirection = 0;

      if (this.curveValue !== 2500) {
        const normalizedValue = (this.curveValue - 2500) / 25;
        radius = 5000 / Math.abs(normalizedValue);
        curveDirection = this.curveValue > 2500 ? 1 : -1;
      }

      // Only proceed if we have the right number of letters
      if (group._objects.length === chars.length) {
        // The angle between each letter depends on the radius and number of chars
        const anglePerLetter = 20 / radius;
        const totalAngle = anglePerLetter * (chars.length - 1);
        const startAngle = -totalAngle / 2;

        // Update each letter position directly
        group._objects.forEach((letter, i) => {
          const angle = startAngle + i * anglePerLetter;

          // Calculate new position on circle
          const x = radius * Math.sin(angle);
          const y = radius * Math.cos(angle) * curveDirection * -1;

          // Update letter properties
          letter.set({
            left: x,
            top: y,
            angle: angle * (180 / Math.PI),
          });
        });

        // Fabric.js 6 way to update group coordinates
        group.dirty = true;
        group.setCoords();

        // Render the changes
        window.canvas.requestRenderAll();
      }
    }
    // Handle TextCurved objects if they exist
    else if (this.selectedObject.type === "text-curved") {
      const diameter = this.getValueToDiameter(value);
      this.selectedObject.set("diameter", diameter);

      if (this.curveAngle < 0 && !this.selectedObject.flipped) {
        this.selectedObject.set("flipped", true);
      } else if (this.curveAngle >= 0 && this.selectedObject.flipped) {
        this.selectedObject.set("flipped", false);
      }

      window.canvas.requestRenderAll();
    }
  },
});
