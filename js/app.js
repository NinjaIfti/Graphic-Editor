// src/app.js - Main Application File

// Import required libraries
import Alpine from "alpinejs";
import * as fabric from "fabric";
import { CurvedText, getRangeFromPercentage } from "./tools/curved-text.js";

// Make Alpine globally available
window.Alpine = Alpine;

window.fabric = fabric; // Make fabric globally available
import "./filters/fabric-filters-polyfill.js";

// Global function to download canvas in specified format
window.downloadCanvas = function (format) {
  console.log("Exporting canvas as", format);
  if (!window.canvas) {
    console.error("Canvas not found!");
    return;
  }

  // Validate format
  if (format !== "jpg" && format !== "png") {
    console.error("Invalid format. Must be 'jpg' or 'png'.");
    return;
  }

  // Check if export is already in progress
  if (window.exportInProgress) {
    console.log("Export already in progress, please wait...");
    return;
  }

  window.exportInProgress = true;

  try {
    // Create a download link
    const link = document.createElement("a");

    // Set filename with appropriate extension
    link.download = `steve-editor-design.${format}`;

    // Get current canvas dimensions
    const canvasWidth = window.canvas.getWidth();
    const canvasHeight = window.canvas.getHeight();

    if (format === "jpg") {
      // Save current background color
      const originalBgColor = window.canvas.backgroundColor;

      // For JPG, we need a solid background (white if none exists)
      if (!originalBgColor) {
        window.canvas.backgroundColor = "#ffffff" || "";
        window.canvas.renderAll();
        window.exportInProgress = false;

        // Get the canvas data URL as JPG
        link.href = window.canvas.toDataURL({
          format: "jpeg",
          quality: 0.9,
          width: canvasWidth,
          height: canvasHeight,
        });

        // Trigger the download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Restore original background
        window.canvas.backgroundColor = "#ffffff" || "";
        window.canvas.renderAll();
        window.exportInProgress = false;
      } else {
        // Already has a background, just export
        link.href = window.canvas.toDataURL({
          format: "jpeg",
          quality: 0.9,
          width: canvasWidth,
          height: canvasHeight,
        });

        // Trigger the download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.exportInProgress = false;
      }
    } else {
      // PNG format (with transparency supported)
      link.href = window.canvas.toDataURL({
        format: "png",
        quality: 1,
        width: canvasWidth,
        height: canvasHeight,
      });

      // Trigger the download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.exportInProgress = false;
    }
  } catch (error) {
    console.error(`Error exporting as ${format.toUpperCase()}:`, error);
    window.exportInProgress = false;
  }
};

// Initialize Alpine
document.addEventListener("alpine:init", () => {
  // Main Application State
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
    },

    // Initialize the main canvas
    initCanvas() {
      // Create canvas instance
      const canvas = new fabric.Canvas("image-editor", {
        preserveObjectStacking: true,
        width: 12000,
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

      // Initialize history stack for undo/redo
      this.initHistory();

      // Add a few demo objects
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
      this.addToHistory();

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
      this.addToHistory();

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
      this.addToHistory();

      // Notify panels about removed object
      window.dispatchEvent(
        new CustomEvent("object:removed", {
          detail: e.target,
        })
      );
    },

    // Initialize history management
    historyStack: [],
    historyIndex: -1,
    maxHistorySteps: 50,

    initHistory() {
      // Save initial state
      this.addToHistory();

      // Setup keyboard shortcuts for undo/redo
      document.addEventListener("keydown", (e) => {
        // Undo: Ctrl+Z
        if (e.ctrlKey && e.key === "z") {
          e.preventDefault();
          this.undo();
        }

        // Redo: Ctrl+Y or Ctrl+Shift+Z
        if (
          (e.ctrlKey && e.key === "y") ||
          (e.ctrlKey && e.shiftKey && e.key === "z")
        ) {
          e.preventDefault();
          this.redo();
        }
      });
    },

    // Add current state to history
    addToHistory() {
      if (!window.canvas) return;

      // Get JSON representation of canvas
      const json = window.canvas.toJSON();

      // If we're not at the end of the stack, remove the future states
      if (this.historyIndex < this.historyStack.length - 1) {
        this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
      }

      // Add current state to stack
      this.historyStack.push(json);
      this.historyIndex = this.historyStack.length - 1;

      // Limit stack size
      if (this.historyStack.length > this.maxHistorySteps) {
        this.historyStack.shift();
        this.historyIndex--;
      }
    },

    // Undo last action
    undo() {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.loadFromHistory();
      }
    },

    // Redo previously undone action
    redo() {
      if (this.historyIndex < this.historyStack.length - 1) {
        this.historyIndex++;
        this.loadFromHistory();
      }
    },

    // Load state from history
    loadFromHistory() {
      if (!window.canvas) return;

      const state = this.historyStack[this.historyIndex];
      window.canvas.loadFromJSON(state, () => {
        window.canvas.renderAll();
      });
    },
  }));
});
// Add this to app.js after the steveEditor component
// Context Menu Component
Alpine.data("contextMenu", () => ({
  isOpen: false,
  posX: 0,
  posY: 0,
  isLocked: false,
  isGrouped: false,
  canvas: null,
  activeObject: null,

  init() {
    // Initialize fabric canvas reference
    this.initFabricCanvas();

    // Set up event listeners for context menu
    document.addEventListener("contextmenu", (e) => {
      const activeObject = this.canvas?.getActiveObject();
      if (activeObject) {
        e.preventDefault();
        this.activeObject = activeObject;
        this.posX = e.clientX;
        this.posY = e.clientY;
        this.isOpen = true;
        this.isLocked =
          activeObject.lockMovementX && activeObject.lockMovementY;
        this.isGrouped = activeObject.type === "group";
      }
    });

    // Setup keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (!this.canvas) return;

      const activeObject = this.canvas.getActiveObject();
      if (!activeObject) return;

      // Ctrl + [
      if (e.ctrlKey && e.key === "[") {
        this.handleAction("bringForward");
      }

      // Ctrl + ]
      if (e.ctrlKey && e.key === "]") {
        this.handleAction("sendBackwards");
      }

      // Ctrl + L
      if (e.ctrlKey && e.key === "l") {
        this.toggleLock();
      }

      // Ctrl + G
      if (e.ctrlKey && e.key === "g") {
        this.toggleGroup();
      }

      // Delete
      if (e.key === "Delete") {
        this.handleAction("delete");
      }
    });
  },

  initFabricCanvas() {
    // We'll connect to the Fabric.js canvas once it's initialized elsewhere
    window.addEventListener("canvas:initialized", (e) => {
      this.canvas = e.detail.canvas;
    });
  },

  close() {
    this.isOpen = false;
  },

  handleAction(action) {
    if (!this.canvas || !this.activeObject) return;

    switch (action) {
      case "bringForward":
        this.canvas.bringForward(this.activeObject);
        break;
      case "sendBackwards":
        this.canvas.sendBackwards(this.activeObject);
        break;
      case "delete":
        this.canvas.remove(this.activeObject);
        break;
    }

    this.canvas.requestRenderAll();
    this.close();
  },

  toggleLock() {
    if (!this.canvas || !this.activeObject) return;

    this.isLocked = !this.isLocked;
    this.activeObject.set({
      lockMovementX: this.isLocked,
      lockMovementY: this.isLocked,
      lockRotation: this.isLocked,
      lockScalingX: this.isLocked,
      lockScalingY: this.isLocked,
    });

    this.canvas.requestRenderAll();
    this.close();
  },

  toggleGroup() {
    if (!this.canvas) return;

    if (this.isGrouped) {
      // Ungroup
      const items = this.activeObject.getObjects();
      this.activeObject.destroy();
      this.canvas.remove(this.activeObject);
      this.canvas.discardActiveObject();

      items.forEach((item) => {
        this.canvas.add(item);
      });
    } else {
      // Group
      if (
        !this.canvas.getActiveObjects() ||
        this.canvas.getActiveObjects().length < 2
      ) {
        return;
      }

      const selection = new fabric.Group(this.canvas.getActiveObjects(), {
        canvas: this.canvas,
      });

      this.canvas.remove(...this.canvas.getActiveObjects());
      this.canvas.add(selection);
      this.canvas.setActiveObject(selection);
    }

    this.isGrouped = !this.isGrouped;
    this.canvas.requestRenderAll();
    this.close();
  },
}));
// Sidebar Component
Alpine.data("sidebar", () => ({
  activeItem: "templates", // Default active tool

  init() {
    // Set the default active tool
    this.$nextTick(() => {
      this.setActiveTool(this.activeItem);
    });
  },

  // Set the active tool and notify other components
  setActiveTool(toolName) {
    console.log("Tool selected:", toolName);
    this.activeItem = toolName;

    // Dispatch custom event to notify other components
    this.$dispatch("change-tool", { type: toolName });
    console.log("change-tool event dispatched");

    // Also dispatch the standard event for components that might be listening
    window.dispatchEvent(
      new CustomEvent("tool-changed", {
        detail: { type: toolName },
      })
    );
  },
}));

// Panel Manager Component - Controls visibility of panels based on active tool
Alpine.data("panelManager", () => ({
  activePanelId: "templates",

  init() {
    // Listen for tool change events
    window.addEventListener("tool-changed", (e) => {
      console.log("tool-changed event received:", e.detail.type);
      this.activePanelId = e.detail.type;
      console.log("isActive set to:", this.isActive);
    });
  },

  isPanelActive(panelId) {
    return this.activePanelId === panelId;
  },
}));

// Tool Selection Manager - Common component for all tool panels
Alpine.data("toolPanel", (panelId) => ({
  isActive: false,

  init() {
    // Listen for tool changes
  },
}));

// Object Manipulation Utilities
Alpine.data("objectManipulation", () => ({
  // Align objects on canvas
  align(type) {
    if (!window.canvas) return;

    const activeObject = window.canvas.getActiveObject();
    if (!activeObject) return;

    const canvasWidth = window.canvas.getWidth();
    const canvasHeight = window.canvas.getHeight();

    let coordX, coordY;

    switch (type) {
      case "left":
        coordX = activeObject.getBoundingRect().width / 2;
        activeObject.set({ left: coordX, originX: "center" });
        break;
      case "right":
        coordX = canvasWidth - activeObject.getBoundingRect().width / 2;
        activeObject.set({ left: coordX, originX: "center" });
        break;
      case "centerH":
        window.canvas.centerObjectH(activeObject);
        break;
      case "top":
        coordY = activeObject.getBoundingRect().height / 2;
        activeObject.set({ top: coordY, originY: "center" });
        break;
      case "bottom":
        coordY = canvasHeight - activeObject.getBoundingRect().height / 2;
        activeObject.set({ top: coordY, originY: "center" });
        break;
      case "centerV":
        window.canvas.centerObjectV(activeObject);
        break;
      case "center":
        window.canvas.centerObject(activeObject);
        break;
    }

    window.canvas.renderAll();
  },

  // Group selected objects
  group() {
    if (!window.canvas) return;

    const activeSelection = window.canvas.getActiveObject();

    if (
      activeSelection &&
      activeSelection.type === "activeSelection" &&
      activeSelection.getObjects().length > 1
    ) {
      const group = activeSelection.toGroup();
      window.canvas.setActiveObject(group);
      window.canvas.renderAll();
      return true;
    }

    return false;
  },

  // Ungroup a group of objects
  ungroup() {
    if (!window.canvas) return;

    const activeObject = window.canvas.getActiveObject();

    if (activeObject && activeObject.type === "group") {
      const items = activeObject.getObjects();
      activeObject.destroy();
      window.canvas.remove(activeObject);

      items.forEach((item) => {
        window.canvas.add(item);
      });

      window.canvas.discardActiveObject();
      window.canvas.renderAll();
      return true;
    }

    return false;
  },

  // Bring object forward in stacking order
  bringForward() {
    if (!window.canvas) return;

    const activeObject = window.canvas.getActiveObject();
    if (activeObject) {
      window.canvas.bringForward(activeObject);
      window.canvas.renderAll();
    }
  },

  // Send object backward in stacking order
  sendBackward() {
    if (!window.canvas) return;

    const activeObject = window.canvas.getActiveObject();
    if (activeObject) {
      window.canvas.sendBackwards(activeObject);
      window.canvas.renderAll();
    }
  },

  // Bring object to front
  bringToFront() {
    if (!window.canvas) return;

    const activeObject = window.canvas.getActiveObject();
    if (activeObject) {
      window.canvas.bringToFront(activeObject);
      window.canvas.renderAll();
    }
  },

  // Send object to back
  sendToBack() {
    if (!window.canvas) return;

    const activeObject = window.canvas.getActiveObject();
    if (activeObject) {
      window.canvas.sendToBack(activeObject);
      window.canvas.renderAll();
    }
  },

  // Delete selected object(s)
  delete() {
    if (!window.canvas) return;

    const activeObject = window.canvas.getActiveObject();
    if (activeObject) {
      if (activeObject.type === "activeSelection") {
        // Delete multiple selected objects
        activeObject.getObjects().forEach((obj) => {
          window.canvas.remove(obj);
        });
        window.canvas.discardActiveObject();
      } else {
        // Delete single object
        window.canvas.remove(activeObject);
      }

      window.canvas.renderAll();
    }
  },

  // Clone/duplicate selected object
  clone() {
    if (!window.canvas) return;

    const activeObject = window.canvas.getActiveObject();
    if (!activeObject) return;

    activeObject.clone((cloned) => {
      cloned.set({
        left: activeObject.left + 10,
        top: activeObject.top + 10,
      });

      window.canvas.add(cloned);
      window.canvas.setActiveObject(cloned);
      window.canvas.renderAll();
    });
  },

  // Lock/unlock object position
  toggleLock() {
    if (!window.canvas) return;

    const activeObject = window.canvas.getActiveObject();
    if (!activeObject) return;

    const isLocked = activeObject.lockMovementX && activeObject.lockMovementY;

    activeObject.set({
      lockMovementX: !isLocked,
      lockMovementY: !isLocked,
      lockRotation: !isLocked,
      lockScalingX: !isLocked,
      lockScalingY: !isLocked,
    });

    window.canvas.renderAll();
    return !isLocked;
  },
}));
// Templates Panel Component
Alpine.data("templatesPanel", () => ({
  isActive: false,
  templates: [], // This would be populated with template data from your backend

  init() {
    // Listen for tool changes
    window.addEventListener("tool-changed", (e) => {
      this.isActive = e.detail.type === "templates";

      // If becoming active, fetch templates if needed
      if (this.isActive && this.templates.length === 0) {
        this.fetchTemplates();
      }
    });
  },

  // Fetch templates from server (mock implementation)
  fetchTemplates() {
    // In a real implementation, you would fetch from your server
    // This is just a placeholder
    console.log("Fetching templates...");

    // For now, let's leave it empty to show "No templates found!" message
    this.templates = [];
  },

  // Apply a template to the canvas
  applyTemplate(template) {
    if (!window.canvas) return;

    // Clear current canvas
    window.canvas.clear();

    // Load the template (would be a JSON representation of canvas state)
    window.canvas.loadFromJSON(template.data, () => {
      window.canvas.renderAll();
    });
  },
}));
// Text Panel Component
Alpine.data("textPanel", () => ({
  isActive: false,
  selectedObject: null,
  showDistortion: false,
  showShadow: false,
  showCurve: false, // New property for curve section visibility
  curveValue: 2500, // Default value (center of the range)
  curveAngle: 0, // Default angle value (no curve)

  // Text properties
  textProperties: {
    fill: "#000000",
    fontFamily: "Roboto",
    fontSize: 40,
    fontWeight: "normal",
    fontStyle: "normal",
    underline: false,
    opacity: 1,
    stroke: "#000000",
    strokeWidth: 0,
    charSpacing: 0,
    rotation: 0,
    skewX: 0,
    skewY: 0,
    shadowEnabled: false,
    shadowColor: "#dddddd",
    shadowBlur: 20,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  },

  // Font list
  fonts: [
    "Roboto",
    "Arial",
    "Times New Roman",
    "Courier New",
    "Georgia",
    "Verdana",
    "Helvetica",
    "Tahoma",
    "Trebuchet MS",
    "Impact",
  ],
  filteredFonts: [],
  fontSearch: "",

  init() {
    // Initialize filtered fonts
    this.filteredFonts = [...this.fonts];

    // Listen for tool changes
    window.addEventListener("tool-changed", (e) => {
      this.isActive = e.detail.type === "text";
    });

    // Listen for object selection
    window.addEventListener("object:selected", (e) => {
      if (
        e.detail &&
        (e.detail.type === "text" || e.detail.type === "curved-text")
      ) {
        this.selectedObject = e.detail;
        this.syncTextProperties();

        // Update curve values if it's a curved text
        if (e.detail.type === "curved-text") {
          const percentage = e.detail.percentage || 0;
          this.curveValue = getRangeFromPercentage(percentage);
          this.curveAngle = (percentage * 3.6).toFixed(0);
        } else {
          // Reset curve for regular text
          this.curveValue = 2500;
          this.curveAngle = 0;
        }
      }
    });

    // Listen for selection cleared
    window.addEventListener("selection:cleared", () => {
      this.selectedObject = null;
    });
  },

  // Add simple text
  addText() {
    if (!window.canvas) return;

    const text = new fabric.Text("Your text here", {
      left: 100,
      top: 100,
      fontFamily: this.textProperties.fontFamily,
      fontSize: this.textProperties.fontSize,
      fill: this.textProperties.fill,
    });

    window.canvas.add(text);
    window.canvas.setActiveObject(text);
    window.canvas.renderAll();

    this.selectedObject = text;
    this.syncTextProperties();
  },

  // Add pre-built heading
  addHeading(type) {
    if (!window.canvas) return;

    let props = {};

    switch (type) {
      case "full":
        props = {
          text: "Add a heading",
          fontSize: 48,
          fontWeight: "bold",
        };
        break;
      case "sub":
        props = {
          text: "Add a subheading",
          fontSize: 32,
          fontWeight: "normal",
        };
        break;
      case "paragraph":
        props = {
          text: "Add a little bit of body text",
          fontSize: 24,
          fontWeight: "normal",
        };
        break;
    }

    const text = new fabric.Text(props.text, {
      left: 100,
      top: 100,
      fontFamily: this.textProperties.fontFamily,
      fontSize: props.fontSize,
      fontWeight: props.fontWeight,
      fill: this.textProperties.fill,
    });

    window.canvas.add(text);
    window.canvas.setActiveObject(text);
    window.canvas.renderAll();

    this.selectedObject = text;
    this.syncTextProperties();
  },

  // Sync text properties when object is selected
  syncTextProperties() {
    if (!this.selectedObject) return;

    // Handle both regular text and curved text
    const isText = this.selectedObject.type === "text";
    const isCurvedText = this.selectedObject.type === "curved-text";
    const isCurvedTextGroup =
      this.selectedObject.type === "group" && this.selectedObject.originalText;

    if (!isText && !isCurvedText && !isCurvedTextGroup) return;

    const obj = this.selectedObject;

    // If it's a curved text, use its properties
    if (isCurvedText) {
      this.textProperties = {
        fill: obj.fill || "#000000",
        fontFamily: obj.fontFamily || "Roboto",
        fontSize: obj.fontSize || 40,
        fontWeight: obj.fontWeight || "normal",
        fontStyle: obj.fontStyle || "normal",
        underline: false, // Curved text doesn't support underline
        opacity: obj.opacity || 1,
        stroke: obj.strokeStyle || "#000000", // Note: CurvedText uses strokeStyle
        strokeWidth: obj.strokeWidth || 0,
        charSpacing: obj.kerning || 0, // Note: CurvedText uses kerning
        rotation: obj.angle || 0,
        skewX: 0, // Not applicable for curved text
        skewY: 0, // Not applicable for curved text
        shadowEnabled: !!obj.shadow,
        shadowColor: obj.shadow ? obj.shadow.color : "#dddddd",
        shadowBlur: obj.shadow ? obj.shadow.blur : 20,
        shadowOffsetX: obj.shadow ? obj.shadow.offsetX : 0,
        shadowOffsetY: obj.shadow ? obj.shadow.offsetY : 0,
      };
      // If it's a curved text group (from the older implementation), use its stored properties
    } else if (isCurvedTextGroup) {
      this.textProperties = {
        fill: obj.textProps?.fill || "#000000",
        fontFamily: obj.textProps?.fontFamily || "Roboto",
        fontSize: obj.textProps?.fontSize || 40,
        fontWeight: obj.textProps?.fontWeight || "normal",
        fontStyle: obj.textProps?.fontStyle || "normal",
        underline: false, // Groups don't support underline
        opacity: obj.opacity || 1,
        stroke: obj.textProps?.stroke || "#000000",
        strokeWidth: obj.textProps?.strokeWidth || 0,
        charSpacing: 0, // Not applicable for curved text
        rotation: obj.angle || 0,
        skewX: 0, // Not applicable for curved text
        skewY: 0, // Not applicable for curved text
        shadowEnabled: false, // Groups don't support shadow the same way
        shadowColor: "#dddddd",
        shadowBlur: 20,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
      };
    } else {
      // Regular text object
      this.textProperties = {
        fill: obj.fill || "#000000",
        fontFamily: obj.fontFamily || "Roboto",
        fontSize: obj.fontSize || 40,
        fontWeight: obj.fontWeight || "normal",
        fontStyle: obj.fontStyle || "normal",
        underline: obj.underline || false,
        opacity: obj.opacity || 1,
        stroke: obj.stroke || "#000000",
        strokeWidth: obj.strokeWidth || 0,
        charSpacing: obj.charSpacing || 0,
        rotation: obj.angle || 0,
        skewX: obj.skewX || 0,
        skewY: obj.skewY || 0,
        shadowEnabled: !!obj.shadow,
        shadowColor: obj.shadow ? obj.shadow.color : "#dddddd",
        shadowBlur: obj.shadow ? obj.shadow.blur : 20,
        shadowOffsetX: obj.shadow ? obj.shadow.offsetX : 0,
        shadowOffsetY: obj.shadow ? obj.shadow.offsetY : 0,
      };
    }
  },

  // Toggle font weight (bold/normal)
  toggleFontWeight() {
    if (!this.selectedObject || !window.canvas) return;

    this.textProperties.fontWeight =
      this.textProperties.fontWeight === "bold" ? "normal" : "bold";
    this.selectedObject.set("fontWeight", this.textProperties.fontWeight);
    window.canvas.renderAll();
  },

  // Toggle font style (italic/normal)
  toggleFontStyle() {
    if (!this.selectedObject || !window.canvas) return;

    this.textProperties.fontStyle =
      this.textProperties.fontStyle === "italic" ? "normal" : "italic";
    this.selectedObject.set("fontStyle", this.textProperties.fontStyle);
    window.canvas.renderAll();
  },

  // Toggle underline
  toggleUnderline() {
    if (!this.selectedObject || !window.canvas) return;

    this.textProperties.underline = !this.textProperties.underline;
    this.selectedObject.set("underline", this.textProperties.underline);
    window.canvas.renderAll();
  },

  // Filter fonts based on search
  filterFonts() {
    if (!this.fontSearch) {
      this.filteredFonts = this.fonts;
      return;
    }

    this.filteredFonts = this.fonts.filter((font) =>
      font.toLowerCase().includes(this.fontSearch.toLowerCase())
    );
  },

  // Select a font
  selectFont(font) {
    if (!this.selectedObject || !window.canvas) return;

    this.textProperties.fontFamily = font;
    this.selectedObject.set("fontFamily", font);
    window.canvas.renderAll();
  },

  updateTextRotation() {
    if (!this.selectedObject || !window.canvas) return;

    // Store the current position of the object
    const currentLeft = this.selectedObject.left;
    const currentTop = this.selectedObject.top;

    // Set the rotation origin to the center of the object
    this.selectedObject.set({
      angle: this.textProperties.rotation,
      originX: "center",
      originY: "center",
    });

    // Ensure the object remains in the same position after rotation
    this.selectedObject.set({
      left: currentLeft,
      top: currentTop,
    });

    // Re-render the canvas
    window.canvas.renderAll();
  },

  // Update any text property
  updateTextProperty(property, value) {
    if (!this.selectedObject || !window.canvas) return;

    // Convert value types appropriately
    let finalValue = value;
    if (typeof this.selectedObject[property] === "number") {
      finalValue = parseFloat(value);
    }

    // Set the property
    this.selectedObject.set(property, finalValue);

    // Update local state
    this.textProperties[property] = finalValue;

    // Render the canvas
    window.canvas.renderAll();
  },

  // Toggle shadow on/off
  toggleShadow() {
    if (!this.selectedObject || !window.canvas) return;

    if (this.textProperties.shadowEnabled) {
      // Enable shadow
      this.selectedObject.set(
        "shadow",
        new fabric.Shadow({
          color: this.textProperties.shadowColor,
          blur: this.textProperties.shadowBlur,
          offsetX: this.textProperties.shadowOffsetX,
          offsetY: this.textProperties.shadowOffsetY,
        })
      );
    } else {
      // Disable shadow
      this.selectedObject.set("shadow", null);
    }

    window.canvas.renderAll();
  },

  // Get percentage from range value
  getPercentageFromRange(value) {
    let percentage =
      value >= 2500 ? (value - 2500) / 25 : -((2500 - value) / 25);
    percentage = percentage.toFixed(0);
    if (percentage == -0 || percentage == "-0") percentage = 0;

    // Limit percentage to -90 to 90
    if (percentage > 90) percentage = 90;
    if (percentage < -90) percentage = -90;

    return parseInt(percentage);
  },

  // Update curve value from the slider
  updateTextCurve(value) {
    if (!window.canvas || !this.selectedObject) return;

    this.curveValue = value;
    let percentage = this.getPercentageFromRange(value);
    this.curveAngle = (percentage * 3.6).toFixed(0);

    this.applyCurve(percentage);
  },

  // Update curve from angle input
  updateCurveFromAngle(angle) {
    if (!window.canvas || !this.selectedObject) return;

    let val = parseInt(angle);

    // Limit angle to -360 to 360
    if (val > 360) val = 360;
    else if (val < -360) val = -360;

    // Convert angle to percentage
    let percentage = (val / 360) * 100;

    // Limit percentage to -90 to 90
    if (percentage > 90) percentage = 90;
    else if (percentage < -90) percentage = -90;

    // Get range value from percentage
    this.curveValue = getRangeFromPercentage(percentage);
    this.curveAngle = val;

    this.applyCurve(percentage);
  },

  // Apply curve to text
  applyCurve(percentage) {
    if (!window.canvas || !this.selectedObject) return;

    const obj = this.selectedObject;

    // Only work with text objects or curved text
    if (
      obj.type !== "text" &&
      obj.type !== "curved-text" &&
      !(obj.type === "group" && obj.originalText)
    )
      return;

    const isFlipped = percentage < 0;
    const hasCurveApply = parseInt(percentage) != 0;
    let value = Math.abs(2500 - this.curveValue);

    // Check if we need to apply curve
    if (hasCurveApply && obj.type === "text") {
      this.addCurveText(obj, value, percentage);
    } else if (
      !hasCurveApply &&
      (obj.type === "curved-text" || (obj.type === "group" && obj.originalText))
    ) {
      // Get the original text
      const originalText =
        obj.type === "curved-text" ? obj.text : obj.originalText;

      // Convert curved text back to regular text
      const text = new fabric.Text(originalText, {
        left: obj.left,
        top: obj.top,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        fontFamily:
          obj.type === "curved-text"
            ? obj.fontFamily
            : obj.textProps?.fontFamily || "Roboto",
        fontSize:
          obj.type === "curved-text"
            ? obj.fontSize
            : obj.textProps?.fontSize || 40,
        fontWeight:
          obj.type === "curved-text"
            ? obj.fontWeight
            : obj.textProps?.fontWeight || "normal",
        fontStyle:
          obj.type === "curved-text"
            ? obj.fontStyle
            : obj.textProps?.fontStyle || "normal",
        fill:
          obj.type === "curved-text"
            ? obj.fill
            : obj.textProps?.fill || "#000000",
        stroke:
          obj.type === "curved-text"
            ? obj.strokeStyle
            : obj.textProps?.stroke || "#000000",
        strokeWidth:
          obj.type === "curved-text"
            ? obj.strokeWidth
            : obj.textProps?.strokeWidth || 0,
        angle: obj.angle || 0,
        charSpacing:
          obj.type === "curved-text" ? obj.kerning : obj.charSpacing || 0,
        underline: false,
        originX: "center",
        originY: "center",
      });

      let index = window.canvas.getObjects().indexOf(obj);
      window.canvas.remove(obj);
      window.canvas.add(text);
      window.canvas.setActiveObject(text);
      window.canvas.moveTo(text, index);

      // Update the reference
      this.selectedObject = text;
    } else if (hasCurveApply && obj.type === "curved-text") {
      // Update existing curved text
      // Calculate arcSpan - how much of a circle the text should span
      const arcSpanValue = Math.min(Math.abs(percentage) / 100, 0.9);

      obj.set({
        _cachedCanvas: null,
        diameter: value,
        flipped: isFlipped,
        percentage: percentage,
        arcMode: true,
        arcSpan: arcSpanValue,
        originX: "center",
        originY: "center",
      });

      obj._needsRecalculate = true;
      obj._updateObj("scaleX", obj.scaleX);
      obj._updateObj("scaleY", obj.scaleY);
    } else if (hasCurveApply && obj.type === "group" && obj.originalText) {
      // Convert grouped curved text to CurvedText class
      const text = obj.originalText;
      window.canvas.remove(obj);

      this.addCurveText(
        {
          text: text,
          left: obj.left,
          top: obj.top,
          scaleX: obj.scaleX,
          scaleY: obj.scaleY,
          fontFamily: obj.textProps?.fontFamily || "Roboto",
          fontSize: obj.textProps?.fontSize || 40,
          fontWeight: obj.textProps?.fontWeight || "normal",
          fontStyle: obj.textProps?.fontStyle || "normal",
          fill: obj.textProps?.fill || "#000000",
          stroke: obj.textProps?.stroke || "#000000",
          strokeWidth: obj.textProps?.strokeWidth || 0,
        },
        value,
        percentage
      );
    }

    window.canvas.requestRenderAll();
  },

  // Add curved text using the new approach
  addCurveText(obj, diameter, percentage) {
    if (!window.canvas) return;

    // Get text content
    const text = obj.text || obj.originalText || obj;

    // Create options
    const options = {
      left: obj.left,
      top: obj.top,
      scaleX: obj.scaleX || 1,
      scaleY: obj.scaleY || 1,
      fontSize: obj.fontSize || 40,
      fontFamily: obj.fontFamily || "Roboto",
      fontWeight: obj.fontWeight || "normal",
      fontStyle: obj.fontStyle || "normal",
      fill: obj.fill || "#000000",
      stroke: obj.stroke || obj.strokeStyle || "#000000",
      strokeWidth: obj.strokeWidth || 0,
      kerning: parseInt(obj.charSpacing || 0) / 10,

      // Curved text specifics
      diameter: parseInt(diameter),
      percentage: percentage,
      flipped: percentage < 0,
    };

    console.log("Creating curved text with options:", options);

    // Create curved text
    const curvedText = new CurvedText(
      typeof text === "string" ? text : text.text,
      options
    );

    // Handle index positioning
    let index = -1;
    if (obj.type) {
      index = window.canvas.getObjects().indexOf(obj);
      window.canvas.remove(obj);
    }

    // Add to canvas
    const fabricObject = curvedText.addToCanvas(window.canvas);
    window.canvas.setActiveObject(fabricObject);

    // Maintain position in z-order
    if (index >= 0) {
      window.canvas.moveTo(fabricObject, index);
    }

    // Update reference
    this.selectedObject = fabricObject;

    // Render
    window.canvas.requestRenderAll();

    return fabricObject;
  },

  // Update shadow properties
  updateShadow(property, value) {
    if (
      !this.selectedObject ||
      !window.canvas ||
      !this.textProperties.shadowEnabled
    )
      return;

    // Update local state
    const propName = `shadow${
      property.charAt(0).toUpperCase() + property.slice(1)
    }`;
    this.textProperties[propName] =
      property === "color" ? value : parseFloat(value);

    // Create a new shadow with updated properties
    this.selectedObject.set(
      "shadow",
      new fabric.Shadow({
        color: this.textProperties.shadowColor,
        blur: this.textProperties.shadowBlur,
        offsetX: this.textProperties.shadowOffsetX,
        offsetY: this.textProperties.shadowOffsetY,
      })
    );

    window.canvas.renderAll();
  },
}));

// uploads panel
Alpine.data("uploadsPanel", () => ({
  isActive: false,
  uploads: [],
  selectedObject: null,
  activeFilter: null,
  showFilterTools: false,
  showShadow: false,
  showDistortion: false,
  filterAvailable: false, // Track filter availability
  originalImage: null, // Store original image for filter resets
  // debounceTimers: {}, // Store debounce timers for filter operations

  // Image filter properties
  filters: {
    brightness: 0,
    contrast: 0,
    blur: 0,
    noise: 0,
    saturation: 0,
    hue: 0,
    pixelate: 0,
  },

  // Object properties
  objectProperties: {
    opacity: 1,
    stroke: "#000000",
    strokeWidth: 0,
    radius: 0,
    skewX: 0,
    skewY: 0,
    fill: "#000000",
    shadowEnabled: false,
    shadowColor: "#dddddd",
    shadowBlur: 20,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  },

  init() {
    console.log("Uploads panel initializing");

    // Check if fabric is available and has filters
    this.checkFilterAvailability();
    // Listen for tool changes
    window.addEventListener("tool-changed", (e) => {
      console.log("Tool changed event received:", e.detail);
      this.isActive = e.detail.type === "uploads";

      // Check filter availability when panel becomes active
      if (this.isActive) {
        this.checkFilterAvailability();
      }
    });

    // Listen for object selection
    window.addEventListener("object:selected", (e) => {
      console.log("Object selected event received:", e.detail);
      if (e.detail) {
        this.selectedObject = e.detail;
        this.syncObjectProperties();

        // Reset original image reference when selecting a new object
        this.originalImage = null;
      }
    });

    // Listen for selection cleared
    window.addEventListener("selection:cleared", () => {
      console.log("Selection cleared event received");
      this.selectedObject = null;
      this.originalImage = null;
    });

    console.log("Uploads panel initialization complete");
  },

  // Check if fabric.js filters are available
  checkFilterAvailability() {
    // Check if fabric exists
    if (typeof fabric === "undefined") {
      console.warn("Fabric.js is not available");
      this.filterAvailable = false;
      return;
    }

    // Check if fabric.Image exists
    if (!fabric.Image) {
      console.warn("Fabric.Image is not available");
      this.filterAvailable = false;
      return;
    }

    // Check if filters are available
    if (!fabric.Image.filters) {
      console.warn(
        "Fabric.Image.filters is not available - filters won't work"
      );
      this.filterAvailable = false;
      return;
    }

    console.log("Fabric filters are available:", fabric.Image.filters);
    this.filterAvailable = true;

    // Optional: Log available filters
    const availableFilters = [];
    for (const filter in fabric.Image.filters) {
      availableFilters.push(filter);
    }
    console.log("Available filters:", availableFilters);
  },

  // Handle file uploads
  handleFileUpload(event) {
    console.log("File upload triggered");
    const files = event.target.files;

    if (!files || files.length === 0) {
      console.warn("No files selected");
      return;
    }

    console.log("Files selected:", files.length);

    Array.from(files).forEach((file, index) => {
      console.log(
        `Processing file ${index + 1}/${files.length}:`,
        file.name,
        file.type,
        file.size + "bytes"
      );

      if (!file.type.match("image.*")) {
        console.warn(`File ${file.name} is not an image, skipping`);
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        console.log(`File ${file.name} loaded successfully`);
        const imgURL = e.target.result;
        console.log(`Image URL (truncated): ${imgURL.substring(0, 30)}...`);

        this.uploads.push({
          url: imgURL,
          name: file.name,
        });
        console.log(
          `Added to uploads array, total count: ${this.uploads.length}`
        );

        // Add to the grid
        const container = document.getElementById("file-upload-con");
        if (container) {
          console.log("Upload container found, adding visual element");
          const imgElement = document.createElement("div");
          imgElement.className =
            "aspect-square border border-gray-200 rounded overflow-hidden";
          imgElement.innerHTML = `<img src="${imgURL}" alt="${file.name}" class="w-full h-full object-cover cursor-pointer">`;

          // Store reference to this for closure
          const self = this;
          imgElement.onclick = function () {
            console.log(`Image clicked: ${file.name}`);
            self.addImageToCanvas(imgURL);
          };

          container.appendChild(imgElement);
          console.log("Image added to visual grid");
        } else {
          console.error("Upload container element not found!");
        }
      };

      reader.onerror = (error) => {
        console.error(`Error reading file ${file.name}:`, error);
      };

      console.log(`Starting to read file ${file.name} as data URL`);
      reader.readAsDataURL(file);
    });
  },

  // Add an image to the canvas
  addImageToCanvas(url) {
    console.log("=== addImageToCanvas START ===");
    console.log("URL format (truncated):", url.substring(0, 40) + "...");

    // Check if fabric is available
    if (typeof fabric === "undefined") {
      console.error("Fabric.js is not available!");
      return;
    }

    // Check canvas availability
    console.log("Canvas availability check:", !!window.canvas);
    if (!window.canvas) {
      console.error("Canvas not available");
      return;
    }

    // Check filter availability
    this.checkFilterAvailability();

    console.log(
      "Canvas dimensions:",
      window.canvas.width,
      "x",
      window.canvas.height
    );
    console.log(
      "Canvas objects before adding:",
      window.canvas.getObjects().length
    );

    try {
      // Store reference to 'this' for use in callbacks
      const self = this;

      // Create a native DOM Image element first
      console.log("Creating DOM Image element");
      const imgElement = new Image();

      // Set up load event handler
      imgElement.onload = function () {
        console.log(
          "DOM Image loaded successfully:",
          this.width,
          "x",
          this.height
        );

        try {
          // Create Fabric.js Image object from the DOM Image
          console.log("Creating Fabric.js Image from DOM element");
          const fabricImage = new fabric.Image(imgElement, {
            left: window.canvas.width / 2,
            top: window.canvas.height / 2,
            originX: "center",
            originY: "center",
            name: "Uploaded Image",
          });

          console.log("Fabric Image created with properties:", {
            width: fabricImage.width,
            height: fabricImage.height,
            type: fabricImage.type,
          });

          // Define maximum dimensions for images
          const maxWidth = 400;
          const maxHeight = 300;

          console.log(
            "Original dimensions:",
            fabricImage.width,
            "x",
            fabricImage.height
          );

          // Calculate scale factor to fit within maximum dimensions
          const scaleX = maxWidth / fabricImage.width;
          const scaleY = maxHeight / fabricImage.height;
          const scale = Math.min(scaleX, scaleY, 1); // Use 1 as max to avoid upscaling small images

          // Apply scaling
          console.log("Scaling by factor:", scale);
          fabricImage.scale(scale);
          console.log(
            "Scaled dimensions:",
            fabricImage.width * scale,
            "x",
            fabricImage.height * scale
          );

          // Add to canvas with exception handling
          try {
            console.log("Adding Fabric Image to canvas...");
            window.canvas.add(fabricImage);
            console.log("Image added to canvas");
            console.log(
              "Canvas objects after adding:",
              window.canvas.getObjects().length
            );

            try {
              console.log("Setting as active object...");
              window.canvas.setActiveObject(fabricImage);
              console.log("Active object set");
              console.log(
                "Is image now active:",
                window.canvas.getActiveObject() === fabricImage
              );
            } catch (activeError) {
              console.error("Error setting active object:", activeError);
            }

            try {
              console.log("Rendering canvas...");
              window.canvas.renderAll();
              console.log("Canvas rendered");
            } catch (renderError) {
              console.error("Error rendering canvas:", renderError);
            }

            console.log("Image should now be visible on canvas");

            // Update the component state
            self.selectedObject = fabricImage;
            self.syncObjectProperties();
            console.log("Object properties synchronized");
          } catch (addError) {
            console.error("Error adding Fabric Image to canvas:", addError);
          }
        } catch (fabricError) {
          console.error("Error creating Fabric Image:", fabricError);
        }
      };

      // Set up error event handler
      imgElement.onerror = function (error) {
        console.error("Error loading DOM Image:", error);
      };

      // Set a crossOrigin attribute to handle potential CORS issues
      imgElement.crossOrigin = "anonymous";

      // Actually start loading the image
      console.log("Setting image src to trigger loading...");
      imgElement.src = url;
    } catch (e) {
      console.error("Exception in overall image loading process:", e);
    }

    console.log("=== addImageToCanvas END ===");
  },

  // Synchronize object properties
  syncObjectProperties() {
    console.log("Synchronizing object properties");
    if (!this.selectedObject) {
      console.warn("No selected object to synchronize");
      return;
    }

    const obj = this.selectedObject;
    console.log("Selected object:", obj.type);

    // Reset filters object to default values
    this.resetFilterValues();

    // Get current object properties
    this.objectProperties = {
      opacity: obj.opacity !== undefined ? obj.opacity : 1,
      stroke: obj.stroke || "#000000",
      strokeWidth: obj.strokeWidth !== undefined ? obj.strokeWidth : 0,
      radius: obj.clipPath ? obj.clipPath.rx || 0 : 0,
      skewX: obj.skewX || 0,
      skewY: obj.skewY || 0,
      fill: obj.fill || "#000000",
      shadowEnabled: !!obj.shadow,
      shadowColor: obj.shadow ? obj.shadow.color : "#dddddd",
      shadowBlur: obj.shadow ? obj.shadow.blur : 20,
      shadowOffsetX: obj.shadow ? obj.shadow.offsetX : 0,
      shadowOffsetY: obj.shadow ? obj.shadow.offsetY : 0,
    };

    console.log("Object properties synchronized:", this.objectProperties);
  },
  // Reset filter values
  resetFilterValues() {
    console.log("Resetting filter values");
    this.filters = {
      brightness: 0,
      contrast: 0,
      blur: 0,
      noise: 0,
      saturation: 0,
      hue: 0,
      pixelate: 0,
    };
    this.activeFilter = null;
    console.log("Filter values reset");
  },
  // Apply a preset filter
  applyPresetFilter(filterName) {
    console.log(`Applying preset filter: ${filterName}`);

    // Check if filters are available
    if (!this.filterAvailable) {
      console.warn("Filters are not available in this Fabric.js instance");
      return;
    }

    if (!this.selectedObject) {
      console.warn("No selected object for preset filter");
      return;
    }

    if (!window.canvas) {
      console.error("Canvas not available for preset filter");
      return;
    }

    if (this.selectedObject.type !== "image") {
      console.warn("Selected object is not an image");
      return;
    }

    // Use the custom filter implementation
    this.applyCustomFilter(filterName);
  },
  // Custom Filter View implementation
  applyCustomFilter(filterName) {
    console.log(`Applying custom filter: ${filterName}`);

    if (!this.selectedObject || !window.canvas) {
      console.warn("No selected object or canvas available");
      return;
    }

    if (this.selectedObject.type !== "image") {
      console.warn("Selected object is not an image");
      return;
    }

    // Set active filter name
    this.activeFilter = filterName;

    // Store the original image when first applying a filter
    if (!this.originalImage) {
      this.originalImage =
        this.selectedObject._originalElement || this.selectedObject._element;
      console.log("Original image stored for reference");
    }

    // Create a temporary canvas to apply filters
    const tempCanvas = document.createElement("canvas");

    // Use original image to avoid quality loss
    const imgElement = this.originalImage;

    // Set canvas size to match image
    tempCanvas.width = imgElement.width;
    tempCanvas.height = imgElement.height;
    const ctx = tempCanvas.getContext("2d");

    // Draw original image
    ctx.drawImage(imgElement, 0, 0);

    // Get image data for manipulation
    const imageData = ctx.getImageData(
      0,
      0,
      tempCanvas.width,
      tempCanvas.height
    );
    const data = imageData.data;

    // Apply filter effects based on filter name
    switch (filterName) {
      case "grayscale":
      case "black_white":
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = avg;
          data[i + 1] = avg;
          data[i + 2] = avg;
        }
        break;

      case "sepia":
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
          data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
          data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
        }
        break;

      case "invert":
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 255 - data[i];
          data[i + 1] = 255 - data[i + 1];
          data[i + 2] = 255 - data[i + 2];
        }
        break;

      case "brownie":
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          data[i] = r * 0.59 + g * 0.34 + b * 0.07;
          data[i + 1] = r * 0.31 + g * 0.54 + b * 0.15;
          data[i + 2] = r * 0.19 + g * 0.28 + b * 0.47;
        }
        break;

      case "kodachrome":
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Boost colors with cross-processing effect
          data[i] = Math.min(255, r * 1.2 + g * 0.1 + b * 0.1);
          data[i + 1] = Math.min(255, r * 0.1 + g * 1.1 + b * 0.1);
          data[i + 2] = Math.min(255, r * 0.1 + g * 0.1 + b * 1.3);
        }
        break;

      case "technicolor":
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          data[i] = Math.min(255, r * 1.3 - g * 0.1 - b * 0.1);
          data[i + 1] = Math.min(255, g * 1.2 - r * 0.1 - b * 0.1);
          data[i + 2] = Math.min(255, b * 1.2 - r * 0.1 - g * 0.1);
        }
        break;

      case "sharpen":
        // Sharpen using a convolution kernel
        {
          const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
          const side = Math.round(Math.sqrt(kernel.length));
          const halfSide = Math.floor(side / 2);
          const w = imageData.width;
          const h = imageData.height;

          // Create temp array for the convolution result
          const temp = new Uint8ClampedArray(data.length);

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              let r = 0,
                g = 0,
                b = 0;

              // Apply convolution kernel
              for (let ky = 0; ky < side; ky++) {
                for (let kx = 0; kx < side; kx++) {
                  const pixelX = Math.min(
                    w - 1,
                    Math.max(0, x + kx - halfSide)
                  );
                  const pixelY = Math.min(
                    h - 1,
                    Math.max(0, y + ky - halfSide)
                  );
                  const offset = (pixelY * w + pixelX) * 4;
                  const weight = kernel[ky * side + kx];

                  r += data[offset] * weight;
                  g += data[offset + 1] * weight;
                  b += data[offset + 2] * weight;
                }
              }

              // Write result to temp array
              const dstOffset = (y * w + x) * 4;
              temp[dstOffset] = Math.min(255, Math.max(0, r));
              temp[dstOffset + 1] = Math.min(255, Math.max(0, g));
              temp[dstOffset + 2] = Math.min(255, Math.max(0, b));
              temp[dstOffset + 3] = data[dstOffset + 3]; // Keep original alpha
            }
          }

          // Copy temp array back to data
          for (let i = 0; i < data.length; i++) {
            data[i] = temp[i];
          }
        }
        break;

      case "emboss":
        // Emboss effect using convolution
        {
          const kernel = [1, 1, 1, 1, 0.7, -1, -1, -1, -1];
          const side = Math.round(Math.sqrt(kernel.length));
          const halfSide = Math.floor(side / 2);
          const w = imageData.width;
          const h = imageData.height;

          // Create temp array for the convolution result
          const temp = new Uint8ClampedArray(data.length);

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              let r = 0,
                g = 0,
                b = 0;

              // Apply convolution kernel
              for (let ky = 0; ky < side; ky++) {
                for (let kx = 0; kx < side; kx++) {
                  const pixelX = Math.min(
                    w - 1,
                    Math.max(0, x + kx - halfSide)
                  );
                  const pixelY = Math.min(
                    h - 1,
                    Math.max(0, y + ky - halfSide)
                  );
                  const offset = (pixelY * w + pixelX) * 4;
                  const weight = kernel[ky * side + kx];

                  r += data[offset] * weight;
                  g += data[offset + 1] * weight;
                  b += data[offset + 2] * weight;
                }
              }

              // Write result to temp array
              const dstOffset = (y * w + x) * 4;
              temp[dstOffset] = Math.min(255, Math.max(0, r));
              temp[dstOffset + 1] = Math.min(255, Math.max(0, g));
              temp[dstOffset + 2] = Math.min(255, Math.max(0, b));
              temp[dstOffset + 3] = data[dstOffset + 3]; // Keep original alpha
            }
          }

          // Copy temp array back to data
          for (let i = 0; i < data.length; i++) {
            data[i] = temp[i];
          }
        }
        break;

      case "polaroid":
        // Warm colors + vignette effect
        for (let i = 0; i < data.length; i += 4) {
          // First, warm the colors (increase red, decrease blue)
          data[i] = Math.min(255, data[i] * 1.1); // More red
          data[i + 2] = Math.min(255, data[i + 2] * 0.9); // Less blue

          // Add slight contrast
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] += (data[i] - avg) * 0.1;
          data[i + 1] += (data[i + 1] - avg) * 0.1;
          data[i + 2] += (data[i + 2] - avg) * 0.1;

          // Ensure values are in valid range
          data[i] = Math.min(255, Math.max(0, data[i]));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1]));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2]));
        }
        break;

      case "vintage":
        // Vintage effect (sepia + desaturation + slight contrast adjustment)
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // First apply sepia
          let newR = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
          let newG = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
          let newB = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);

          // Then reduce contrast slightly
          const grey = 0.2989 * newR + 0.587 * newG + 0.114 * newB; // Luminance
          const factor = 0.15; // Contrast reduction factor

          newR = grey + (1 - factor) * (newR - grey);
          newG = grey + (1 - factor) * (newG - grey);
          newB = grey + (1 - factor) * (newB - grey);

          data[i] = Math.min(255, Math.max(0, newR));
          data[i + 1] = Math.min(255, Math.max(0, newG));
          data[i + 2] = Math.min(255, Math.max(0, newB));
        }
        break;
    }

    // Put modified pixels back
    ctx.putImageData(imageData, 0, 0);

    // Create new image from filtered canvas
    const newImg = new Image();
    newImg.onload = () => {
      // Replace the image element in the Fabric.js object
      this.selectedObject._element = newImg;

      // Force a re-render
      this.selectedObject.dirty = true;
      window.canvas.renderAll();
      console.log("Custom filter applied successfully");
    };
    newImg.src = tempCanvas.toDataURL();
  },
  applyFilter(type, value) {
    // Update internal tracking
    this.filters[type] = parseFloat(value);

    // Only handle brightness for now
    if (type === "brightness" && this.selectedObject) {
      const brightnessValue = parseFloat(value);

      // Reset previous filters
      this.selectedObject.filters = [];

      // Safely apply brightness filter
      if (brightnessValue !== 0) {
        // Create a clone of the original image to prevent data loss
        if (!this.selectedObject.originalImage) {
          const originalSrc = this.selectedObject.getSrc();
          const originalWidth = this.selectedObject.width;
          const originalHeight = this.selectedObject.height;

          // Store original image details
          this.selectedObject.originalImage = {
            src: originalSrc,
            width: originalWidth,
            height: originalHeight,
          };
        }

        // Adjust brightness safely
        const brightnessFilter = new fabric.Image.filters.Brightness({
          brightness: Math.max(0.1, 1 + brightnessValue),
        });

        this.selectedObject.filters.push(brightnessFilter);
      }

      // Apply filters
      this.selectedObject.applyFilters();

      // Render canvas
      window.canvas.renderAll();
    }
  },
  // Reset all filters
  resetFilters() {
    if (!this.selectedObject || !this.originalImage) {
      return;
    }

    try {
      // Reset our tracking filters object
      this.resetFilterValues();

      // Create a new image with the original source
      const newImg = new Image();

      newImg.onload = () => {
        // Get properties of current object
        const props = {
          scaleX: this.selectedObject.scaleX,
          scaleY: this.selectedObject.scaleY,
          left: this.selectedObject.left,
          top: this.selectedObject.top,
          angle: this.selectedObject.angle || 0,
          flipX: this.selectedObject.flipX || false,
          flipY: this.selectedObject.flipY || false,
          originX: this.selectedObject.originX || "center",
          originY: this.selectedObject.originY || "center",
        };

        // Create a new fabric image
        const fabricImg = new fabric.Image(newImg, props);

        // Replace current object
        const objIndex = window.canvas
          .getObjects()
          .indexOf(this.selectedObject);
        if (objIndex !== -1) {
          window.canvas.remove(this.selectedObject);
          window.canvas.insertAt(fabricImg, objIndex);
          window.canvas.setActiveObject(fabricImg);
          this.selectedObject = fabricImg;
        } else {
          window.canvas.add(fabricImg);
          window.canvas.setActiveObject(fabricImg);
          this.selectedObject = fabricImg;
        }

        window.canvas.renderAll();
      };

      newImg.src = this.originalImage.src;
    } catch (error) {
      console.error("Error resetting filters:", error);
    }
  },
  // Update object property
  updateObjectProperty(property, value) {
    console.log(`Updating object property: ${property} to ${value}`);

    // Ensure we have a selected object and canvas
    if (!this.selectedObject) {
      console.error("No selected object available");
      return;
    }

    if (!window.canvas) {
      console.error("Canvas not available");
      return;
    }

    // Convert value based on property type
    let finalValue;
    switch (property) {
      case "opacity":
      case "strokeWidth":
      case "skewX":
      case "skewY":
        finalValue = parseFloat(value);
        if (isNaN(finalValue)) {
          console.warn(`Invalid number for ${property}: ${value}`);
          return;
        }
        break;
      case "stroke":
      case "fill":
        finalValue = value; // Colors are strings
        break;
      default:
        console.warn(`Unhandled property: ${property}`);
        finalValue = value; // Default to raw value
        break;
    }

    // Apply the property to the selected object
    console.log(`Setting ${property} = ${finalValue} on object`);
    try {
      // Set the property on the object
      this.selectedObject.set(property, finalValue);

      // Special case for stroke: need to make sure strokeWidth is non-zero
      if (property === "stroke" && this.selectedObject.strokeWidth === 0) {
        console.log("Stroke color set but width is 0. Setting default width.");
        this.selectedObject.set("strokeWidth", 1);
        this.objectProperties.strokeWidth = 1;
      }
    } catch (e) {
      console.error(`Error setting property ${property}:`, e);
      return;
    }

    // Update local state (objectProperties)
    if (property in this.objectProperties) {
      console.log(`Updating objectProperties.${property}`);
      this.objectProperties[property] = finalValue;
    } else {
      console.warn(`Property ${property} not in objectProperties`);
    }

    // Special handling for radius (if called directly, though typically via updateClipPath)
    if (property === "radius") {
      console.log("Calling updateClipPath for radius property");
      this.updateClipPath(finalValue);
    }

    // Re-render the canvas
    console.log("Rendering canvas after property update");
    try {
      window.canvas.renderAll();
      console.log("Canvas rendered successfully");
    } catch (e) {
      console.error("Error rendering canvas:", e);
    }
  },
}));

// Drawing Panel Component
Alpine.data("drawingPanel", () => ({
  isActive: false,
  activeTab: "brush",

  // Brush settings
  brushSettings: {
    size: 20,
    opacity: 1,
    color: "#264653",
  },

  // Eraser settings
  eraserSettings: {
    size: 20,
    invert: false,
  },

  // Pencil settings
  pencilSettings: {
    brushType: "Pencil",
    size: 20,
    shadowWidth: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    color: "#333333",
    shadowColor: "#000000",
  },

  // Store original canvas state for undo/redo
  canvasHistory: [],
  historyIndex: -1,
  maxHistorySteps: 20,

  init() {
    // Listen for tool changes
    window.addEventListener("tool-changed", (e) => {
      const wasActive = this.isActive;
      this.isActive = e.detail.type === "drawing";

      // Toggle drawing mode based on activation
      if (this.isActive && !wasActive) {
        this.activateDrawingMode();
      } else if (!this.isActive && wasActive) {
        this.deactivateDrawingMode();
      }
    });

    // Add watchers for settings changes
    this.$watch(
      "brushSettings",
      () => {
        if (this.isActive && this.activeTab === "brush") {
          this.setupBrush();
        }
      },
      { deep: true }
    );

    this.$watch(
      "eraserSettings",
      () => {
        if (this.isActive && this.activeTab === "eraser") {
          this.setupEraser();
        }
      },
      { deep: true }
    );

    this.$watch(
      "pencilSettings",
      () => {
        if (this.isActive && this.activeTab === "pencil") {
          this.setupPencil();
        }
      },
      { deep: true }
    );

    // Add tab change listener
    this.$watch("activeTab", (newTab) => {
      if (this.isActive) {
        this.updateDrawingMode(newTab);
      }
    });

    // Add canvas history events
    this.setupCanvasHistory();
  },

  // Setup canvas history tracking
  setupCanvasHistory() {
    if (!window.canvas) return;

    // Save initial state
    this.saveCanvasState();

    // Add event listener for object modifications
    window.canvas.on("object:added", () => this.saveCanvasState());
    window.canvas.on("object:modified", () => this.saveCanvasState());
    window.canvas.on("object:removed", () => this.saveCanvasState());
  },

  // Save current canvas state
  saveCanvasState() {
    if (!window.canvas) return;

    // Don't save if we're in the middle of applying history
    if (this._applyingHistory) return;

    try {
      // Get JSON representation of canvas
      const json = window.canvas.toJSON();

      // Remove any states beyond current index
      if (this.historyIndex < this.canvasHistory.length - 1) {
        this.canvasHistory = this.canvasHistory.slice(0, this.historyIndex + 1);
      }

      // Add new state
      this.canvasHistory.push(json);

      // Trim history if too long
      if (this.canvasHistory.length > this.maxHistorySteps) {
        this.canvasHistory.shift();
      } else {
        this.historyIndex++;
      }
    } catch (error) {
      console.error("Error saving canvas state:", error);
    }
  },

  // Undo last action
  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.applyCanvasState(this.canvasHistory[this.historyIndex]);
  },

  // Redo last undone action
  redo() {
    if (this.historyIndex >= this.canvasHistory.length - 1) return;
    this.historyIndex++;
    this.applyCanvasState(this.canvasHistory[this.historyIndex]);
  },

  // Apply a saved canvas state
  applyCanvasState(state) {
    if (!window.canvas) return;

    try {
      this._applyingHistory = true;
      window.canvas.loadFromJSON(state, () => {
        window.canvas.renderAll();
        this._applyingHistory = false;
      });
    } catch (error) {
      console.error("Error applying canvas state:", error);
      this._applyingHistory = false;
    }
  },

  // Update brush preview (UI only)
  updateBrushPreview() {
    // This is handled by Alpine.js binding in the template
    if (this.isActive) {
      this.updateDrawingMode(this.activeTab);
    }
  },

  // Activate drawing mode on the canvas
  activateDrawingMode() {
    if (!window.canvas) {
      console.error("Canvas not found!");
      return;
    }

    // Enable Fabric.js free drawing mode
    window.canvas.isDrawingMode = true;

    // Apply current settings based on active tab
    this.updateDrawingMode(this.activeTab);
  },

  // Update drawing mode based on active tab
  updateDrawingMode(tabName) {
    if (!window.canvas) {
      console.error("Canvas not found when updating drawing mode");
      return;
    }

    // Clean up previous mode
    this.deactivateDrawingMode();

    this.activeTab = tabName;

    switch (tabName) {
      case "brush":
        this.setupBrush();
        break;
      case "eraser":
        this.setupEraser();
        break;
      case "pencil":
        this.setupPencil();
        break;
    }
  },

  // Setup brush drawing
  setupBrush() {
    if (!window.canvas) return;

    try {
      // Create a new brush
      const brush = new fabric.PencilBrush(window.canvas);

      // Set brush properties
      brush.width = parseInt(this.brushSettings.size);
      const opacity = parseFloat(this.brushSettings.opacity);

      // Set opacity through rgba color if opacity is less than 1
      if (opacity < 1) {
        // Parse the hex color to rgb
        const hex = this.brushSettings.color.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        brush.color = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      } else {
        brush.color = this.brushSettings.color;
      }

      // Apply brush to canvas
      window.canvas.freeDrawingBrush = brush;
      window.canvas.isDrawingMode = true;
    } catch (error) {
      console.error("Error setting up brush:", error);
    }
  },

  // Setup eraser - improved version
  setupEraser() {
    if (!window.canvas) return;

    try {
      // Create a composite eraser using destination-out blend mode
      const eraserBrush = new fabric.PencilBrush(window.canvas);
      eraserBrush.width = parseInt(this.eraserSettings.size);
      eraserBrush.color = this.eraserSettings.invert
        ? "rgba(0,0,0,1)"
        : "rgba(255,255,255,1)";

      // Store original path creation method
      const originalCreatePath = fabric.PencilBrush.prototype._renderPath;

      // Override the internal method to create paths with 'destination-out' blend mode
      fabric.PencilBrush.prototype._renderPath = function (ctx) {
        ctx.globalCompositeOperation = "destination-out";
        originalCreatePath.call(this, ctx);
        ctx.globalCompositeOperation = "source-over"; // Reset to default
      };

      // Apply eraser brush to canvas
      window.canvas.freeDrawingBrush = eraserBrush;
      window.canvas.isDrawingMode = true;

      // Save the original method so we can restore it later
      window.canvas._originalCreatePath = originalCreatePath;

      // Add a path complete handler to add the eraser path as a real path
      if (!window.canvas._pathCreatedHandler) {
        window.canvas._pathCreatedHandler = (options) => {
          // Get the current path
          const path = options.path;

          // Mark this path as an eraser path
          path.eraserPath = true;

          // Save canvas state after erasing
          this.saveCanvasState();
        };

        window.canvas.on("path:created", window.canvas._pathCreatedHandler);
      }
    } catch (error) {
      console.error("Error setting up eraser:", error);
    }
  },

  // Clean up when switching tools
  deactivateDrawingMode() {
    if (!window.canvas) return;

    // Disable drawing mode
    window.canvas.isDrawingMode = false;

    // Restore original path creation method if it was overridden by eraser
    if (window.canvas._originalCreatePath) {
      fabric.PencilBrush.prototype._renderPath =
        window.canvas._originalCreatePath;
      delete window.canvas._originalCreatePath;
    }

    // Remove path created handler if it exists
    if (window.canvas._pathCreatedHandler) {
      window.canvas.off("path:created", window.canvas._pathCreatedHandler);
      delete window.canvas._pathCreatedHandler;
    }

    // Clean up eraser event handlers
    if (window.canvas.__eraser_mousedown) {
      window.canvas.off("mouse:down", window.canvas.__eraser_mousedown);
      delete window.canvas.__eraser_mousedown;
    }

    if (window.canvas.__eraser_mousemove) {
      window.canvas.off("mouse:move", window.canvas.__eraser_mousemove);
      delete window.canvas.__eraser_mousemove;
    }

    if (window.canvas.__eraser_mouseup) {
      window.canvas.off("mouse:up", window.canvas.__eraser_mouseup);
      delete window.canvas.__eraser_mouseup;
    }
  },

  // Setup pencil with different brush types
  setupPencil() {
    if (!window.canvas) return;

    try {
      let brush;
      const brushType = this.pencilSettings.brushType;
      const size = parseInt(this.pencilSettings.size);
      const color = this.pencilSettings.color;

      // Create brush based on type
      switch (brushType) {
        case "Circle":
          brush =
            typeof fabric.CircleBrush === "function"
              ? new fabric.CircleBrush(window.canvas)
              : new fabric.PencilBrush(window.canvas);
          break;

        case "Spray":
          brush =
            typeof fabric.SprayBrush === "function"
              ? new fabric.SprayBrush(window.canvas)
              : new fabric.PencilBrush(window.canvas);
          break;

        case "hLine":
        case "vLine":
        case "square":
        case "diamond":
        case "texture":
          if (typeof fabric.PatternBrush === "function") {
            brush = new fabric.PatternBrush(window.canvas);
            brush.getPatternSrc = () => {
              const patternCanvas = document.createElement("canvas");
              const ctx = patternCanvas.getContext("2d");
              patternCanvas.width = patternCanvas.height = 10;

              ctx.fillStyle = color;

              switch (brushType) {
                case "hLine":
                  ctx.fillRect(0, 5, 10, 1);
                  break;
                case "vLine":
                  ctx.fillRect(5, 0, 1, 10);
                  break;
                case "square":
                  ctx.fillRect(2, 2, 6, 6);
                  break;
                case "diamond":
                  ctx.beginPath();
                  ctx.moveTo(5, 0);
                  ctx.lineTo(10, 5);
                  ctx.lineTo(5, 10);
                  ctx.lineTo(0, 5);
                  ctx.closePath();
                  ctx.fill();
                  break;
                case "texture":
                  ctx.fillRect(1, 1, 2, 2);
                  ctx.fillRect(5, 5, 2, 2);
                  ctx.fillRect(8, 2, 1, 1);
                  ctx.fillRect(2, 8, 1, 1);
                  break;
              }

              return patternCanvas;
            };
          } else {
            brush = new fabric.PencilBrush(window.canvas);
          }
          break;

        default:
          brush = new fabric.PencilBrush(window.canvas);
      }

      // Apply common properties
      brush.width = size;
      brush.color = color;

      // Apply shadow if enabled
      if (parseInt(this.pencilSettings.shadowWidth) > 0) {
        try {
          brush.shadow = new fabric.Shadow({
            blur: parseInt(this.pencilSettings.shadowWidth),
            offsetX: parseInt(this.pencilSettings.shadowOffsetX),
            offsetY: parseInt(this.pencilSettings.shadowOffsetY),
            color: this.pencilSettings.shadowColor,
          });
        } catch (error) {
          console.error("Error setting shadow:", error);
        }
      }

      // Apply brush to canvas
      window.canvas.freeDrawingBrush = brush;
      window.canvas.isDrawingMode = true;
    } catch (error) {
      console.error("Error setting up pencil:", error);
    }
  },
}));

// Layers Panel Component - Compatible Version
Alpine.data("layersPanel", () => ({
  isActive: false,
  layers: [],
  selectedLayerId: null,

  init() {
    // Listen for tool changes
    window.addEventListener("tool-changed", (e) => {
      this.isActive = e.detail.type === "layers";
      if (this.isActive) {
        this.updateLayers();
      }
    });

    // Update layers when canvas changes
    window.addEventListener("object:added", () => this.updateLayers());
    window.addEventListener("object:removed", () => this.updateLayers());
    window.addEventListener("object:modified", () => this.updateLayers());
    window.addEventListener("canvas:updated", () => this.updateLayers());

    // Listen for selection changes
    window.addEventListener("object:selected", (e) => {
      if (e.detail) {
        if (!e.detail.id) {
          e.detail.id = this.generateId();
        }
        this.selectedLayerId = e.detail.id;
      }
    });

    window.addEventListener("selection:cleared", () => {
      this.selectedLayerId = null;
    });

    // Initial layer update
    this.updateLayers();
  },

  // Update the layers list from canvas objects
  updateLayers() {
    if (!window.canvas) return;

    const objects = window.canvas.getObjects();

    // Assign IDs to objects that don't have them
    objects.forEach((obj) => {
      if (!obj.id) {
        obj.id = this.generateId();
      }
    });

    this.layers = objects
      .map((obj, idx) => ({
        id: obj.id,
        name: obj.name || this.getObjectTypeName(obj),
        type: obj.type,
        visible: obj.visible !== false, // Use obj.visible, default to true
        object: obj,
      }))
      .reverse(); // Top layer at index 0

    console.log("Layers updated:", this.layers);
  },

  // Generate a unique ID for objects
  generateId() {
    return "_" + Math.random().toString(36).substr(2, 9);
  },

  // Get a human-readable name based on object type
  getObjectTypeName(obj) {
    switch (obj.type) {
      case "text":
        return `Text: ${
          obj.text
            ? obj.text.substr(0, 15) + (obj.text.length > 15 ? "..." : "")
            : "Text"
        }`;
      case "image":
        return "Image";
      case "rect":
        return "Rectangle";
      case "circle":
        return "Circle";
      case "path":
        return "Drawing";
      case "group":
        return "Group";
      default:
        return `Layer ${this.layers.length + 1}`;
    }
  },

  // Select a layer
  selectLayer(layer) {
    if (!window.canvas) return;

    window.canvas.discardActiveObject();
    window.canvas.setActiveObject(layer.object);
    this.selectedLayerId = layer.id;
    window.canvas.renderAll();
  },

  // Toggle layer visibility
  toggleLayerVisibility(layer) {
    if (!window.canvas) return;

    layer.visible = !layer.visible;
    layer.object.visible = layer.visible;
    window.canvas.renderAll();
  },

  // Move layer up (toward front)
  moveLayerUp(index) {
    if (!window.canvas || index === 0) return; // Top layer can't move up

    try {
      const objects = window.canvas.getObjects();
      // The real index in the canvas objects array
      const canvasIndex = objects.length - 1 - index;

      if (canvasIndex < objects.length - 1) {
        // Get the object to move
        const objectToMove = objects[canvasIndex];

        // Create a new array with the object moved one position higher
        const newObjects = [...objects];
        newObjects.splice(canvasIndex, 1); // Remove from current position
        newObjects.splice(canvasIndex + 1, 0, objectToMove); // Insert at new position

        // Clear canvas and re-add objects in the new order
        window.canvas.clear();
        newObjects.forEach((obj) => window.canvas.add(obj));

        window.canvas.renderAll();
        this.updateLayers();

        console.log("Layer moved up:", index);
      }
    } catch (error) {
      console.error("Error moving layer up:", error);
    }
  },

  // Move layer down (toward back)
  moveLayerDown(index) {
    if (!window.canvas || index === this.layers.length - 1) return; // Bottom layer can't move down

    try {
      const objects = window.canvas.getObjects();
      // The real index in the canvas objects array
      const canvasIndex = objects.length - 1 - index;

      if (canvasIndex > 0) {
        // Get the object to move
        const objectToMove = objects[canvasIndex];

        // Create a new array with the object moved one position lower
        const newObjects = [...objects];
        newObjects.splice(canvasIndex, 1); // Remove from current position
        newObjects.splice(canvasIndex - 1, 0, objectToMove); // Insert at new position

        // Clear canvas and re-add objects in the new order
        window.canvas.clear();
        newObjects.forEach((obj) => window.canvas.add(obj));

        window.canvas.renderAll();
        this.updateLayers();

        console.log("Layer moved down:", index);
      }
    } catch (error) {
      console.error("Error moving layer down:", error);
    }
  },

  // Delete a layer - new implementation using object ID
  deleteLayer(layer) {
    if (!window.canvas || !layer) {
      console.error("Cannot delete layer: Invalid layer");
      return;
    }

    try {
      // Get all canvas objects
      const objects = window.canvas.getObjects();

      // Find the object on the canvas by its ID
      const objectId = layer.id;
      let objectToRemove = null;

      // First try to find the exact object reference
      let objectIndex = objects.indexOf(layer.object);

      // If direct reference not found, find by ID
      if (objectIndex === -1) {
        for (let i = 0; i < objects.length; i++) {
          if (objects[i].id === objectId) {
            objectToRemove = objects[i];
            objectIndex = i;
            break;
          }
        }
      } else {
        objectToRemove = layer.object;
      }

      if (objectToRemove) {
        console.log(
          "Found object to delete:",
          objectId,
          "at index:",
          objectIndex
        );

        // If this is the currently selected object, clear the selection first
        if (this.selectedLayerId === objectId) {
          window.canvas.discardActiveObject();
          this.selectedLayerId = null;
        }

        // Remove the object from canvas
        window.canvas.remove(objectToRemove);
        window.canvas.renderAll();

        // Update the layers list
        this.updateLayers();

        console.log("Layer deleted successfully");
      } else {
        console.error("Object with ID not found in canvas:", objectId);

        // As a last resort, try removing directly using a new approach
        if (typeof window.canvas._objects !== "undefined") {
          console.log("Attempting alternate deletion method");

          // Try to find the object in the internal _objects array
          for (let i = 0; i < window.canvas._objects.length; i++) {
            if (window.canvas._objects[i].id === objectId) {
              // Remove it directly from the _objects array
              window.canvas._objects.splice(i, 1);
              window.canvas.renderAll();
              this.updateLayers();
              console.log("Layer deleted using alternate method");
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error deleting layer:", error);
    }
  },
}));

// Clip Arts Panel Component
Alpine.data("clipArtsPanel", () => ({
  isActive: false,

  init() {
    // Listen for tool changes
    window.addEventListener("tool-changed", (e) => {
      this.isActive = e.detail.type === "clip_arts";
    });
  },

  // Add a clip art to the canvas
  addClipArt(url) {
    if (!window.canvas) return;

    fabric.Image.fromURL(url, (img) => {
      // Scale the image to a reasonable size
      const maxDimension = 200;
      if (img.width > maxDimension || img.height > maxDimension) {
        const scaleFactor = Math.min(
          maxDimension / img.width,
          maxDimension / img.height
        );
        img.scale(scaleFactor);
      }

      // Position the image in the center of the canvas
      img.set({
        left: window.canvas.width / 2,
        top: window.canvas.height / 2,
        originX: "center",
        originY: "center",
        name: "Clip Art",
      });

      // Add the image to the canvas
      window.canvas.add(img);
      window.canvas.setActiveObject(img);
      window.canvas.renderAll();

      // Dispatch event for other components to know about the new object
      window.dispatchEvent(
        new CustomEvent("object:added", {
          detail: img,
        })
      );
    });
  },
}));

// Mask Panel Component
Alpine.data("maskPanel", () => ({
  isActive: false,

  init() {
    // Listen for tool changes
    window.addEventListener("tool-changed", (e) => {
      this.isActive = e.detail.type === "mask";
    });
  },

  // Apply a mask to the currently selected object
  applyMask(maskUrl) {
    if (!window.canvas) return;

    const activeObject = window.canvas.getActiveObject();
    if (!activeObject) {
      // Alert user to select an object first
      alert("Please select an image to apply a mask to");
      return;
    }

    // Check if the active object is an image
    if (activeObject.type !== "image") {
      alert("Masks can only be applied to images");
      return;
    }

    // Load the mask SVG
    fabric.loadSVGFromURL(maskUrl, (objects, options) => {
      // Create a group from all the SVG objects
      const svgGroup = fabric.util.groupSVGElements(objects, options);

      // Scale and position the mask to match the image
      svgGroup.set({
        scaleX: (activeObject.width * activeObject.scaleX) / svgGroup.width,
        scaleY: (activeObject.height * activeObject.scaleY) / svgGroup.height,
        originX: "center",
        originY: "center",
      });

      // Apply the mask as clipPath
      activeObject.clipPath = svgGroup;

      // Update the canvas
      window.canvas.renderAll();
    });
  },
}));

// Quick Options Bar Component
Alpine.data("quickOptionsBar", () => ({
  hasSelection: false,
  canCrop: false,
  cropActive: false,
  cropInstance: null,

  init() {
    // Listen for canvas initialization
    window.addEventListener("canvas:initialized", () => {
      // Listen for selection changes
      window.canvas.on("selection:created", this.handleSelection.bind(this));
      window.canvas.on("selection:updated", this.handleSelection.bind(this));
      window.canvas.on(
        "selection:cleared",
        this.handleSelectionCleared.bind(this)
      );
    });
  },

  // Handle selection on canvas
  handleSelection(e) {
    const activeObject = e.selected
      ? e.selected[0]
      : window.canvas.getActiveObject();
    this.hasSelection = !!activeObject;

    // Check if the selected object is an image (can be cropped)
    this.canCrop = activeObject && activeObject.type === "image";
  },

  // Handle selection cleared
  handleSelectionCleared() {
    this.hasSelection = false;
    this.canCrop = false;
  },

  // Align selected objects
  alignObjects(alignType) {
    if (!window.canvas || !this.hasSelection) return;

    const activeObject = window.canvas.getActiveObject();
    if (!activeObject) return;

    // Get canvas dimensions
    const canvasWidth = window.canvas.width;
    const canvasHeight = window.canvas.height;

    // Calculate new position based on alignment type
    let newLeft, newTop;

    switch (alignType) {
      case "left":
        newLeft = activeObject.getScaledWidth() / 2;
        activeObject.set({ left: newLeft, originX: "center" });
        break;
      case "centerH":
        window.canvas.centerObjectH(activeObject);
        break;
      case "right":
        newLeft = canvasWidth - activeObject.getScaledWidth() / 2;
        activeObject.set({ left: newLeft, originX: "center" });
        break;
      case "top":
        newTop = activeObject.getScaledHeight() / 2;
        activeObject.set({ top: newTop, originY: "center" });
        break;
      case "centerV":
        window.canvas.centerObjectV(activeObject);
        break;
      case "bottom":
        newTop = canvasHeight - activeObject.getScaledHeight() / 2;
        activeObject.set({ top: newTop, originY: "center" });
        break;
    }

    // Update canvas
    window.canvas.renderAll();
  },

  // Start crop mode
  startCrop() {
    if (!window.canvas || !this.canCrop) return;

    const activeObject = window.canvas.getActiveObject();
    if (!activeObject || activeObject.type !== "image") return;

    // Enable crop mode
    this.cropActive = true;

    // Store original object properties
    this.originalImageState = {
      scaleX: activeObject.scaleX,
      scaleY: activeObject.scaleY,
      left: activeObject.left,
      top: activeObject.top,
      width: activeObject.width,
      height: activeObject.height,
    };

    // Create a crop rect (simulating a crop interface)
    const cropRect = new fabric.Rect({
      left: activeObject.left,
      top: activeObject.top,
      width: activeObject.width * activeObject.scaleX,
      height: activeObject.height * activeObject.scaleY,
      fill: "rgba(0,0,0,0)",
      stroke: "#2196F3",
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      cornerColor: "#2196F3",
      cornerSize: 10,
      transparentCorners: false,
      hasRotatingPoint: false,
    });

    // Add the crop rect to canvas
    window.canvas.add(cropRect);
    window.canvas.setActiveObject(cropRect);
    this.cropInstance = cropRect;

    window.canvas.renderAll();
  },

  // Apply crop
  applyCrop() {
    if (!window.canvas || !this.cropActive || !this.cropInstance) return;

    // Get the active image
    const image = window.canvas
      .getObjects()
      .find((obj) => obj.type === "image");
    if (!image) {
      this.resetCrop();
      return;
    }

    // Get crop rect dimensions and position
    const cropRect = this.cropInstance;

    // Apply the crop (this is a simplified version - real implementation would be more complex)
    // Real implementation would use Fabric.js specific cropping logic

    // Remove crop interface
    window.canvas.remove(this.cropInstance);
    this.cropInstance = null;
    this.cropActive = false;

    // Update canvas
    window.canvas.renderAll();
  },

  // Reset crop
  resetCrop() {
    if (!window.canvas || !this.cropActive || !this.cropInstance) return;

    // Remove crop interface without applying changes
    window.canvas.remove(this.cropInstance);
    this.cropInstance = null;
    this.cropActive = false;

    // Restore original image state if needed
    const image = window.canvas
      .getObjects()
      .find((obj) => obj.type === "image");
    if (image && this.originalImageState) {
      image.set(this.originalImageState);
    }

    // Update canvas
    window.canvas.renderAll();
  },

  // Delete selected object
  deleteSelected() {
    if (!window.canvas || !this.hasSelection) return;

    const activeObject = window.canvas.getActiveObject();
    if (!activeObject) return;

    window.canvas.remove(activeObject);
    this.hasSelection = false;
    window.canvas.renderAll();
  },
}));

// Export Functions Component
Alpine.data("exportFunctions", () => ({
  exportInProgress: false,

  // Download canvas as PNG
  downloadPNG() {
    if (!window.canvas || this.exportInProgress) return;

    this.exportInProgress = true;

    try {
      // Create a download link
      const link = document.createElement("a");
      link.download = "steve-editor-design.png";

      // Get the canvas data URL
      link.href = window.canvas.toDataURL({
        format: "png",
        quality: 1,
      });

      // Trigger the download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting as PNG:", error);
    } finally {
      this.exportInProgress = false;
    }
  },

  // Download canvas as JPG
  downloadJPG() {
    if (!window.canvas || this.exportInProgress) return;

    this.exportInProgress = true;

    try {
      // Save current background color
      const originalBgColor = window.canvas.backgroundColor;

      // For JPG, we need a solid background (white)
      if (!originalBgColor) {
        window.canvas.setBackgroundColor("#ffffff", () => {
          window.canvas.renderAll();

          // Export with white background
          this.triggerJPGDownload();

          // Restore original background
          window.canvas.setBackgroundColor(originalBgColor || "", () => {
            window.canvas.renderAll();
          });
        });
      } else {
        // Already has a background, just export
        this.triggerJPGDownload();
      }
    } catch (error) {
      console.error("Error exporting as JPG:", error);
      this.exportInProgress = false;
    }
  },

  // Helper function to trigger the actual JPG download
  triggerJPGDownload() {
    // Create a download link
    const link = document.createElement("a");
    link.download = "steve-editor-design.jpg";

    // Get the canvas data URL as JPG
    link.href = window.canvas.toDataURL({
      format: "jpeg",
      quality: 0.9,
    });

    // Trigger the download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.exportInProgress = false;
  },
}));

// Canvas Utilities
Alpine.data("canvasUtilities", () => ({
  // Center all objects on canvas
  centerAll() {
    if (!window.canvas) return;

    const objects = window.canvas.getObjects();
    if (objects.length === 0) return;

    // Create a selection of all objects
    const selection = new fabric.ActiveSelection(objects, {
      canvas: window.canvas,
    });

    // Center the selection
    window.canvas.centerObject(selection);

    // Discard the selection
    window.canvas.discardActiveObject();
    window.canvas.renderAll();
  },

  // Fit content to canvas bounds
  fitToCanvas() {
    if (!window.canvas) return;

    const objects = window.canvas.getObjects();
    if (objects.length === 0) return;

    // Create a selection of all objects
    const selection = new fabric.ActiveSelection(objects, {
      canvas: window.canvas,
    });

    // Get canvas dimensions with some padding
    const padding = 20;
    const canvasWidth = window.canvas.width - padding * 2;
    const canvasHeight = window.canvas.height - padding * 2;

    // Calculate scaling needed to fit
    const selectionWidth = selection.width * selection.scaleX;
    const selectionHeight = selection.height * selection.scaleY;

    if (selectionWidth > canvasWidth || selectionHeight > canvasHeight) {
      const scaleX = canvasWidth / selectionWidth;
      const scaleY = canvasHeight / selectionHeight;
      const scale = Math.min(scaleX, scaleY);

      // Apply scaling to all objects
      objects.forEach((obj) => {
        obj.scaleX *= scale;
        obj.scaleY *= scale;
        obj.left *= scale;
        obj.top *= scale;
      });
    }

    // Center everything
    this.centerAll();

    // Discard the selection
    window.canvas.discardActiveObject();
    window.canvas.renderAll();
  },

  // Clear the canvas completely
  clearCanvas() {
    if (!window.canvas) return;

    if (
      confirm(
        "Are you sure you want to clear the canvas? This action cannot be undone."
      )
    ) {
      window.canvas.clear();
      window.canvas.setBackgroundColor("#ffffff", () => {
        window.canvas.renderAll();
      });
    }
  },
}));

// Settings Panel Component
Alpine.data("settingsPanel", () => ({
  isActive: false,
  customSizeVisible: false,
  backgroundColor: "#ffffff",
  customWidth: 1080,
  customHeight: 1920,
  open: false,

  // Predefined canvas sizes
  canvasSizes: [
    { name: "TikTok (1080x1920)", value: "1080x1920", key: "tiktok" },
    { name: "YouTube (1280x720)", value: "1280x720", key: "youtube" },
    { name: "Facebook Post (1200x630)", value: "1200x630", key: "fb-post" },
    { name: "Instagram Post (1080x1080)", value: "1080x1080", key: "ig-post" },
    {
      name: "Instagram Story (1080x1920)",
      value: "1080x1920",
      key: "ig-story",
    },
    { name: "Facebook Cover (820x312)", value: "820x312", key: "fb-cover" },
    { name: "LinkedIn Post (1200x1200)", value: "1200x1200", key: "li-post" },
    { name: "LinkedIn Cover (1584x396)", value: "1584x396", key: "li-cover" },
    { name: "Twitter Header (1500x500)", value: "1500x500", key: "twitter" },
    { name: "Snapchat Story (1080x1920)", value: "1080x1920", key: "snapchat" },
    {
      name: "YouTube Channel Art (2560x1440)",
      value: "2560x1440",
      key: "yt-art",
    },
    { name: "Pinterest Pin (1600x900)", value: "1600x900", key: "pinterest" },
    { name: "Custom", value: "custom", key: "custom" },
  ],
  filteredSizes: [],
  search: "",
  selectedSize: "TikTok (1080x1920)",
  selectedValue: "1080x1920",

  init() {
    // Initialize filteredSizes with all sizes
    this.filteredSizes = [...this.canvasSizes];

    // Listen for tool changes
    window.addEventListener("tool-changed", (e) => {
      this.isActive = e.detail.type === "settings";

      // Initialize with current canvas settings if available
      if (this.isActive && window.canvas) {
        this.backgroundColor = window.canvas.backgroundColor || "#ffffff";
      }
    });
  },

  // Filter sizes based on search
  filterSizes() {
    if (!this.search) {
      this.filteredSizes = this.canvasSizes;
      return;
    }

    this.filteredSizes = this.canvasSizes.filter((size) =>
      size.name.toLowerCase().includes(this.search.toLowerCase())
    );
  },

  // Select a size from the dropdown
  selectSize(size) {
    this.selectedSize = size.name;
    this.selectedValue = size.value;

    if (size.value === "custom") {
      this.customSizeVisible = true;
      return;
    }

    this.customSizeVisible = false;

    // Parse dimensions from the value (format: "WidthxHeight")
    const [width, height] = size.value.split("x").map(Number);

    // Apply size to canvas
    this.resizeCanvas(width, height);
  },

  // Apply custom size
  applyCustomSize() {
    if (!this.customWidth || !this.customHeight) return;

    this.resizeCanvas(this.customWidth, this.customHeight);
  },

  // Resize the canvas to specified dimensions
  resizeCanvas(width, height) {
    if (!window.canvas) return;

    // Get current objects and canvas state
    const objects = window.canvas.getObjects();
    const currentWidth = window.canvas.width;
    const currentHeight = window.canvas.height;

    // Set new canvas dimensions
    window.canvas.setWidth(width);
    window.canvas.setHeight(height);

    // Adjust objects if needed (scale or reposition)
    if (objects.length > 0) {
      // Simple approach: center all content
      const selection = new fabric.ActiveSelection(objects, {
        canvas: window.canvas,
      });

      // Center the selection properly
      selection.centerH();
      selection.centerV();

      window.canvas.discardActiveObject();
    }

    // Trigger a canvas resize event
    window.dispatchEvent(
      new CustomEvent("canvas:resized", {
        detail: { width, height },
      })
    );

    window.canvas.renderAll();
  },

  // Update background color
  updateBackgroundColor() {
    if (!window.canvas) return;

    // Use the standard Fabric.js way to set background color
    window.canvas.backgroundColor = this.backgroundColor;
    window.canvas.renderAll();
  },
}));

// Initialize everything when the document is loaded
document.addEventListener("DOMContentLoaded", () => {
  // This will start Alpine.js and initialize all our components
  console.log("Steve Editor initialized!");
});
// canvas
document.addEventListener("alpine:init", () => {
  Alpine.data("canvasManager", () => ({
    init() {
      console.log("Canvas manager initializing...");
      // this.filteredFonts = [...this.fonts];
      // Initialize canvas and make it globally available
      const canvas = new fabric.Canvas(this.$refs.canvas, {
        preserveObjectStacking: true,
        width: 800,
        height: 600,
      });

      // Make canvas available globally for other components
      window.canvas = canvas;

      // Set up event listeners to communicate with other components
      canvas.on("selection:created", this.handleSelection);
      canvas.on("selection:updated", this.handleSelection);
      canvas.on("selection:cleared", this.handleSelectionCleared);

      // Dispatch event that canvas is ready
      window.dispatchEvent(
        new CustomEvent("canvas:initialized", {
          detail: { canvas: canvas },
        })
      );

      // Listen for tool changes
      this.listenForToolChanges();
    },

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

    handleSelectionCleared() {
      // Notify panels that selection is cleared
      window.dispatchEvent(new CustomEvent("selection:cleared"));
    },

    listenForToolChanges() {
      window.addEventListener("tool-changed", (e) => {
        const toolType = e.detail.type;

        // Set drawing mode only when drawing tool is active
        if (toolType === "drawing") {
          // Enable drawing mode
          window.canvas.isDrawingMode = true;

          // Setup a default brush
          const brush = new fabric.PencilBrush(window.canvas);
          brush.width = 5;
          brush.color = "#000000";
          window.canvas.freeDrawingBrush = brush;
        } else {
          // Disable drawing mode for other tools
          window.canvas.isDrawingMode = false;
        }

        window.canvas.renderAll();
      });
    },
  }));
});
// Start Alpine
Alpine.start();
