// js/Editor/plugins/filters.js
import { canvas } from "../app.js";
import { filters } from "fabric";

// Alpine component for image filters
export default function uploadsPanel() {
  return {
    activeFilter: "", // Track the active filter
    filters: {
      brightness: 0,
      contrast: 0,
      blur: 0,
      noise: 0,
      saturation: 0,
      hue: 0,
      pixelate: 2,
    },
    selectedObject: null,
    objectProperties: {},

    init() {
      // Initialize component
      // Listen for canvas selection changes
      if (typeof canvas !== "undefined") {
        canvas.on("selection:created", this.onObjectSelected.bind(this));
        canvas.on("selection:updated", this.onObjectSelected.bind(this));
        canvas.on("selection:cleared", this.onSelectionCleared.bind(this));
      }
    },

    onObjectSelected() {
      this.selectedObject = canvas.getActiveObject();
      if (this.selectedObject && this.selectedObject.type === "image") {
        // Initialize filter values from the object if they exist
        this.updateFilterValuesFromObject();
      }
    },

    onSelectionCleared() {
      this.selectedObject = null;
    },

    updateFilterValuesFromObject() {
      const obj = this.selectedObject;
      if (!obj || obj.type !== "image") return;

      // Reset filter values to default
      this.filters = {
        brightness: 0,
        contrast: 0,
        blur: 0,
        noise: 0,
        saturation: 0,
        hue: 0,
        pixelate: 2,
      };

      // Update values based on active filters
      if (obj.filters[5])
        this.filters.brightness = obj.filters[5].brightness || 0;
      if (obj.filters[6]) this.filters.contrast = obj.filters[6].contrast || 0;
      if (obj.filters[7])
        this.filters.saturation = obj.filters[7].saturation || 0;
      if (obj.filters[9]) this.filters.noise = obj.filters[9].noise || 0;
      if (obj.filters[10])
        this.filters.pixelate = obj.filters[10].blocksize || 2;
      if (obj.filters[11]) this.filters.blur = obj.filters[11].blur || 0;
      if (obj.filters[21]) this.filters.hue = obj.filters[21].rotation || 0;
    },

    applyFilter(filterType, value) {
      if (!this.selectedObject || this.selectedObject.type !== "image") return;

      const obj = this.selectedObject;
      let amountVal = null;

      switch (filterType) {
        case "brightness":
          obj.filters[5] = new filters.Brightness({
            brightness: parseFloat(value),
          });
          break;
        case "contrast":
          obj.filters[6] = new filters.Contrast({
            contrast: parseFloat(value),
          });
          break;
        case "saturation":
          obj.filters[7] = new filters.Saturation({
            saturation: parseFloat(value),
          });
          break;
        case "noise":
          amountVal = value == 0 ? false : true;
          obj.filters[9] =
            amountVal &&
            new filters.Noise({
              noise: parseInt(value, 10),
            });
          break;
        case "pixelate":
          obj.filters[10] = new filters.Pixelate({
            blocksize: parseInt(value, 10),
          });
          break;
        case "blur":
          obj.filters[11] = new filters.Blur({
            value: parseFloat(value),
          });
          if (obj.filters[11]) obj.filters[11].blur = parseFloat(value);
          break;
        case "hue":
          obj.filters[21] = new filters.HueRotation({
            rotation: value,
          });
          break;
        default:
          break;
      }

      obj.applyFilters();
      canvas.renderAll();
    },

    applyPresetFilter(filterName) {
      if (!this.selectedObject || this.selectedObject.type !== "image") return;

      this.activeFilter = filterName;
      const obj = this.selectedObject;
      let filter;

      switch (filterName) {
        case "black_white":
        case "grayscale":
          filter = new filters.Grayscale();
          break;
        case "brownie":
          filter = new filters.Brownie();
          break;
        case "invert":
          filter = new filters.Invert();
          break;
        case "sepia":
          filter = new filters.Sepia();
          break;
        case "kodachrome":
          filter = new filters.Kodachrome();
          break;
        case "technicolor":
          filter = new filters.Technicolor();
          break;
        case "polaroid":
          filter = new filters.Polaroid();
          break;
        case "sharpen":
          filter = new filters.Convolute({
            matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0],
          });
          break;
        case "emboss":
          filter = new filters.Convolute({
            matrix: [1, 1, 1, 1, 0.7, -1, -1, -1, -1],
          });
          break;
        case "vintage":
          filter = new filters.Vintage();
          break;
        default:
          return;
      }

      obj.filters = [filter]; // Apply single filter
      obj.applyFilters();
      canvas.renderAll();
    },

    resetFilters() {
      if (!this.selectedObject || this.selectedObject.type !== "image") return;

      this.activeFilter = "";
      this.selectedObject.filters = [];
      this.selectedObject.applyFilters();
      canvas.renderAll();

      // Reset filter values
      this.filters = {
        brightness: 0,
        contrast: 0,
        blur: 0,
        noise: 0,
        saturation: 0,
        hue: 0,
        pixelate: 2,
      };
    },
  };
}
