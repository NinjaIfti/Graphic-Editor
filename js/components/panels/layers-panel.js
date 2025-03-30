export const layersPanelComponent = () => ({
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
});
