// Layers Component
export default function layersComponent() {
    return {
        items: [],
        selectedLayerId: null,

        init() {
            // Initialize the layers component
            this.syncLayers();

            // Listen for canvas events
            if (window.canvas) {
                window.canvas.on("object:added", () => this.syncLayers());
                window.canvas.on("object:removed", () => this.syncLayers());
                window.canvas.on("selection:created", (e) => this.handleSelectionCreated(e));
                window.canvas.on("selection:updated", (e) => this.handleSelectionCreated(e));
                window.canvas.on("selection:cleared", () => this.handleSelectionCleared());
            }
        },

        // Sync layers with canvas objects
        syncLayers() {
            if (!window.canvas) return;

            // Get all objects from the canvas
            const objects = window.canvas.getObjects();

            // Map canvas objects to layer items
            this.items = objects.map((obj, index) => {
                // Determine layer name based on object type
                let name = `Layer ${index + 1}`;

                if (obj.type === 'textbox') {
                    name = `Text: ${obj.text.substring(0, 15)}${obj.text.length > 15 ? '...' : ''}`;
                } else if (obj.type === 'image') {
                    name = `Image ${index + 1}`;
                } else if (obj.type === 'rect') {
                    name = `Shape ${index + 1}`;
                } else if (obj.type === 'path') {
                    name = `Drawing ${index + 1}`;
                } else if (obj.type === 'group') {
                    name = `Group ${index + 1}`;
                }

                // Create layer object
                return {
                    id: obj.id || this.generateId(),
                    name: obj.name || name,
                    type: obj.type,
                    visible: !obj.hidden,
                    object: obj
                };
            });

            // Sort layers to match canvas rendering order (bottom to top)
            this.items.reverse();
        },

        // Generate unique ID for layer
        generateId() {
            return 'layer_' + Math.random().toString(36).substr(2, 9);
        },

        // Handle selection created
        handleSelectionCreated(e) {
            const activeObject = window.canvas.getActiveObject();
            if (activeObject) {
                // Find the layer ID for the selected object
                const layer = this.items.find(item => item.object === activeObject);
                if (layer) {
                    this.selectedLayerId = layer.id;
                }
            }
        },

        // Handle selection cleared
        handleSelectionCleared() {
            this.selectedLayerId = null;
        },

        // Select a layer
        selectLayer(layer) {
            if (!window.canvas || !layer || !layer.object) return;

            // Select the object on the canvas
            window.canvas.setActiveObject(layer.object);
            window.canvas.requestRenderAll();

            // Update selected layer ID
            this.selectedLayerId = layer.id;
        },

        // Toggle layer visibility
        toggleLayerVisibility(layer) {
            if (!window.canvas || !layer || !layer.object) return;

            // Toggle visibility
            layer.visible = !layer.visible;
            layer.object.visible = layer.visible;

            // Update object hidden property (inverse of visible)
            layer.object.set('hidden', !layer.visible);

            // Render canvas
            window.canvas.requestRenderAll();

            // If this is a component of fabricComponent, add to history
            if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                window.fabricComponent.addToHistory();
            }
        },

        // Move layer up (increase z-index)
        moveLayerUp(index) {
            if (!window.canvas || index <= 0 || index >= this.items.length) return;

            // Get objects from canvas
            const objects = window.canvas.getObjects();

            // Convert layer index to canvas index (they're inverted)
            const canvasIndex = objects.length - 1 - index;

            // Get object from canvas
            const obj = objects[canvasIndex];
            if (!obj) return;

            // Get the object above
            const targetIndex = canvasIndex + 1;
            if (targetIndex >= objects.length) return;

            // Custom implementation of bring forward
            const newIndex = window.canvas._objects.indexOf(obj);
            if (newIndex < window.canvas._objects.length - 1) {
                // Remove object from current position
                window.canvas._objects.splice(newIndex, 1);
                // Insert object at new position
                window.canvas._objects.splice(newIndex + 1, 0, obj);
                window.canvas.requestRenderAll();
            }

            // Re-sync layers
            this.syncLayers();

            // If this is a component of fabricComponent, add to history
            if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                window.fabricComponent.addToHistory();
            }
        },

        // Move layer down (decrease z-index)
        moveLayerDown(index) {
            if (!window.canvas || index < 0 || index >= this.items.length - 1) return;

            // Get objects from canvas
            const objects = window.canvas.getObjects();

            // Convert layer index to canvas index (they're inverted)
            const canvasIndex = objects.length - 1 - index;

            // Get object from canvas
            const obj = objects[canvasIndex];
            if (!obj) return;

            // Custom implementation of send backwards
            const newIndex = window.canvas._objects.indexOf(obj);
            if (newIndex > 0) {
                // Remove object from current position
                window.canvas._objects.splice(newIndex, 1);
                // Insert object at new position
                window.canvas._objects.splice(newIndex - 1, 0, obj);
                window.canvas.requestRenderAll();
            }

            // Re-sync layers
            this.syncLayers();

            // If this is a component of fabricComponent, add to history
            if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                window.fabricComponent.addToHistory();
            }
        },

        // Delete layer
        deleteLayer(layer) {
            if (!window.canvas || !layer || !layer.object) return;

            // Remove object from canvas
            window.canvas.remove(layer.object);

            // If this is a component of fabricComponent, add to history
            if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                window.fabricComponent.addToHistory();
            }
        },

        // Bring layer to front (top of stack)
        bringToFront(layer) {
            if (!window.canvas || !layer || !layer.object) return;

            // Custom implementation of bring to front
            // Remove object from current position
            const obj = layer.object;
            const index = window.canvas._objects.indexOf(obj);
            if (index !== -1) {
                window.canvas._objects.splice(index, 1);
                // Add to end of array (top of stack)
                window.canvas._objects.push(obj);
                window.canvas.requestRenderAll();
            }

            // Re-sync layers
            this.syncLayers();

            // If this is a component of fabricComponent, add to history
            if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                window.fabricComponent.addToHistory();
            }
        },

        // Send layer to back (bottom of stack)
        sendToBack(layer) {
            if (!window.canvas || !layer || !layer.object) return;

            // Custom implementation of send to back
            // Remove object from current position
            const obj = layer.object;
            const index = window.canvas._objects.indexOf(obj);
            if (index !== -1) {
                window.canvas._objects.splice(index, 1);
                // Add to beginning of array (bottom of stack)
                window.canvas._objects.unshift(obj);
                window.canvas.requestRenderAll();
            }

            // Re-sync layers
            this.syncLayers();

            // If this is a component of fabricComponent, add to history
            if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                window.fabricComponent.addToHistory();
            }
        },

        // Duplicate layer
        duplicateLayer(layer) {
            if (!window.canvas || !layer || !layer.object) return;

            // Clone the object
            layer.object.clone((cloned) => {
                // Position slightly offset from original
                cloned.set({
                    left: layer.object.left + 10,
                    top: layer.object.top + 10
                });

                // Add to canvas
                window.canvas.add(cloned);
                window.canvas.setActiveObject(cloned);
                window.canvas.requestRenderAll();

                // If this is a component of fabricComponent, add to history
                if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                    window.fabricComponent.addToHistory();
                }
            });
        },

        // Lock layer
        toggleLayerLock(layer) {
            if (!window.canvas || !layer || !layer.object) return;

            // Toggle lock state
            const isLocked = layer.object.lockMovementX && layer.object.lockMovementY;
            layer.object.set({
                lockMovementX: !isLocked,
                lockMovementY: !isLocked,
                lockRotation: !isLocked,
                lockScalingX: !isLocked,
                lockScalingY: !isLocked,
                selectable: isLocked
            });

            // Update layer
            layer.locked = !isLocked;

            // Render canvas
            window.canvas.requestRenderAll();

            // If this is a component of fabricComponent, add to history
            if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                window.fabricComponent.addToHistory();
            }
        },

        // Add new layer
        addNewLayer(type = 'rect', options = {}) {
            if (!window.canvas) return;

            let newObject;
            const canvasWidth = window.canvas.width;
            const canvasHeight = window.canvas.height;

            // Create object based on type
            switch (type) {
                case 'rect':
                    newObject = new fabric.Rect({
                        left: canvasWidth / 2,
                        top: canvasHeight / 2,
                        width: 100,
                        height: 100,
                        fill: options.fill || '#cccccc',
                        originX: 'center',
                        originY: 'center',
                        ...options
                    });
                    break;

                case 'circle':
                    newObject = new fabric.Circle({
                        left: canvasWidth / 2,
                        top: canvasHeight / 2,
                        radius: 50,
                        fill: options.fill || '#cccccc',
                        originX: 'center',
                        originY: 'center',
                        ...options
                    });
                    break;

                case 'text':
                    newObject = new fabric.Textbox(options.text || 'New Text', {
                        left: canvasWidth / 2,
                        top: canvasHeight / 2,
                        fontSize: options.fontSize || 30,
                        fontFamily: options.fontFamily || 'Arial',
                        fill: options.fill || '#000000',
                        textAlign: 'center',
                        originX: 'center',
                        originY: 'center',
                        width: 200,
                        ...options
                    });
                    break;
            }

            if (newObject) {
                // Add object to canvas
                window.canvas.add(newObject);
                window.canvas.setActiveObject(newObject);
                window.canvas.requestRenderAll();

                // If this is a component of fabricComponent, add to history
                if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                    window.fabricComponent.addToHistory();
                }
            }
        },

        // Rename layer
        renameLayer(layer, newName) {
            if (!layer) return;

            // Update layer name
            layer.name = newName;

            // If object has a name property, update it too
            if (layer.object) {
                layer.object.name = newName;
            }
        },

        // Get layer by object
        getLayerByObject(obj) {
            if (!obj) return null;
            return this.items.find(layer => layer.object === obj);
        }
    };
}