// src/components/layers.js
import {addToHistory} from '../utils/history-manager';
import {Circle, Rect, Textbox} from "fabric";

export default function layersComponent() {
    return {
        items: [],
        selectedLayerId: null,

        // Initialize layers from canvas objects
        initLayers() {
            if (!window.canvas) return;

            // Clear existing layers
            this.items = [];

            // Get all objects from canvas
            const objects = window.canvas.getObjects();

            // Create layer items from canvas objects
            objects.forEach((obj, index) => {
                if (!obj.id) {
                    obj.id = `layer_${Date.now()}_${index}`;
                }

                this.items.push({
                    id: obj.id,
                    name: obj.name || `Layer ${index + 1}`,
                    type: obj.type || 'object',
                    visible: obj.visible !== false,
                    locked: obj.locked || false,
                    object: obj
                });
            });

            // Reverse array to match canvas stacking order (top item is last in canvas objects)
            this.items.reverse();
        },

        selectLayer(layer) {
            this.selectedLayerId = layer.id;
            if (window.canvas) {
                const obj = window.canvas.getObjects().find(o => o.id === layer.id);
                if (obj) {
                    window.canvas.setActiveObject(obj);
                    window.canvas.requestRenderAll();

                    // Dispatch an event to notify other components
                    window.dispatchEvent(new CustomEvent('layer:selected', {
                        detail: {layer, object: obj}
                    }));
                }
            }
        },

        toggleLayerVisibility(layer) {
            layer.visible = !layer.visible;
            if (window.canvas) {
                const obj = window.canvas.getObjects().find(o => o.id === layer.id);
                if (obj) {
                    obj.visible = layer.visible;
                    window.canvas.requestRenderAll();

                    // Add to history
                    if (typeof addToHistory === 'function') {
                        addToHistory();
                    }
                }
            }
        },

        toggleLayerLock(layer) {
            layer.locked = !layer.locked;
            if (window.canvas) {
                const obj = window.canvas.getObjects().find(o => o.id === layer.id);
                if (obj) {
                    // In Fabric.js v6, use selectable and evented properties
                    obj.selectable = !layer.locked;
                    obj.evented = !layer.locked;

                    // Store the locked state
                    obj.locked = layer.locked;

                    window.canvas.requestRenderAll();

                    // Add to history
                    if (typeof addToHistory === 'function') {
                        addToHistory();
                    }
                }
            }
        },

        moveLayerUp(index) {
            if (index === 0) return;

            // Swap layers in the array
            const temp = this.items[index];
            this.items[index] = this.items[index - 1];
            this.items[index - 1] = temp;

            // Reorder objects on canvas if available
            if (window.canvas) {
                const objects = window.canvas.getObjects();
                const layerId1 = this.items[index].id;
                const layerId2 = this.items[index - 1].id;

                const obj1Index = objects.findIndex(o => o.id === layerId1);
                const obj2Index = objects.findIndex(o => o.id === layerId2);

                if (obj1Index >= 0 && obj2Index >= 0) {
                    // In Fabric.js v6, we can use moveUp to change the stacking order
                    const obj1 = objects[obj1Index];
                    const obj2 = objects[obj2Index];

                    // This brings obj1 in front of obj2
                    if (obj1Index < obj2Index) {
                        window.canvas.bringObjectForward(obj1);
                    } else {
                        window.canvas.sendObjectBackward(obj2);
                    }

                    window.canvas.requestRenderAll();

                    // Add to history
                    if (typeof addToHistory === 'function') {
                        addToHistory();
                    }
                }
            }
        },

        moveLayerDown(index) {
            if (index >= this.items.length - 1) return;

            // Swap layers in the array
            const temp = this.items[index];
            this.items[index] = this.items[index + 1];
            this.items[index + 1] = temp;

            // Reorder objects on canvas
            if (window.canvas) {
                const objects = window.canvas.getObjects();
                const layerId1 = this.items[index].id;
                const layerId2 = this.items[index + 1].id;

                const obj1Index = objects.findIndex(o => o.id === layerId1);
                const obj2Index = objects.findIndex(o => o.id === layerId2);

                if (obj1Index >= 0 && obj2Index >= 0) {
                    // In Fabric.js v6, we can use moveDown to change the stacking order
                    const obj1 = objects[obj1Index];
                    const obj2 = objects[obj2Index];

                    // This brings obj2 in front of obj1
                    if (obj1Index > obj2Index) {
                        window.canvas.bringObjectForward(obj2);
                    } else {
                        window.canvas.sendObjectBackward(obj1);
                    }

                    window.canvas.requestRenderAll();

                    // Add to history
                    if (typeof addToHistory === 'function') {
                        addToHistory();
                    }
                }
            }
        },

        deleteLayer(layer) {
            const index = this.items.findIndex(l => l.id === layer.id);
            if (index >= 0) {
                this.items.splice(index, 1);

                if (window.canvas) {
                    const obj = window.canvas.getObjects().find(o => o.id === layer.id);
                    if (obj) {
                        window.canvas.remove(obj);
                        window.canvas.requestRenderAll();

                        // Add to history
                        if (typeof addToHistory === 'function') {
                            addToHistory();
                        }

                        // Clear selected layer if it was deleted
                        if (this.selectedLayerId === layer.id) {
                            this.selectedLayerId = null;
                        }
                    }
                }
            }
        },

        // Add new methods for additional functionality
        addLayer(type) {
            if (!window.canvas) return;

            let newObject;
            const center = window.canvas.getCenter();

            switch (type) {
                case 'rect':
                    newObject = new Rect({
                        left: center.left - 50,
                        top: center.top - 50,
                        width: 100,
                        height: 100,
                        fill: '#' + Math.floor(Math.random() * 16777215).toString(16), // Random color
                        originX: 'center',
                        originY: 'center',
                    });
                    break;

                case 'circle':
                    newObject = new Circle({
                        left: center.left,
                        top: center.top,
                        radius: 50,
                        fill: '#' + Math.floor(Math.random() * 16777215).toString(16), // Random color
                        originX: 'center',
                        originY: 'center',
                    });
                    break;

                case 'text':
                    newObject = new Textbox('New Text Layer', {
                        left: center.left,
                        top: center.top,
                        width: 200,
                        fontSize: 20,
                        fontFamily: 'Arial',
                        fill: '#333333',
                        originX: 'center',
                        originY: 'center',
                    });
                    break;

                default:
                    return; // Exit if invalid type
            }

            // Generate a unique ID for the new layer
            const id = `layer_${Date.now()}_${this.items.length}`;
            newObject.id = id;
            newObject.name = `${type.charAt(0).toUpperCase() + type.slice(1)} Layer ${this.items.length + 1}`;

            // Add object to canvas
            window.canvas.add(newObject);
            window.canvas.setActiveObject(newObject);
            window.canvas.requestRenderAll();

            // Add to layers panel
            this.items.unshift({
                id: id,
                name: newObject.name,
                type: type,
                visible: true,
                locked: false,
                object: newObject,
            });

            // Select the new layer
            this.selectedLayerId = id;

            // Add to history
            if (typeof addToHistory === 'function') {
                addToHistory();
            }
        },

        duplicateLayer(layer) {
            if (!window.canvas) return;

            const obj = window.canvas.getObjects().find(o => o.id === layer.id);
            if (!obj) return;

            // Clone the object
            obj.clone((clonedObj) => {
                // Offset the clone slightly
                clonedObj.set({
                    left: obj.left + 10,
                    top: obj.top + 10,
                });

                // Generate a unique ID for the cloned layer
                const id = `layer_${Date.now()}_${this.items.length}`;
                clonedObj.id = id;
                clonedObj.name = `${layer.name} Copy`;

                // Add cloned object to canvas
                window.canvas.add(clonedObj);
                window.canvas.setActiveObject(clonedObj);
                window.canvas.requestRenderAll();

                // Add to layers panel at the top of the stack
                this.items.unshift({
                    id: id,
                    name: clonedObj.name,
                    type: layer.type,
                    visible: true,
                    locked: false,
                    object: clonedObj
                });

                // Select the new layer
                this.selectedLayerId = id;

                // Add to history
                if (typeof addToHistory === 'function') {
                    addToHistory();
                }
            });
        },

        renameLayer(layer, newName) {
            const index = this.items.findIndex(l => l.id === layer.id);
            if (index >= 0) {
                this.items[index].name = newName;

                // Update the name on the object as well
                if (window.canvas) {
                    const obj = window.canvas.getObjects().find(o => o.id === layer.id);
                    if (obj) {
                        obj.name = newName;
                    }
                }
            }
        },

        // Method to sync layers with canvas when objects are added/removed externally
        syncLayers() {
            if (!window.canvas) return;

            // Get current canvas objects
            const objects = window.canvas.getObjects();

            // First remove layers that no longer exist in the canvas
            this.items = this.items.filter(layer => {
                return objects.some(obj => obj.id === layer.id);
            });

            // Then add any new objects to layers
            objects.forEach((obj, index) => {
                // Generate ID if it doesn't exist
                if (!obj.id) {
                    obj.id = `layer_${Date.now()}_${index}`;
                }

                // Check if this object is already in our layers
                const existingLayer = this.items.find(layer => layer.id === obj.id);

                if (!existingLayer) {
                    // Add new layer to the beginning (top) of the array
                    this.items.unshift({
                        id: obj.id,
                        name: obj.name || `Layer ${this.items.length + 1}`,
                        type: obj.type || 'object',
                        visible: obj.visible !== false,
                        locked: obj.locked || false,
                        object: obj
                    });
                } else {
                    // Update existing layer properties
                    existingLayer.visible = obj.visible !== false;
                    existingLayer.locked = obj.locked || false;
                    existingLayer.object = obj;
                }
            });

            // Reorder layers to match canvas stacking order
            const orderedLayers = [];
            objects.slice().reverse().forEach(obj => {
                const layer = this.items.find(l => l.id === obj.id);
                if (layer) {
                    orderedLayers.push(layer);
                }
            });

            // Replace items with ordered layers
            this.items = orderedLayers;
        }
    }
}