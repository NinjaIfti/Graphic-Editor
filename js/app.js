// src/app.js - Main entry point that loads all components
import Alpine from "alpinejs";
import * as fabric from "fabric";

// Make Alpine and fabric globally available
window.Alpine = Alpine;
window.fabric = fabric;

// Import filters
import "./filters/fabric-filters-polyfill.js";

// Import utilities from separate files
import {
  centerAll,
  fitToCanvas,
  clearCanvas,
  align,
  group,
  ungroup,
  bringToFront,
  bringForward,
  sendBackward,
  sendToBack,
  deleteObject,
  cloneObject,
  toggleLock,
} from "./utils/canvas-utils.js";

import {
  downloadCanvas,
  downloadPNG,
  downloadJPG,
} from "./utils/export-utils.js";

import {
  initHistoryManager,
  addToHistory,
  undo,
  redo,
} from "./utils/history-manager.js";

// Make necessary utilities available globally
window.downloadCanvas = downloadCanvas;
window.canvasUtils = {
  centerAll,
  fitToCanvas,
  clearCanvas,
  align,
  group,
  ungroup,
  bringForward,
  sendBackward,
  bringToFront,
  sendToBack,
  deleteObject,
  cloneObject,
  toggleLock,
};

// Import component definitions from separate files
import { contextMenuComponent } from "./components/core/context-menu.js";
import { sidebarComponent } from "./components/core/sidebar.js";
import { panelManagerComponent } from "./components/core/panel-manager.js";
import { toolPanelComponent } from "./components/core/tool-panel.js";
import { objectManipulationComponent } from "./components/core/object-manipulation.js";

// Import panel components
import { templatesPanelComponent } from "./components/panels/templates-panel.js";
import { textPanelComponent } from "./components/panels/textPanel.js";
import { uploadsPanelComponent } from "./components/panels/uploads-panel.js";
import { drawingPanelComponent } from "./components/panels/drawing-panel.js";
import { layersPanelComponent } from "./components/panels/layers-panel.js";
import { clipArtsPanelComponent } from "./components/panels/clip-arts-panel.js";
import { maskPanelComponent } from "./components/panels/mask-panel.js";
import { settingsPanelComponent } from "./components/panels/settings-panel.js";

// Import UI components
import { quickOptionsBarComponent } from "./components/ui/quick-options-bar.js";
import { exportFunctionsComponent } from "./components/ui/export-functions.js";
import { canvasUtilitiesComponent } from "./components/ui/canvas-utilities.js";
import { canvasManagerComponent } from "./components/core/canvas-manager.js";

// Register all components with Alpine
document.addEventListener("alpine:init", () => {
  // Register main component
  Alpine.data("steveEditor", () => ({
    activeTool: "templates", // Default active tool

    init() {
      // Initialize the canvas when the DOM is ready
      this.$nextTick(() => {
        this.initCanvas();
      });

      // Listen for tool changes from sidebar
      this.$watch("activeTool", (value) => {
        // Broadcast the active tool to all components
        this.$dispatch("tool-changed", { type: value });
      });

      // Handle tool selection from sidebar
      this.$root.addEventListener("change-tool", (e) => {
        this.activeTool = e.detail.type;
      });

      // Initialize history manager after canvas is ready
      window.addEventListener("canvas:initialized", () => {
        initHistoryManager();
      });
    },

    // Initialize the main canvas
    initCanvas() {
      // Create canvas instance
      const canvas = new fabric.Canvas("image-editor", {
        preserveObjectStacking: true,
        width: 1200,
        height: 600,
        backgroundColor: "#ffffff",
      });

      // Make it globally available
      window.canvas = canvas;

      // Set up event listeners
      canvas.on("selection:created", this.handleSelection);
      canvas.on("selection:updated", this.handleSelection);
      canvas.on("selection:cleared", this.handleSelectionCleared);
      canvas.on("object:modified", this.handleObjectModified);
      canvas.on("object:added", this.handleObjectAdded);
      canvas.on("object:removed", this.handleObjectRemoved);

      // Add some demo objects if needed
      const welcomeText = new fabric.Text("Welcome to Steve Editor", {
        fontFamily: "Roboto",
        fontSize: 30,
        fill: "#333333",
        left: 400,
        top: 100,
      });

      const rectangle = new fabric.Rect({
        width: 200,
        height: 150,
        fill: "#ff5555",
        left: 300,
        top: 300,
        rx: 10,
        ry: 10,
      });

      canvas.add(welcomeText);
      canvas.add(rectangle);
      canvas.centerObject(welcomeText);

      // Notify other components that canvas is ready
      window.dispatchEvent(
        new CustomEvent("canvas:initialized", {
          detail: { canvas: canvas },
        })
      );
    },

    // Handle selection events
    handleSelection() {
      const activeObject = window.canvas.getActiveObject();
      if (activeObject) {
        // Dispatch event to notify panels about selection
        window.dispatchEvent(
          new CustomEvent("object:selected", {
            detail: activeObject,
          })
        );
      }
    },

    // Handle selection cleared events
    handleSelectionCleared() {
      // Notify panels that selection is cleared
      window.dispatchEvent(new CustomEvent("selection:cleared"));
    },

    // Handle object modified events
    handleObjectModified(e) {
      // Add to history stack for undo
      addToHistory();

      // Notify panels about modification
      window.dispatchEvent(
        new CustomEvent("object:modified", {
          detail: e.target,
        })
      );
    },

    // Handle object added events
    handleObjectAdded(e) {
      // Add to history stack for undo
      addToHistory();

      // Notify panels about new object
      window.dispatchEvent(
        new CustomEvent("object:added", {
          detail: e.target,
        })
      );
    },

    // Handle object removed events
    handleObjectRemoved(e) {
      // Add to history stack for undo
      addToHistory();

      // Notify panels about removed object
      window.dispatchEvent(
        new CustomEvent("object:removed", {
          detail: e.target,
        })
      );
    },
  }));

  // Register all other components
  Alpine.data("contextMenu", contextMenuComponent);
  Alpine.data("sidebar", sidebarComponent);
  Alpine.data("panelManager", panelManagerComponent);
  Alpine.data("toolPanel", toolPanelComponent);
  Alpine.data("objectManipulation", objectManipulationComponent);

  // Register panel components
  Alpine.data("templatesPanel", templatesPanelComponent);
  Alpine.data("textPanel", textPanelComponent);
  Alpine.data("uploadsPanel", uploadsPanelComponent);
  Alpine.data("drawingPanel", drawingPanelComponent);
  Alpine.data("layersPanel", layersPanelComponent);
  Alpine.data("clipArtsPanel", clipArtsPanelComponent);
  Alpine.data("maskPanel", maskPanelComponent);
  Alpine.data("settingsPanel", settingsPanelComponent);

  // Register UI components
  Alpine.data("quickOptionsBar", quickOptionsBarComponent);
  Alpine.data("exportFunctions", exportFunctionsComponent);
  Alpine.data("canvasUtilities", canvasUtilitiesComponent);
  Alpine.data("canvasManager", canvasManagerComponent);
});

// Start Alpine
Alpine.start();

console.log("Steve Editor initialized!");
