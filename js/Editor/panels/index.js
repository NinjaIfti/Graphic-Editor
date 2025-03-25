// js/Editor/panels/index.js
import { AddItemToEditor } from "../Editor.js";
import { stopDrawingMode } from "./drawing.js";
import { QUICK_OPTIONS } from "../quick-options.js";
import { getExtension } from "../../Functions/functions.js";

// Main Alpine.js component for panel management
export function panelManager() {
  return {
    activePanel: "templates", // Default active panel

    init() {
      // Setup listeners for object selection changes
      if (typeof window.canvas !== "undefined") {
        window.canvas.on(
          "selection:created",
          this.handleObjectSelection.bind(this)
        );
        window.canvas.on(
          "selection:updated",
          this.handleObjectSelection.bind(this)
        );
        window.canvas.on(
          "selection:cleared",
          this.handleSelectionCleared.bind(this)
        );
      }

      // Listen for panel change events from other components
      window.addEventListener("change-tool", (event) => {
        this.activatePanel(event.detail.type);
      });
    },

    activatePanel(type) {
      if (type === "drawing") {
        // Handle drawing panel activation
        this.activePanel = type;
        // We'll need to trigger the brush tab activation via an event
        this.$nextTick(() => {
          window.dispatchEvent(
            new CustomEvent("activate-drawing-tab", {
              detail: { tab: "brush" },
            })
          );
        });
      } else {
        // For non-drawing panels, just switch the panel
        this.activePanel = type;
        // Stop drawing mode when switching to a non-drawing panel
        stopDrawingMode();
      }
    },

    handleObjectSelection() {
      const selectedObj = window.canvas.getActiveObject();
      if (!selectedObj) return;

      let type = selectedObj.type;

      // Handle curved text as regular text
      if (type === "curved-text") type = "text";

      this.activatePropertiesPanel(type);
    },

    handleSelectionCleared() {
      // Reset quick options when nothing is selected
      QUICK_OPTIONS.delete(false);
      QUICK_OPTIONS.alignment(false);

      // Hide all property panels
      document.querySelectorAll(".cn-obj-editing-tools").forEach((el) => {
        el.classList.remove("active");
      });
    },

    activatePropertiesPanel(type) {
      // Reset all property panels
      document.querySelectorAll(".cn-obj-editing-tools").forEach((el) => {
        el.classList.remove("active");
      });

      // Enable the appropriate panel based on object type
      if (type === "text") {
        document
          .querySelector(`.cn-obj-editing-tools[data-type='text']`)
          .classList.add("active");
        // Activate the text panel
        this.activePanel = "text";
      } else if (type === "image" || type === "shape") {
        // For both image and shape, activate the uploads panel
        this.activePanel = "uploads";

        if (type === "image") {
          document
            .querySelector(`.cn-obj-editing-tools[data-type='image']`)
            .classList.add("active");
          QUICK_OPTIONS.crop(true);
        } else {
          document
            .querySelector(`.cn-obj-editing-tools[data-type='shape']`)
            .classList.add("active");
          QUICK_OPTIONS.crop(false);
        }
      }

      // Enable quick options
      QUICK_OPTIONS.delete(true);
      QUICK_OPTIONS.alignment(true);

      // Dispatch event to update panel
      window.dispatchEvent(
        new CustomEvent("change-tool", {
          detail: { type: this.activePanel },
        })
      );
    },
  };
}

// Add item component for category panels
export function categoryPanels() {
  return {
    addItemToCanvas(url, name, category) {
      const ext = getExtension(name);
      const fileType = ext === "svg" ? "svg" : "image";
      const type = category === "mask" ? "mask" : "image";

      // Prepare item data
      const item = {
        fileType: fileType,
        src: url,
        type,
      };

      // Add item to editor
      AddItemToEditor(item);
    },
  };
}
