// src/fabric.js - Main implementation with all components and functionality
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

// component definitions
import { contextMenuComponent } from "./components/core/context-menu.js";
import { sidebarComponent } from "./components/core/sidebar.js";
import { panelManagerComponent } from "./components/core/panel-manager.js";
import { toolPanelComponent } from "./components/core/tool-panel.js";
import { objectManipulationComponent } from "./components/core/object-manipulation.js";

// panel components
import { templatesPanelComponent } from "./components/panels/templates-panel.js";
import { textPanelComponent } from "./components/panels/textPanel.js";
import { uploadsPanelComponent } from "./components/panels/uploads-panel.js";
import { drawingPanelComponent } from "./components/panels/drawing-panel.js";
import { layersPanelComponent } from "./components/panels/layers-panel.js";
import { clipArtsPanelComponent } from "./components/panels/clip-arts-panel.js";
import { maskPanelComponent } from "./components/panels/mask-panel.js";
import { settingsPanelComponent } from "./components/panels/settings-panel.js";

// UI components
import { quickOptionsBarComponent } from "./components/ui/quick-options-bar.js";
import { exportFunctionsComponent } from "./components/ui/export-functions.js";
import { canvasUtilitiesComponent } from "./components/ui/canvas-utilities.js";
import { canvasManagerComponent } from "./components/core/canvas-manager.js";

function setupGlobalUtilities() {
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
}

function registerAllComponents(Alpine) {
  Alpine.data("steveEditor", steveEditorComponent);

  Alpine.data("contextMenu", contextMenuComponent);
  Alpine.data("sidebar", sidebarComponent);
  Alpine.data("panelManager", panelManagerComponent);
  Alpine.data("toolPanel", toolPanelComponent);
  Alpine.data("objectManipulation", objectManipulationComponent);

  Alpine.data("templatesPanel", templatesPanelComponent);
  Alpine.data("textPanel", textPanelComponent);
  Alpine.data("uploadsPanel", uploadsPanelComponent);
  Alpine.data("drawingPanel", drawingPanelComponent);
  Alpine.data("layersPanel", layersPanelComponent);
  Alpine.data("clipArtsPanel", clipArtsPanelComponent);
  Alpine.data("maskPanel", maskPanelComponent);
  Alpine.data("settingsPanel", settingsPanelComponent);

  Alpine.data("quickOptionsBar", quickOptionsBarComponent);
  Alpine.data("exportFunctions", exportFunctionsComponent);
  Alpine.data("canvasUtilities", canvasUtilitiesComponent);
  Alpine.data("canvasManager", canvasManagerComponent);
}

const steveEditorComponent = () => ({
  activeTool: "templates", // Default active tool

  init() {
    this.$nextTick(() => {
      this.initCanvas();
    });

    this.$watch("activeTool", (value) => {
      this.$dispatch("tool-changed", { type: value });
    });

    this.$root.addEventListener("change-tool", (e) => {
      this.activeTool = e.detail.type;
    });

    window.addEventListener("canvas:initialized", () => {
      initHistoryManager();
    });
  },

  initCanvas() {
    const canvas = new fabric.Canvas("image-editor", {
      preserveObjectStacking: true,
      width: 1200,
      height: 600,
      backgroundColor: "#ffffff",
    });

    window.canvas = canvas;

    canvas.on("selection:created", this.handleSelection);
    canvas.on("selection:updated", this.handleSelection);
    canvas.on("selection:cleared", this.handleSelectionCleared);
    canvas.on("object:modified", this.handleObjectModified);
    canvas.on("object:added", this.handleObjectAdded);
    canvas.on("object:removed", this.handleObjectRemoved);

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

    window.dispatchEvent(
      new CustomEvent("canvas:initialized", {
        detail: { canvas: canvas },
      })
    );
  },

  handleSelection() {
    const activeObject = window.canvas.getActiveObject();
    if (activeObject) {
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
});

// Export other functions that might be needed elsewhere
export { setupGlobalUtilities, registerAllComponents };
