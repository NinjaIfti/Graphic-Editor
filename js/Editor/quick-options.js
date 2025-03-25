// js/Editor/quick-options.js
import { canvas } from "./app.js";
import { alignmentObject } from "./plugins/alignment.js";

// Create an Alpine.js compatible structure for Quick Options
const QUICK_OPTIONS = {
  // These functions will be refactored to work with Alpine's state management
  delete: function (toggle) {
    // Will be handled through Alpine's x-bind:disabled
    document.dispatchEvent(
      new CustomEvent("quick-option-delete", {
        detail: { enabled: toggle },
      })
    );
  },
  alignment: function (toggle) {
    document.dispatchEvent(
      new CustomEvent("quick-option-alignment", {
        detail: { enabled: toggle },
      })
    );
  },
  crop: function (toggle) {
    document.dispatchEvent(
      new CustomEvent("quick-option-crop", {
        detail: { enabled: toggle },
      })
    );
  },
};

// Define the Alpine component that will control quick options bar
document.addEventListener("alpine:init", () => {
  Alpine.data("quickOptionsBar", () => ({
    hasSelection: false,
    canCrop: false,
    cropActive: false,

    init() {
      // Listen for canvas events that affect the quick options bar
      document.addEventListener("update-quick-options", (e) => {
        this.hasSelection = e.detail.hasSelection;
        this.canCrop = e.detail.canCrop;
      });

      document.addEventListener("crop-active-change", (e) => {
        this.cropActive = e.detail.active;
      });
    },

    // Delete selected object
    deleteSelected() {
      let obj = canvas.getActiveObject();
      if (!obj) return;

      const id = obj.id;
      // Dispatch event for layers panel to handle deletion
      document.dispatchEvent(
        new CustomEvent("delete-layer", {
          detail: { id: id },
        })
      );
    },

    // Align objects in canvas
    alignObjects(type) {
      let obj = canvas.getActiveObject();
      if (!obj) return false;

      alignmentObject(type, obj);
      obj.setCoords();
      canvas.setActiveObject(obj);
      canvas.renderAll();
    },

    // Crop functions - these will interact with crop.js plugin
    startCrop() {
      document.dispatchEvent(new CustomEvent("start-crop", {}));
      this.cropActive = true;
    },

    applyCrop() {
      document.dispatchEvent(new CustomEvent("apply-crop", {}));
      this.cropActive = false;
    },

    resetCrop() {
      document.dispatchEvent(new CustomEvent("reset-crop", {}));
      this.cropActive = false;
    },
  }));
});

export { QUICK_OPTIONS };
