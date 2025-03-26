// js/Editor/plugins/context-menu.js
import Alpine from "alpinejs";

import { canvas } from "../app.js";
import { toBoolean } from "../../Functions/functions.js";
import {
  createObjectsGroup,
  unGroupObjects,
  activeObjPositionChange,
} from "../functions.js";

// Initialize context menu state
document.addEventListener("alpine:init", () => {
  Alpine.data("contextMenu", () => ({
    isOpen: false,
    posX: 0,
    posY: 0,
    isLocked: false,
    isGrouped: false,

    init() {
      // Listen for canvas right-click events
      document.addEventListener("canvas-contextmenu", (e) => {
        this.openMenu(e.detail.x, e.detail.y);
        this.updateMenuOptions(e.detail.object);
      });

      // Close menu when clicking away
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".context-menu")) {
          this.close();
        }
      });
    },

    openMenu(x, y) {
      this.isOpen = true;

      // Calculate position to ensure menu stays within viewport
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const menuWidth = 250; // Approximate menu width, adjust as needed
      const menuHeight = 200; // Approximate menu height, adjust as needed

      // Adjust X position if menu would go off-screen
      if (x + menuWidth >= windowWidth) {
        this.posX = windowWidth - menuWidth - 10;
      } else {
        this.posX = x + 10;
      }

      // Adjust Y position if menu would go off-screen
      if (y + menuHeight >= windowHeight) {
        this.posY = windowHeight - menuHeight - 10;
      } else {
        this.posY = y + 10;
      }
    },

    close() {
      this.isOpen = false;
    },

    updateMenuOptions(obj) {
      if (!obj) {
        this.close();
        return;
      }

      // Update menu options based on selected object
      this.isGrouped = obj.type === "group";
      this.isLocked = obj.lockMovementX === true;
    },

    handleAction(action) {
      const obj = canvas.getActiveObject();
      if (!obj) return;

      switch (action) {
        case "bringForward":
          canvas.bringForward(obj);
          break;

        case "sendBackwards":
          canvas.sendBackwards(obj);
          break;

        case "group":
          createObjectsGroup();
          this.isGrouped = true;
          break;

        case "ungroup":
          unGroupObjects();
          this.isGrouped = false;
          break;

        case "lockUnlock":
          const locked = !this.isLocked;
          const objects = canvas.getActiveObjects();

          objects.forEach((obj) => {
            obj.set({
              lockMovementY: locked,
              lockMovementX: locked,
              lockScalingX: locked,
              lockScalingY: locked,
            });
          });

          this.isLocked = locked;
          canvas.renderAll();
          break;

        case "delete":
          const activeObj = canvas.getActiveObject();
          if (activeObj) {
            canvas.remove(activeObj);

            // Dispatch event for layers panel to handle deletion
            document.dispatchEvent(
              new CustomEvent("delete-layer", {
                detail: { id: activeObj.id },
              })
            );
          }
          break;
      }

      this.close();
      canvas.renderAll();
    },

    toggleLock() {
      this.handleAction("lockUnlock");
    },

    toggleGroup() {
      this.handleAction(this.isGrouped ? "ungroup" : "group");
    },
  }));
});

// Set up canvas context menu event
function setupCanvasContextMenu() {
  // Canvas container element
  const canvasContainer = document.querySelector(".canvas-container");

  if (!canvasContainer) {
    console.warn("Canvas container not found");
    return;
  }

  // Add context menu event listener
  canvasContainer.addEventListener("contextmenu", function (e) {
    e.preventDefault();

    const obj = canvas.getActiveObject();
    if (!obj || !canvas._objects.length) return;

    // Dispatch custom event for Alpine component to handle
    document.dispatchEvent(
      new CustomEvent("canvas-contextmenu", {
        detail: {
          x: e.pageX,
          y: e.pageY,
          object: obj,
        },
      })
    );
  });
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  setupCanvasContextMenu();
});

export { setupCanvasContextMenu };
