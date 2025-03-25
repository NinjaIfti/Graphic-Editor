// js/Editor/panels/layers.js
import { canvas, SVG_ICONS } from "../app.js";
import { getObjById, setActiveObject_ } from "../functions.js";

// Alpine.js component for layers panel
export function layersPanel() {
  return {
    layers: [],
    layerCount: 0,
    selectedLayerId: null,

    init() {
      // Initialize component
      this.refreshLayers();

      // Set up canvas event listeners
      if (typeof canvas !== "undefined") {
        canvas.on("object:added", this.refreshLayers.bind(this));
        canvas.on("object:removed", this.refreshLayers.bind(this));
        canvas.on("selection:created", this.handleSelectionCreated.bind(this));
        canvas.on("selection:updated", this.handleSelectionCreated.bind(this));
        canvas.on("selection:cleared", () => {
          this.selectedLayerId = null;
        });
      }
    },

    handleSelectionCreated() {
      const obj = canvas.getActiveObject();
      if (obj && obj.id) {
        this.selectedLayerId = obj.id;
      }
    },

    refreshLayers() {
      // Reset layers array and counter
      this.layers = [];
      this.layerCount = 0;

      // Get all objects from canvas
      if (typeof canvas !== "undefined") {
        const canvasObjects = canvas.getObjects();
        // Process in reverse order to match stacking (top to bottom)
        for (let i = canvasObjects.length - 1; i >= 0; i--) {
          const obj = canvasObjects[i];
          if (obj.originalItem) {
            this.addLayerToArray(obj);
          }
        }
      }
    },

    addLayerToArray(obj) {
      if (!obj || !obj.originalItem) return;

      const item = obj.originalItem;
      const layerObj = {
        id: obj.id,
        name: `Layer ${++this.layerCount}`,
        type: item.class || item.type,
        visible: obj.opacity !== 0,
        isGroup: item.type === "group",
        src: item.src,
        icon: this.getLayerIcon(item),
        subLayers: [],
      };

      // Handle group objects and their sublayers
      if (item.type === "group" && obj._objects) {
        obj._objects.forEach((subObj) => {
          if (subObj.originalItem) {
            // Recursively add sublayers
            layerObj.subLayers.push(this.createSubLayer(subObj));
          }
        });
      }

      this.layers.push(layerObj);
    },

    createSubLayer(obj) {
      if (!obj || !obj.originalItem) return null;

      const item = obj.originalItem;
      return {
        id: obj.id,
        name: `Sublayer ${++this.layerCount}`,
        type: item.class || item.type,
        visible: obj.opacity !== 0,
        src: item.src,
        icon: this.getLayerIcon(item),
      };
    },

    getLayerIcon(item) {
      const type = item.class || item.type;

      if (type === "image" || (type === "shape" && item.type !== "drawing")) {
        return "image";
      } else if (type === "text") {
        return "text";
      } else if (item.type === "group") {
        return "folder";
      } else if (item.type === "drawing") {
        return "drawing";
      }

      return "default";
    },

    selectLayer(layer) {
      if (!layer) return;

      this.selectedLayerId = layer.id;
      const obj = getObjById(layer.id);
      if (obj) {
        setActiveObject_(obj);
      }
    },

    toggleLayerVisibility(layer) {
      if (!layer) return;

      layer.visible = !layer.visible;
      const opacityVal = layer.visible ? 1 : 0;

      canvas.getObjects().forEach((obj) => {
        if (obj.id === layer.id) {
          obj.set("opacity", opacityVal);
          canvas.requestRenderAll();
        }
      });
    },

    deleteLayer(layer) {
      if (!layer) return;

      const obj = getObjById(layer.id);
      if (!obj) return;

      // If it's a group, remove all objects in the group
      if (obj._objects) {
        obj._objects.forEach((groupObj) => {
          canvas.remove(groupObj);
        });
      }

      canvas.remove(obj);
      canvas.requestRenderAll();

      // Refresh layers
      this.refreshLayers();
    },

    moveLayerUp(index) {
      if (index <= 0 || index >= this.layers.length) return;

      const layerId = this.layers[index].id;
      const obj = getObjById(layerId);
      if (!obj) return;

      // Move object forward in canvas
      canvas.bringForward(obj);
      canvas.requestRenderAll();

      // Update layers array
      const temp = this.layers[index];
      this.layers[index] = this.layers[index - 1];
      this.layers[index - 1] = temp;
    },

    moveLayerDown(index) {
      if (index < 0 || index >= this.layers.length - 1) return;

      const layerId = this.layers[index].id;
      const obj = getObjById(layerId);
      if (!obj) return;

      // Move object backward in canvas
      canvas.sendBackwards(obj);
      canvas.requestRenderAll();

      // Update layers array
      const temp = this.layers[index];
      this.layers[index] = this.layers[index + 1];
      this.layers[index + 1] = temp;
    },
  };
}
