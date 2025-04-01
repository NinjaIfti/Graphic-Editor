// src/app.js - Main entry point that loads all components
import Alpine from "alpinejs";
import fabricComponent from "./fabric.js";

// Make Alpine globally available
window.Alpine = Alpine;

// Import component definitions from separate files
import { contextMenuComponent } from "./components/core/context-menu.js";
import { sidebarComponent } from "./components/core/sidebar.js";
import { panelManagerComponent } from "./components/core/panel-manager.js";
import { toolPanelComponent } from "./components/core/tool-panel.js";
import { objectManipulationComponent } from "./components/core/object-manipulation.js";

// Import panel components
import { templatesPanelComponent } from "./components/panels/templates-panel.js";
import { textPanelComponent } from "./components/panels/text-panel.js";
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
      // Initialize when the DOM is ready
      this.$nextTick(() => {
        // Listen for tool changes from sidebar
        this.$watch("activeTool", (value) => {
          // Broadcast the active tool to all components
          this.$dispatch("tool-changed", { type: value });
        });

        // Handle tool selection from sidebar
        this.$root.addEventListener("change-tool", (e) => {
          this.activeTool = e.detail.type;
        });
      });
    },
  }));

  // Register fabric component
  Alpine.data("fabric", fabricComponent);

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
