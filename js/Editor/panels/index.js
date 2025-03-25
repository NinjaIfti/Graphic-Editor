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

// Stand-alone function for activating object properties panel (for backwards compatibility)
export function activeObjPropsPanel(type) {
  if (type === "curved-text") type = "text";

  // Reset all property panels
  const textPanel = document.querySelector(
    `.cn-obj-editing-tools[data-type='text']`
  );
  const imagePanel = document.querySelector(
    `.cn-obj-editing-tools[data-type='image']`
  );
  const shapePanel = document.querySelector(
    `.cn-obj-editing-tools[data-type='shape']`
  );

  textPanel.classList.remove("active");
  imagePanel.classList.remove("active");
  shapePanel.classList.remove("active");

  let panelType = type;

  if (type === "text") {
    textPanel.classList.add("active");
  } else if (type === "image" || type === "shape") {
    panelType = "uploads";

    if (type === "image") {
      imagePanel.classList.add("active");
      QUICK_OPTIONS.crop(true);
    } else {
      shapePanel.classList.add("active");
      QUICK_OPTIONS.crop(false);
    }
  }

  QUICK_OPTIONS.delete(true);
  QUICK_OPTIONS.alignment(true);

  // Simulate click on the panel item
  const panelItem = document.querySelector(
    `.editor-sidebar .tool-item[data-type="${panelType}"]:not(.active)`
  );
  if (panelItem) {
    // Create and dispatch a click event
    const clickEvent = new Event("click", { bubbles: true });
    panelItem.dispatchEvent(clickEvent);
  }

  // Also dispatch the change-tool event for Alpine.js components
  window.dispatchEvent(
    new CustomEvent("change-tool", {
      detail: { type: panelType },
    })
  );
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

// Set up legacy jQuery event handlers if jQuery is available
if (typeof window !== "undefined" && typeof window.$ !== "undefined") {
  const $ = window.$;

  // Tool Item click handler
  $(document).on("click", ".editor-sidebar .tool-item", function () {
    const type = $(this).attr("data-type") || $(this).data("type");
    const $parent = $(".editor-sidebar-panels");
    const $panel = $parent.find(`.single-panel#${type}`);

    $parent.find(".single-panel").not($panel).removeClass("active");
    $(".editor-sidebar .tool-item").not($(this)).removeClass("active");
    $(this).toggleClass("active");
    $panel.toggleClass("active");

    // Drawing Event Listener
    if (type === "drawing") {
      $panel.find('.tab-btn[data-panel="brush"]').trigger("click"); // Active Brush Panel
    } else {
      stopDrawingMode();
    }

    // Dispatch event for Alpine.js components
    window.dispatchEvent(
      new CustomEvent("change-tool", {
        detail: { type },
      })
    );
  });

  // Add Item to canvas - jQuery event handler for backward compatibility
  $(document).on(
    "click",
    ".single-panel.category-panel .media-component .items .item",
    function () {
      const url = $(this).data("url");
      const name = $(this).data("name");
      const category = $(this).data("category");
      const ext = getExtension(name);
      const fileType = ext === "svg" ? "svg" : "image";
      const type = category === "mask" ? "mask" : "image";

      // add svg shape
      const item = {
        fileType: fileType,
        src: url,
        type,
      };

      AddItemToEditor(item); // Add Item To Editor
    }
  );
}
