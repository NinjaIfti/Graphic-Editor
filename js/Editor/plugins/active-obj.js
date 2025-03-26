import { Rect } from "fabric";
import { getRangeFromPercentage } from "./curve-text.js";
import { activeObjPropsPanel } from "../panels/index.js";
import Alpine from "alpinejs";

// Store the active object properties
let activeObjectProperties = {};

function fillActiveObjPropsInputs(canvas) {
  let obj = canvas.getActiveObject();
  if (!obj || !obj.originalItem || obj.originalItem.type === "group") {
    return false;
  }

  let panelId = obj.originalItem.class == "text" ? "text" : "uploads";

  document.dispatchEvent(
    new CustomEvent("active-object-changed", {
      detail: {
        object: obj,
        panelId: panelId,
        properties: getObjectProperties(obj),
      },
    })
  );

  return true;
}

function getObjectProperties(obj) {
  if (!obj) return {};

  let properties = {
    type: obj.type,
    originalType: obj.originalItem?.class,
    id: obj.id,
    fill: obj.fill,
    opacity: obj.opacity,
    stroke: obj.type === "curved-text" ? obj.strokeStyle : obj.stroke,
    strokeWidth: obj.strokeWidth,
    fontFamily: obj.fontFamily,
    fontSize: obj.fontSize,
    fontWeight: obj.fontWeight,
    fontStyle: obj.fontStyle,
    underline: obj.underline,
    charSpacing: obj.type === "curved-text" ? obj.kerning : obj.charSpacing,
    angle: obj.angle,
    scaleX: obj.scaleX,
    scaleY: obj.scaleY,
    skewX: obj.skewX,
    skewY: obj.skewY,
  };

  if (obj.shadow) {
    properties.shadowEnabled = true;
    properties.shadowColor = obj.shadow.color;
    properties.shadowBlur = obj.shadow.blur;
    properties.shadowOffsetX = obj.shadow.offsetX;
    properties.shadowOffsetY = obj.shadow.offsetY;
  } else {
    properties.shadowEnabled = false;
  }

  return properties;
}

const activeObjPropSet = (canvas, properties = {}, targetType = null) => {
  let activeObj = canvas.getActiveObject();
  if (!activeObj) return false;

  if (targetType && activeObj.type != targetType) return false;

  let objects = activeObj._objects ? activeObj._objects : [activeObj];

  Array.from(objects).forEach((obj) => {
    for (let key in properties) {
      let value = properties[key];
      if (typeof value == "function") properties[key] = value(obj);
      if (properties[key] === undefined) delete properties[key];
    }

    obj.set(properties);
    if (obj.type == "curved-text") {
      obj.refreshCtx(true);
      obj._updateObj("scaleX", obj.scaleX);
      obj._updateObj("scaleY", obj.scaleY);
    }
  });

  canvas.renderAll();

  document.dispatchEvent(
    new CustomEvent("object-properties-updated", {
      detail: { object: activeObj },
    })
  );
};

function initObjectEvents(canvas) {
  let events = ["moving", "scaling", "rotating", "skewing", "resizing"];
  events.forEach((event) => {
    canvas.on(`object:${event}`, function (e) {
      let obj = e.target;

      if (obj.type == "curved-text" && event !== "moving") {
        document.dispatchEvent(
          new CustomEvent("curved-text-updated", {
            detail: {
              percentage: getRangeFromPercentage(obj.percentage),
              rotateAngle: obj.rotateAngle || 0,
            },
          })
        );

        obj.refreshCtx(true);
        obj._updateObj("scaleX", obj.scaleX);
        obj._updateObj("scaleY", obj.scaleY);
      }

      fillActiveObjPropsInputs(canvas);
    });
  });
}

const createdAndUpdatedProp = (canvas, e) => {
  let obj = canvas.getActiveObject();
  if (!obj) {
    document.dispatchEvent(new CustomEvent("active-object-cleared"));
    return false;
  }

  activeObjPropsPanel(obj.originalItem?.class);
  fillActiveObjPropsInputs(canvas);

  document.dispatchEvent(
    new CustomEvent("selection-created", {
      detail: {
        object: obj,
        type: obj.originalItem?.class || obj.type,
      },
    })
  );
};

function setupCanvasEventListeners(canvas) {
  canvas.on("selection:created", function (e) {
    createdAndUpdatedProp(canvas, e);
  });

  canvas.on("selection:updated", function (e) {
    createdAndUpdatedProp(canvas, e);
  });

  canvas.on("selection:cleared", function () {
    createdAndUpdatedProp(canvas);
  });
}

// Alpine components
document.addEventListener("alpine:init", () => {
  Alpine.data("textPanel", () => ({
    isActive: false,
    selectedObject: null,
    textProperties: {
      fill: "#262626",
      fontFamily: "sans-serif",
      fontSize: 40,
      fontWeight: "normal",
      fontStyle: "normal",
      underline: false,
      charSpacing: 0,
      opacity: 1,
      stroke: "#000000",
      strokeWidth: 0,
      skewX: 0,
      skewY: 0,
      rotation: 0,
      shadowEnabled: false,
      shadowColor: "#000000",
      shadowBlur: 5,
      shadowOffsetX: 5,
      shadowOffsetY: 5,
    },
    // ... (rest of the properties unchanged)

    init() {
      document.addEventListener("active-object-changed", (e) => {
        if (e.detail.panelId === "text") {
          this.selectedObject = e.detail.object;
          this.updateTextProperties(e.detail.properties);
        } else {
          this.selectedObject = null;
        }
      });

      document.addEventListener("active-object-cleared", () => {
        this.selectedObject = null;
      });

      document.addEventListener("change-tool", (e) => {
        this.isActive = e.detail.type === "text";
      });
    },

    updateObjectProperty(canvas, prop, value) {
      if (!this.selectedObject) return;
      const updateProps = { [prop]: value };
      activeObjPropSet(canvas, updateProps);
      this.textProperties[prop] = value;
    },

    toggleFontWeight(canvas) {
      if (!this.selectedObject) return;
      const newWeight =
        this.textProperties.fontWeight === "bold" ? "normal" : "bold";
      this.updateObjectProperty(canvas, "fontWeight", newWeight);
    },

    toggleFontStyle(canvas) {
      if (!this.selectedObject) return;
      const newStyle =
        this.textProperties.fontStyle === "italic" ? "normal" : "italic";
      this.updateObjectProperty(canvas, "fontStyle", newStyle);
    },

    toggleUnderline(canvas) {
      if (!this.selectedObject) return;
      const newValue = !this.textProperties.underline;
      this.updateObjectProperty(canvas, "underline", newValue);
    },

    // ... (other methods unchanged, with `canvas` added where needed)
  }));

  Alpine.data("uploadsPanel", () => ({
    isActive: false,
    selectedObject: null,
    // ... (rest of the properties unchanged)

    init() {
      document.addEventListener("active-object-changed", (e) => {
        if (e.detail.panelId === "uploads") {
          this.selectedObject = e.detail.object;
          this.updateObjectProperties(e.detail.properties);
        } else {
          this.selectedObject = null;
        }
      });

      document.addEventListener("active-object-cleared", () => {
        this.selectedObject = null;
      });

      document.addEventListener("change-tool", (e) => {
        this.isActive = e.detail.type === "uploads";
      });
    },

    updateObjectProperty(canvas, prop, value) {
      if (!this.selectedObject) return;
      const updateProps = { [prop]: value };
      activeObjPropSet(canvas, updateProps);
      this.objectProperties[prop] = value;
    },

    updateObjectProperty(prop, value) {
      if (!this.selectedObject) return;

      const updateProps = {
        [prop]: value,
      };

      activeObjPropSet(updateProps);

      // Update local state
      this.textProperties[prop] = value;
    },

    toggleFontWeight() {
      if (!this.selectedObject) return;

      const newWeight =
        this.textProperties.fontWeight === "bold" ? "normal" : "bold";
      this.updateObjectProperty("fontWeight", newWeight);
    },

    toggleFontStyle() {
      if (!this.selectedObject) return;

      const newStyle =
        this.textProperties.fontStyle === "italic" ? "normal" : "italic";
      this.updateObjectProperty("fontStyle", newStyle);
    },

    toggleUnderline() {
      if (!this.selectedObject) return;

      const newValue = !this.textProperties.underline;
      this.updateObjectProperty("underline", newValue);
    },

    updateTextCurve(value) {
      if (!this.selectedObject || this.selectedObject.type !== "curved-text")
        return;

      // Handle curved text update
      // You'll need to implement this based on your curved text functionality
    },

    selectFont(font) {
      this.textProperties.fontFamily = font;

      if (this.selectedObject) {
        this.updateObjectProperty("fontFamily", font);
      }
    },

    filterFonts() {
      // Filter fonts based on search - this would be implemented in your component
    },

    toggleShadow() {
      if (!this.selectedObject) return;

      if (this.textProperties.shadowEnabled) {
        this.updateObjectProperty("shadow", {
          color: this.textProperties.shadowColor,
          blur: parseInt(this.textProperties.shadowBlur),
          offsetX: parseInt(this.textProperties.shadowOffsetX),
          offsetY: parseInt(this.textProperties.shadowOffsetY),
        });
      } else {
        this.updateObjectProperty("shadow", null);
      }
    },

    updateShadow(type, value) {
      if (!this.selectedObject || !this.textProperties.shadowEnabled) return;

      this.textProperties[
        "shadow" + type.charAt(0).toUpperCase() + type.slice(1)
      ] = value;

      this.updateObjectProperty("shadow", {
        color: this.textProperties.shadowColor,
        blur: parseInt(this.textProperties.shadowBlur),
        offsetX: parseInt(this.textProperties.shadowOffsetX),
        offsetY: parseInt(this.textProperties.shadowOffsetY),
      });
    },
  }));

  // Component for upload/image properties panel - similar structure to text panel
  Alpine.data("uploadsPanel", () => ({
    isActive: false,
    selectedObject: null,
    uploads: [],
    objectProperties: {
      opacity: 1,
      stroke: "#000000",
      strokeWidth: 0,
      skewX: 0,
      skewY: 0,
      radius: 0,
      fill: "#ffffff",
      shadowEnabled: false,
      shadowColor: "#000000",
      shadowBlur: 5,
      shadowOffsetX: 5,
      shadowOffsetY: 5,
    },
    filters: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      blur: 0,
      noise: 0,
      pixelate: 0,
      hue: 0,
    },
    activeFilter: "",
    showDistortion: false,
    showShadow: false,

    init() {
      // Listen for active object changes
      document.addEventListener("active-object-changed", (e) => {
        if (e.detail.panelId === "uploads") {
          this.selectedObject = e.detail.object;
          this.updateObjectProperties(e.detail.properties);
        } else {
          this.selectedObject = null;
        }
      });

      document.addEventListener("active-object-cleared", () => {
        this.selectedObject = null;
      });

      document.addEventListener("change-tool", (e) => {
        this.isActive = e.detail.type === "uploads";
      });
    },

    updateObjectProperties(props) {
      if (!props) return;

      this.objectProperties = {
        ...this.objectProperties,
        ...props,
      };
    },

    handleFileUpload(event) {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      // Process each file
      Array.from(files).forEach((file) => {
        // Create a URL for the file
        const url = URL.createObjectURL(file);

        // Add to uploads array
        this.uploads.push({
          id: Date.now() + Math.random().toString(36).substr(2, 9),
          url: url,
          name: file.name,
          type: file.type,
        });

        // Create image upload element
        this.createUploadElement(url, file.name, file.type);
      });
    },

    createUploadElement(url, name, type) {
      // Create DOM element for the upload preview
      // This would be handled by Alpine template rendering
    },

    addImageToCanvas(upload) {
      const item = {
        src: upload.url,
        type: "image",
        fileType: "image",
      };

      const properties = {
        left: canvas.width / 2,
        top: canvas.height / 2,
      };

      window.AddItemToEditor(item, properties);
    },

    updateObjectProperty(prop, value) {
      if (!this.selectedObject) return;

      const updateProps = {
        [prop]: value,
      };

      activeObjPropSet(updateProps);

      // Update local state
      this.objectProperties[prop] = value;
    },

    applyFilter(filterName, value) {
      if (!this.selectedObject) return;

      this.filters[filterName] = value;

      // Apply filters to the object
      // This will depend on your filter implementation
    },

    applyPresetFilter(filterName) {
      if (!this.selectedObject) return;

      this.activeFilter = filterName;

      // Apply preset filter to the object
      // This will depend on your filter implementation
    },

    resetFilters() {
      if (!this.selectedObject) return;

      this.activeFilter = "";

      // Reset all filters
      Object.keys(this.filters).forEach((key) => {
        this.filters[key] = 0;
      });

      // Apply reset to the object
    },

    updateClipPath(value) {
      if (!this.selectedObject) return;

      this.objectProperties.radius = value;

      // Apply clip path based on radius
      const obj = this.selectedObject;

      if (obj.originalItem.class === "shape") {
        let objWidth = obj.width + obj.height,
          radiusPer = (value * objWidth) / 100;

        activeObjPropSet({
          rx: radiusPer / obj.scaleX,
          ry: radiusPer / obj.scaleY,
        });
      } else {
        const clipFunc = (target) => {
          let objWidth = target.width + target.height,
            radiusPer = (value * objWidth) / 100;

          let svg = new Rect({
            width: target.width,
            height: target.height,
            rx: radiusPer / target.scaleX,
            ry: radiusPer / target.scaleY,
            left: -target.width / 2,
            top: -target.height / 2,
            objectCaching: false,
            dirty: true,
          });
          return svg;
        };

        activeObjPropSet({
          clipPath: clipFunc,
        });
      }
    },

    toggleShadow() {
      if (!this.selectedObject) return;

      if (this.objectProperties.shadowEnabled) {
        this.updateObjectProperty("shadow", {
          color: this.objectProperties.shadowColor,
          blur: parseInt(this.objectProperties.shadowBlur),
          offsetX: parseInt(this.objectProperties.shadowOffsetX),
          offsetY: parseInt(this.objectProperties.shadowOffsetY),
        });
      } else {
        this.updateObjectProperty("shadow", null);
      }
    },

    updateShadow(type, value) {
      if (!this.selectedObject || !this.objectProperties.shadowEnabled) return;

      this.objectProperties[
        "shadow" + type.charAt(0).toUpperCase() + type.slice(1)
      ] = value;

      this.updateObjectProperty("shadow", {
        color: this.objectProperties.shadowColor,
        blur: parseInt(this.objectProperties.shadowBlur),
        offsetX: parseInt(this.objectProperties.shadowOffsetX),
        offsetY: parseInt(this.objectProperties.shadowOffsetY),
      });
    },
  }));
});

export {
  activeObjPropSet,
  fillActiveObjPropsInputs,
  initObjectEvents,
  setupCanvasEventListeners,
};
