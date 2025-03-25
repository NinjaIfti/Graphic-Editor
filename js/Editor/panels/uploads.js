// js/Editor/panels/uploads.js
import { SVG_ICONS } from "../app.js";
import {
  isImageFile,
  getExtension,
  getRand,
  getBase64,
} from "../../Functions/functions.js";
import { AddItemToEditor } from "../Editor.js";

// Alpine.js component for uploads panel
export function uploadsPanel() {
  return {
    isActive: false,
    uploads: [],
    selectedObject: null,
    objectProperties: {
      opacity: 1,
      stroke: "#000000",
      strokeWidth: 0,
      radius: 0,
      skewX: 0,
      skewY: 0,
      shadowEnabled: false,
      shadowColor: "#000000",
      shadowBlur: 5,
      shadowOffsetX: 5,
      shadowOffsetY: 5,
    },
    activeFilter: "",
    filters: {
      brightness: 0,
      contrast: 0,
      blur: 0,
      noise: 0,
      saturation: 0,
      hue: 0,
      pixelate: 2,
    },
    showDistortion: false,
    showShadow: false,

    init() {
      // Listen for tool panel changes
      window.addEventListener("change-tool", (event) => {
        this.isActive = event.detail.type === "uploads";
      });

      // Listen for canvas object selection
      if (typeof window.canvas !== "undefined") {
        window.canvas.on("selection:created", this.onObjectSelected.bind(this));
        window.canvas.on("selection:updated", this.onObjectSelected.bind(this));
        window.canvas.on(
          "selection:cleared",
          this.onSelectionCleared.bind(this)
        );
      }
    },

    onObjectSelected() {
      const obj = window.canvas.getActiveObject();
      if (obj && (obj.type === "image" || obj.type === "shape")) {
        this.selectedObject = obj;
        this.updateObjectPropertiesFromSelection(obj);
      }
    },

    onSelectionCleared() {
      this.selectedObject = null;
    },

    updateObjectPropertiesFromSelection(obj) {
      // Update property controls based on selected object
      this.objectProperties = {
        opacity: obj.opacity !== undefined ? obj.opacity : 1,
        stroke: obj.stroke || "#000000",
        strokeWidth: obj.strokeWidth || 0,
        radius: obj.radius || 0,
        skewX: obj.skewX || 0,
        skewY: obj.skewY || 0,
        shadowEnabled: !!obj.shadow,
        shadowColor: obj.shadow ? obj.shadow.color : "#000000",
        shadowBlur: obj.shadow ? obj.shadow.blur : 5,
        shadowOffsetX: obj.shadow ? obj.shadow.offsetX : 5,
        shadowOffsetY: obj.shadow ? obj.shadow.offsetY : 5,
      };
    },

    async handleFileUpload(event) {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);

      for (let i = 0; i < fileArray.length; i++) {
        await this.addFileToUploads(fileArray[i]);
      }

      // Reset file input value
      event.target.value = "";
    },

    async addFileToUploads(file) {
      if (!isImageFile(file)) return;

      const filename = file.name;
      const ext = getExtension(filename);
      const fileId = getRand(30);
      const src = await getBase64(file);
      const fileType = ext === "svg" ? "svg" : "image";

      // Add file to uploads array
      this.uploads.unshift({
        id: fileId,
        name: filename,
        src: src,
        fileType: fileType,
      });
    },

    async addToCanvas(upload) {
      if (!upload) return;

      await AddItemToEditor(
        {
          type: "image",
          fileType: upload.fileType,
          src: upload.src,
        },
        {
          radius: 0,
        }
      );
    },

    deleteUpload(uploadId) {
      this.uploads = this.uploads.filter((upload) => upload.id !== uploadId);
    },

    updateObjectProperty(property, value) {
      if (!this.selectedObject) return;

      this.selectedObject.set(property, value);
      window.canvas.renderAll();
    },

    updateClipPath(value) {
      if (!this.selectedObject) return;

      this.objectProperties.radius = parseInt(value);
      this.selectedObject.set("radius", parseInt(value));
      window.canvas.renderAll();
    },

    updateShadow(property, value) {
      if (!this.selectedObject) return;

      if (!this.selectedObject.shadow) {
        this.selectedObject.setShadow({
          color: this.objectProperties.shadowColor,
          blur: this.objectProperties.shadowBlur,
          offsetX: this.objectProperties.shadowOffsetX,
          offsetY: this.objectProperties.shadowOffsetY,
        });
      }

      // Update shadow property
      if (property === "color") {
        this.objectProperties.shadowColor = value;
        this.selectedObject.shadow.color = value;
      } else if (property === "blur") {
        this.objectProperties.shadowBlur = parseFloat(value);
        this.selectedObject.shadow.blur = parseFloat(value);
      } else if (property === "offsetX") {
        this.objectProperties.shadowOffsetX = parseFloat(value);
        this.selectedObject.shadow.offsetX = parseFloat(value);
      } else if (property === "offsetY") {
        this.objectProperties.shadowOffsetY = parseFloat(value);
        this.selectedObject.shadow.offsetY = parseFloat(value);
      }

      window.canvas.renderAll();
    },

    toggleShadow() {
      if (!this.selectedObject) return;

      if (this.objectProperties.shadowEnabled) {
        // Add shadow
        this.selectedObject.setShadow({
          color: this.objectProperties.shadowColor,
          blur: this.objectProperties.shadowBlur,
          offsetX: this.objectProperties.shadowOffsetX,
          offsetY: this.objectProperties.shadowOffsetY,
        });
      } else {
        // Remove shadow
        this.selectedObject.setShadow(null);
      }

      window.canvas.renderAll();
    },
  };
}
