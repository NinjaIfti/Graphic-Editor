// src/app.js - Main Application File

// Import required libraries
import Alpine from "alpinejs";
import * as fabric from "fabric";

// Make Alpine globally available
window.Alpine = Alpine;

function initCanvas() {
  // Create canvas instance
  const canvas = new fabric.Canvas("image-editor", {
    preserveObjectStacking: true,
    width: 800,
    height: 600,
    backgroundColor: "#ffffff",
  });

  // Make it globally available
  window.canvas = canvas;

  // Set up event listeners
  canvas.on("selection:created", handleSelection);
  canvas.on("selection:updated", handleSelection);
  canvas.on("selection:cleared", handleSelectionCleared);
  canvas.on("object:modified", handleObjectModified);
  canvas.on("object:added", handleObjectAdded);
  canvas.on("object:removed", handleObjectRemoved);

  // Initialize history stack for undo/redo
  initHistory();

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
}

// Initialize Alpine
document.addEventListener("alpine:init", () => {
  // Main Application State
  Alpine.data("steveEditor", () => ({
    activeTool: "templates", // Default active tool

    // Initialize the main canvas

    init() {
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
    // Listen for tool changes
    window.addEventListener("tool-changed", (e) => {
      this.isActive = e.detail.type === "text";
    });

    // Listen for object selection
    window.addEventListener("object:selected", (e) => {
      if (e.detail && e.detail.type === "text") {
        this.selectedObject = e.detail;
        this.syncTextProperties();
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
    if (!this.selectedObject || this.selectedObject.type !== "text") return;

    const obj = this.selectedObject;

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

  // Update text rotation
  updateTextRotation() {
    if (!this.selectedObject || !window.canvas) return;

    this.selectedObject.set("angle", this.textProperties.rotation);
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
// Uploads Panel Component
Alpine.data("uploadsPanel", () => ({
  isActive: false,
  uploads: [],
  selectedObject: null,
  activeFilter: null,
  showFilterTools: false,
  showShadow: false,
  showDistortion: false,

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
    // Listen for tool changes
    window.addEventListener("tool-changed", (e) => {
      this.isActive = e.detail.type === "uploads";
    });

    // Listen for object selection
    window.addEventListener("object:selected", (e) => {
      if (e.detail) {
        this.selectedObject = e.detail;
        this.syncObjectProperties();
      }
    });

    // Listen for selection cleared
    window.addEventListener("selection:cleared", () => {
      this.selectedObject = null;
    });
  },

  // Handle file uploads
  handleFileUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.match("image.*")) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const imgURL = e.target.result;
        this.uploads.push({
          url: imgURL,
          name: file.name,
        });

        // Add to the grid
        const container = document.getElementById("file-upload-con");
        if (container) {
          const imgElement = document.createElement("div");
          imgElement.className =
            "aspect-square border border-gray-200 rounded overflow-hidden";
          imgElement.innerHTML = `<img src="${imgURL}" alt="${file.name}" class="w-full h-full object-cover cursor-pointer">`;
          imgElement.onclick = () => this.addImageToCanvas(imgURL);
          container.appendChild(imgElement);
        }
      };
      reader.readAsDataURL(file);
    });
  },

  // Add an image to the canvas
  addImageToCanvas(url) {
    if (!window.canvas) return;

    fabric.Image.fromURL(url, (img) => {
      // Scale down large images
      if (img.width > 800 || img.height > 600) {
        const scale = Math.min(800 / img.width, 600 / img.height);
        img.scale(scale);
      }

      window.canvas.add(img);
      window.canvas.setActiveObject(img);
      window.canvas.renderAll();

      this.selectedObject = img;
      this.syncObjectProperties();
    });
  },

  // Synchronize object properties
  syncObjectProperties() {
    if (!this.selectedObject) return;

    const obj = this.selectedObject;

    this.objectProperties = {
      opacity: obj.opacity || 1,
      stroke: obj.stroke || "#000000",
      strokeWidth: obj.strokeWidth || 0,
      radius: obj.clipPath ? obj.clipPath.rx : 0,
      skewX: obj.skewX || 0,
      skewY: obj.skewY || 0,
      fill: obj.fill || "#000000",
      shadowEnabled: !!obj.shadow,
      shadowColor: obj.shadow ? obj.shadow.color : "#dddddd",
      shadowBlur: obj.shadow ? obj.shadow.blur : 20,
      shadowOffsetX: obj.shadow ? obj.shadow.offsetX : 0,
      shadowOffsetY: obj.shadow ? obj.shadow.offsetY : 0,
    };

    // Reset filters
    this.resetFilterValues();
  },

  // Reset filter values
  resetFilterValues() {
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
  },

  // Apply a specific filter to the active object
  applyFilter(type, value) {
    if (
      !this.selectedObject ||
      !window.canvas ||
      this.selectedObject.type !== "image"
    )
      return;

    const obj = this.selectedObject;
    let filter;

    // Create filter based on type
    switch (type) {
      case "brightness":
        filter = new fabric.Image.filters.Brightness({
          brightness: parseFloat(value),
        });
        break;
      case "contrast":
        filter = new fabric.Image.filters.Contrast({
          contrast: parseFloat(value),
        });
        break;
      case "blur":
        filter = new fabric.Image.filters.Blur({
          blur: parseFloat(value),
        });
        break;
      case "noise":
        filter = new fabric.Image.filters.Noise({
          noise: parseInt(value, 10),
        });
        break;
      case "saturation":
        filter = new fabric.Image.filters.Saturation({
          saturation: parseFloat(value),
        });
        break;
      case "hue":
        filter = new fabric.Image.filters.HueRotation({
          rotation: parseFloat(value),
        });
        break;
      case "pixelate":
        filter = new fabric.Image.filters.Pixelate({
          blocksize: parseInt(value, 10),
        });
        break;
    }

    if (!filter) return;

    // Initialize filters array if it doesn't exist
    if (!obj.filters) obj.filters = [];

    // Find if filter of this type already exists
    const filterIndex = obj.filters.findIndex((f) => f.type === filter.type);

    // Add or update filter
    if (filterIndex > -1) {
      obj.filters[filterIndex] = filter;
    } else {
      obj.filters.push(filter);
    }

    // Apply filters
    obj.applyFilters();
    window.canvas.renderAll();
  },

  // Apply a preset filter
  applyPresetFilter(filterName) {
    if (
      !this.selectedObject ||
      !window.canvas ||
      this.selectedObject.type !== "image"
    )
      return;

    // Set active filter
    this.activeFilter = filterName;

    const obj = this.selectedObject;

    // Clear existing filters
    obj.filters = [];

    // Apply the selected filter
    switch (filterName) {
      case "black_white":
        obj.filters.push(new fabric.Image.filters.BlackWhite());
        break;
      case "brownie":
        obj.filters.push(new fabric.Image.filters.Brownie());
        break;
      case "grayscale":
        obj.filters.push(new fabric.Image.filters.Grayscale());
        break;
      case "invert":
        obj.filters.push(new fabric.Image.filters.Invert());
        break;
      case "sepia":
        obj.filters.push(new fabric.Image.filters.Sepia());
        break;
      case "kodachrome":
        obj.filters.push(new fabric.Image.filters.Kodachrome());
        break;
      case "technicolor":
        obj.filters.push(new fabric.Image.filters.Technicolor());
        break;
      case "polaroid":
        obj.filters.push(new fabric.Image.filters.Polaroid());
        break;
      case "vintage":
        obj.filters.push(new fabric.Image.filters.Vintage());
        break;
      case "sharpen":
        obj.filters.push(
          new fabric.Image.filters.Convolute({
            matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0],
          })
        );
        break;
      case "emboss":
        obj.filters.push(
          new fabric.Image.filters.Convolute({
            matrix: [1, 1, 1, 1, 0.7, -1, -1, -1, -1],
          })
        );
        break;
    }

    // Apply the filters
    obj.applyFilters();
    window.canvas.renderAll();
  },

  // Reset all filters
  resetFilters() {
    if (
      !this.selectedObject ||
      !window.canvas ||
      this.selectedObject.type !== "image"
    )
      return;

    this.activeFilter = null;
    this.resetFilterValues();

    this.selectedObject.filters = [];
    this.selectedObject.applyFilters();
    window.canvas.renderAll();
  },

  // Update object property
  updateObjectProperty(property, value) {
    if (!this.selectedObject || !window.canvas) return;

    // Convert value types appropriately
    let finalValue = value;
    if (typeof this.selectedObject[property] === "number") {
      finalValue = parseFloat(value);
    }

    // Set the property
    this.selectedObject.set(property, finalValue);

    // Update local state
    this.objectProperties[property] = finalValue;

    // Render the canvas
    window.canvas.renderAll();
  },

  // Update radius (clip path)
  updateClipPath(value) {
    if (!this.selectedObject || !window.canvas) return;

    const radius = parseInt(value, 10);
    this.objectProperties.radius = radius;

    if (radius === 0) {
      this.selectedObject.clipPath = null;
    } else {
      const width = this.selectedObject.width * this.selectedObject.scaleX;
      const height = this.selectedObject.height * this.selectedObject.scaleY;

      this.selectedObject.clipPath = new fabric.Rect({
        width: width,
        height: height,
        rx: radius,
        ry: radius,
        originX: "center",
        originY: "center",
      });
    }

    window.canvas.renderAll();
  },

  // Toggle shadow
  toggleShadow() {
    if (!this.selectedObject || !window.canvas) return;

    if (this.objectProperties.shadowEnabled) {
      // Enable shadow
      this.selectedObject.shadow = new fabric.Shadow({
        color: this.objectProperties.shadowColor,
        blur: this.objectProperties.shadowBlur,
        offsetX: this.objectProperties.shadowOffsetX,
        offsetY: this.objectProperties.shadowOffsetY,
      });
    } else {
      // Disable shadow
      this.selectedObject.shadow = null;
    }

    window.canvas.renderAll();
  },

  // Update shadow properties
  updateShadow(property, value) {
    if (
      !this.selectedObject ||
      !window.canvas ||
      !this.objectProperties.shadowEnabled
    )
      return;

    // Update local state
    const propName = `shadow${
      property.charAt(0).toUpperCase() + property.slice(1)
    }`;
    this.objectProperties[propName] =
      property === "color" ? value : parseFloat(value);

    // Create a new shadow with updated properties
    this.selectedObject.shadow = new fabric.Shadow({
      color: this.objectProperties.shadowColor,
      blur: this.objectProperties.shadowBlur,
      offsetX: this.objectProperties.shadowOffsetX,
      offsetY: this.objectProperties.shadowOffsetY,
    });

    window.canvas.renderAll();
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
  },

  // Update brush preview (UI only)
  updateBrushPreview() {
    // This is handled by Alpine.js binding in the template
  },

  // Activate drawing mode on the canvas
  activateDrawingMode() {
    if (!window.canvas) return;

    // Enable Fabric.js free drawing mode
    window.canvas.isDrawingMode = true;

    // Apply current settings based on active tab
    this.updateDrawingMode(this.activeTab);
  },

  // Deactivate drawing mode
  deactivateDrawingMode() {
    if (!window.canvas) return;

    // Disable Fabric.js free drawing mode
    window.canvas.isDrawingMode = false;
  },

  // Update drawing mode based on active tab
  updateDrawingMode(tabName) {
    if (!window.canvas) return;

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

    // Create a new brush
    const brush = new fabric.PencilBrush(window.canvas);

    // Set brush properties
    brush.width = parseInt(this.brushSettings.size);
    brush.color = this.brushSettings.color;
    brush.opacity = parseFloat(this.brushSettings.opacity);

    // Apply brush to canvas
    window.canvas.freeDrawingBrush = brush;
    window.canvas.isDrawingMode = true;
  },

  // Setup eraser
  setupEraser() {
    if (!window.canvas) return;

    // Use Fabric's eraser brush if available (newer versions)
    if (fabric.EraserBrush) {
      const eraser = new fabric.EraserBrush(window.canvas);
      eraser.width = parseInt(this.eraserSettings.size);

      // Set inverted mode if needed
      if (this.eraserSettings.invert) {
        eraser.inverted = true;
      }

      // Apply eraser to canvas
      window.canvas.freeDrawingBrush = eraser;
    } else {
      // Fallback for older versions: use pencil brush with destination-out composite
      const eraser = new fabric.PencilBrush(window.canvas);
      eraser.width = parseInt(this.eraserSettings.size);
      eraser.color = "rgba(0,0,0,1)";
      eraser.globalCompositeOperation = "destination-out";

      // Apply eraser to canvas
      window.canvas.freeDrawingBrush = eraser;
    }

    window.canvas.isDrawingMode = true;
  },

  // Setup pencil with different brush types
  setupPencil() {
    if (!window.canvas) return;

    let brush;

    // Create appropriate brush based on brush type
    switch (this.pencilSettings.brushType) {
      case "Circle":
        if (fabric.CircleBrush) {
          brush = new fabric.CircleBrush(window.canvas);
        } else {
          brush = new fabric.PencilBrush(window.canvas);
        }
        break;
      case "Spray":
        if (fabric.SprayBrush) {
          brush = new fabric.SprayBrush(window.canvas);
        } else {
          brush = new fabric.PencilBrush(window.canvas);
        }
        break;
      case "hLine":
      case "vLine":
      case "square":
      case "diamond":
      case "texture":
        // Create a pattern brush if available
        if (fabric.PatternBrush) {
          brush = new fabric.PatternBrush(window.canvas);
          brush.getPatternSrc = () => {
            // Create a pattern based on the selected type
            const patternCanvas = document.createElement("canvas");
            const ctx = patternCanvas.getContext("2d");
            patternCanvas.width = patternCanvas.height = 10;

            ctx.fillStyle = this.pencilSettings.color;

            switch (this.pencilSettings.brushType) {
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
        // Default to pencil brush
        brush = new fabric.PencilBrush(window.canvas);
    }

    // Set common properties
    brush.width = parseInt(this.pencilSettings.size);
    brush.color = this.pencilSettings.color;

    // Set shadow if enabled
    if (parseInt(this.pencilSettings.shadowWidth) > 0) {
      brush.shadow = new fabric.Shadow({
        blur: parseInt(this.pencilSettings.shadowWidth),
        offsetX: parseInt(this.pencilSettings.shadowOffsetX),
        offsetY: parseInt(this.pencilSettings.shadowOffsetY),
        color: this.pencilSettings.shadowColor,
      });
    }

    // Apply brush to canvas
    window.canvas.freeDrawingBrush = brush;
    window.canvas.isDrawingMode = true;
  },
}));
// Settings Panel Component
Alpine.data("settingsPanel", () => ({
  isActive: false,
  customSizeVisible: false,
  backgroundColor: "#ffffff",
  customWidth: 1080,
  customHeight: 1920,

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
      selection.center();
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

    window.canvas.setBackgroundColor(this.backgroundColor, () => {
      window.canvas.renderAll();
    });
  },
}));
// Layers Panel Component
Alpine.data("layersPanel", () => ({
  isActive: false,
  layers: [],
  selectedLayerId: null,

  init() {
    // Listen for tool changes
    window.addEventListener("tool-changed", (e) => {
      this.isActive = e.detail.type === "layers";

      // Update layers when becoming active
      if (this.isActive) {
        this.updateLayers();
      }
    });

    // Update layers when canvas changes
    window.addEventListener("object:added", () => this.updateLayers());
    window.addEventListener("object:removed", () => this.updateLayers());
    window.addEventListener("object:modified", () => this.updateLayers());

    // Listen for selection changes
    window.addEventListener("object:selected", (e) => {
      if (e.detail && e.detail.id) {
        this.selectedLayerId = e.detail.id;
      }
    });

    window.addEventListener("selection:cleared", () => {
      this.selectedLayerId = null;
    });
  },

  // Update the layers list from canvas objects
  updateLayers() {
    if (!window.canvas) return;

    const objects = window.canvas.getObjects();
    this.layers = objects
      .map((obj) => ({
        id: obj.id || this.generateId(),
        name: obj.name || this.getObjectTypeName(obj),
        type: obj.type,
        visible: !obj.invisible,
        object: obj,
      }))
      .reverse(); // Reverse to match visual stacking order
  },

  // Generate a unique ID for objects that don't have one
  generateId() {
    return "_" + Math.random().toString(36).substr(2, 9);
  },

  // Get a human-readable name based on object type
  getObjectTypeName(obj) {
    switch (obj.type) {
      case "text":
        return `Text: ${obj.text.substr(0, 15)}${
          obj.text.length > 15 ? "..." : ""
        }`;
      case "image":
        return "Image";
      case "rect":
        return "Rectangle";
      case "circle":
        return "Circle";
      case "path":
        return "Drawing";
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

  // Move layer up in stacking order
  moveLayerUp(index) {
    if (!window.canvas || index === 0) return;

    // Get the actual objects from canvas (reverse to match our display order)
    const objects = window.canvas.getObjects().slice().reverse();
    const objectToMove = objects[index];

    // Move in the canvas (bring forward)
    window.canvas.bringForward(objectToMove);

    // Update our layer array to reflect change
    this.updateLayers();
  },

  // Move layer down in stacking order
  moveLayerDown(index) {
    if (!window.canvas || index === this.layers.length - 1) return;

    // Get the actual objects from canvas (reverse to match our display order)
    const objects = window.canvas.getObjects().slice().reverse();
    const objectToMove = objects[index];

    // Move in the canvas (send backward)
    window.canvas.sendBackwards(objectToMove);

    // Update our layer array to reflect change
    this.updateLayers();
  },

  // Delete a layer
  deleteLayer(layer) {
    if (!window.canvas) return;

    // Remove from canvas
    window.canvas.remove(layer.object);

    // Update layers
    this.updateLayers();
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

// Initialize everything when the document is loaded
document.addEventListener("DOMContentLoaded", () => {
  // This will start Alpine.js and initialize all our components
  initCanvas();

  Alpine.start();
  console.log("Steve Editor initialized!");
});
// Start Alpine
Alpine.start();
