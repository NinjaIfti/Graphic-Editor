// src/components/toolbar.js
import {Rect, Line} from 'fabric';
import {addToHistory} from '../utils/history-manager';

export default function toolbarComponent() {
    return {
        hasSelection: false,
        canCrop: false,
        cropActive: false,
        isMultiSelection: false,
        showRulers: false,
        showGuides: false,
        snapToGrid: false,
        
        getHasSelection() {
            return this.hasSelection;
        },

        // Initialize toolbar

        init() {
            // Listen for selection events
            if (window.canvas) {
                window.canvas.on('selection:created', this.handleSelectionCreated.bind(this));
                window.canvas.on('selection:updated', this.handleSelectionUpdated.bind(this));
                window.canvas.on('selection:cleared', this.handleSelectionCleared.bind(this));
            }
        },

        // Handle selection created event
        handleSelectionCreated(e) {
            this.hasSelection = true;
            this.isMultiSelection = e.selected && e.selected.length > 1;
            this.canCrop = !this.isMultiSelection && e.selected && e.selected[0].type === 'image';

            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('toolbar:selection', {
                detail: {
                    hasSelection: this.hasSelection,
                    isMultiSelection: this.isMultiSelection,
                    canCrop: this.canCrop
                }
            }));
        },

        // Handle selection updated event
        handleSelectionUpdated(e) {
            this.hasSelection = true;
            this.isMultiSelection = e.selected && e.selected.length > 1;
            this.canCrop = !this.isMultiSelection && e.selected && e.selected[0].type === 'image';

            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('toolbar:selection', {
                detail: {
                    hasSelection: this.hasSelection,
                    isMultiSelection: this.isMultiSelection,
                    canCrop: this.canCrop
                }
            }));
        },

        // Handle selection cleared event
        handleSelectionCleared() {
            this.hasSelection = false;
            this.isMultiSelection = false;
            this.canCrop = false;

            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('toolbar:selection', {
                detail: {
                    hasSelection: false,
                    isMultiSelection: false,
                    canCrop: false
                }
            }));
        },

        // alignment function
        alignObjects(type) {
            if (!window.canvas) return;

            const activeObject = window.canvas.getActiveObject();
            if (!activeObject) return;

            // Check if we have a single object or multiple objects - fixed case sensitivity
            const isMultipleSelection = (activeObject.type === 'activeselection' || activeObject.type === 'group');

            if (!isMultipleSelection) {
                // CASE 1: Single object - align relative to the canvas
                const canvasWidth = window.canvas.width;
                const canvasHeight = window.canvas.height;
                const objectWidth = activeObject.getScaledWidth();
                const objectHeight = activeObject.getScaledHeight();

                switch (type) {
                    case 'left':
                        activeObject.set({
                            left: 0
                        });
                        break;
                    case 'centerH':
                        activeObject.set({
                            left: (canvasWidth / 2) - (objectWidth / 2)
                        });
                        break;
                    case 'right':
                        activeObject.set({
                            left: canvasWidth - objectWidth
                        });
                        break;
                    case 'top':
                        activeObject.set({
                            top: 0
                        });
                        break;
                    case 'centerV':
                        activeObject.set({
                            top: (canvasHeight / 2) - (objectHeight / 2)
                        });
                        break;
                    case 'bottom':
                        activeObject.set({
                            top: canvasHeight - objectHeight
                        });
                        break;
                }
            } else {
                // Get all the objects in the selection
                const objects = activeObject.getObjects();
                if (objects.length <= 1) return; // Nothing to align with just one object

                // Remember the original position of the group
                const originalLeft = activeObject.left;
                const originalTop = activeObject.top;

                // For horizontal alignment, we need special handling
                if (type === 'left' || type === 'centerH' || type === 'right') {
                    // Find leftmost and rightmost objects in the selection
                    let minLeft = Infinity;
                    let maxRight = -Infinity;

                    objects.forEach(obj => {
                        // Get local coordinates inside the group
                        const left = obj.left;
                        const right = left + (obj.width * obj.scaleX);

                        minLeft = Math.min(minLeft, left);
                        maxRight = Math.max(maxRight, right);
                    });

                    const selectionWidth = maxRight - minLeft;
                    const selectionCenter = minLeft + selectionWidth / 2;

                    // Apply alignment directly based on object's position within the group
                    objects.forEach(obj => {
                        const objWidth = obj.width * obj.scaleX;

                        switch (type) {
                            case 'left':
                                // Align all objects to the left edge
                                obj.set('left', minLeft);
                                break;

                            case 'centerH':
                                // Align all objects to horizontal center
                                obj.set('left', selectionCenter - (objWidth / 2));
                                break;

                            case 'right':
                                // Align all objects to right edge
                                obj.set('left', maxRight - objWidth);
                                break;
                        }
                    });
                } else {
                    // Vertical alignment - existing code that's working
                    // Get the bounding box
                    const boundingBox = activeObject.getBoundingRect(true);

                    // Calculate important points of the bounding box
                    const boxTop = boundingBox.top;
                    const boxHeight = boundingBox.height;
                    const boxBottom = boxTop + boxHeight;
                    const boxCenterY = boxTop + (boxHeight / 2);

                    // For each object, calculate new position based on the bounding box
                    objects.forEach(obj => {
                        // Get object's actual bounding rectangle
                        const objBounds = obj.getBoundingRect(true);
                        const objHeight = objBounds.height;

                        // Calculate current positions
                        const objTop = objBounds.top;
                        const objBottom = objTop + objHeight;
                        const objCenterY = objTop + (objHeight / 2);

                        // Calculate needed position change
                        let deltaY = 0;

                        switch (type) {
                            case 'top':
                                // Align to top edge of bounding box
                                deltaY = boxTop - objTop;
                                break;
                            case 'centerV':
                                // Align to vertical center of bounding box
                                deltaY = boxCenterY - objCenterY;
                                break;
                            case 'bottom':
                                // Align to bottom edge of bounding box
                                deltaY = boxBottom - objBottom;
                                break;
                        }

                        // Apply the position change to the object
                        if (deltaY !== 0) {
                            obj.set('top', obj.top + deltaY);
                        }
                    });
                }

                // Make sure the group doesn't move
                activeObject.set({
                    left: originalLeft,
                    top: originalTop
                });
            }

            // Update object coordinates
            activeObject.setCoords();

            // Update canvas
            window.canvas.requestRenderAll();

            // Add to history
            if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                window.fabricComponent.addToHistory();
            }
        },

        deleteSelected() {
            if (!window.canvas) return;

            const activeObject = window.canvas.getActiveObject();
            if (activeObject) {
                if (activeObject.type === 'activeselection') {
                    // For multiple selected objects
                    activeObject.forEachObject((obj) => {
                        window.canvas.remove(obj);
                    });
                    // Clear the selection
                    window.canvas.discardActiveObject();
                } else {
                    // For single selected object
                    window.canvas.remove(activeObject);
                }

                window.canvas.requestRenderAll();
                this.hasSelection = false;

                // Add to history
                if (typeof addToHistory === 'function') {
                    addToHistory();
                } else if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                    window.fabricComponent.addToHistory();
                }

                // Update layers panel if needed
                window.dispatchEvent(new CustomEvent('object:removed', {
                    detail: {object: activeObject}
                }));
            }
        },

        // Distribute objects evenly
        distributeObjects(direction) {
            if (!window.canvas) return;

            // Get selected objects
            const activeSelection = window.canvas.getActiveObject();
            if (!activeSelection || !activeSelection.type.includes('group')) return;

            const objects = activeSelection.getObjects();
            if (objects.length < 3) return; // Need at least 3 objects to distribute

            // Clone objects to work with
            const objectsToDistribute = [...objects];

            if (direction === 'horizontal') {
                // Sort objects by left position
                objectsToDistribute.sort((a, b) => a.left - b.left);

                // Get leftmost and rightmost objects
                const leftmost = objectsToDistribute[0];
                const rightmost = objectsToDistribute[objectsToDistribute.length - 1];

                // Calculate total distributable space
                const totalSpace = rightmost.left - leftmost.left;
                const spacing = totalSpace / (objectsToDistribute.length - 1);

                // Distribute middle objects evenly
                for (let i = 1; i < objectsToDistribute.length - 1; i++) {
                    objectsToDistribute[i].set('left', leftmost.left + (spacing * i));
                }
            } else if (direction === 'vertical') {
                // Sort objects by top position
                objectsToDistribute.sort((a, b) => a.top - b.top);

                // Get topmost and bottommost objects
                const topmost = objectsToDistribute[0];
                const bottommost = objectsToDistribute[objectsToDistribute.length - 1];

                // Calculate total distributable space
                const totalSpace = bottommost.top - topmost.top;
                const spacing = totalSpace / (objectsToDistribute.length - 1);

                // Distribute middle objects evenly
                for (let i = 1; i < objectsToDistribute.length - 1; i++) {
                    objectsToDistribute[i].set('top', topmost.top + (spacing * i));
                }
            }

            // Update object coordinates
            objects.forEach(obj => obj.setCoords());

            // Render changes
            window.canvas.requestRenderAll();

            // Add to history
            if (typeof addToHistory === 'function') {
                addToHistory();
            }
        },

        startCrop() {
            if (!window.canvas) return;

            // Get the active object (should be an image)
            const activeObject = window.canvas.getActiveObject();
            if (!activeObject || activeObject.type !== 'image') return;

            this.cropActive = true;

            // Store original state for potential cancellation
            this._originalObjectState = {
                width: activeObject.width,
                height: activeObject.height,
                scaleX: activeObject.scaleX,
                scaleY: activeObject.scaleY,
                left: activeObject.left,
                top: activeObject.top,
                cropX: activeObject.cropX || 0,
                cropY: activeObject.cropY || 0,
            };

            // Create crop overlay with controls
            const cropRect = new Rect({
                left: activeObject.left,
                top: activeObject.top,
                width: activeObject.getScaledWidth(),
                height: activeObject.getScaledHeight(),
                fill: 'rgba(0,0,0,0.3)',
                stroke: '#fff',
                strokeWidth: 2,
                strokeDashArray: [5, 5],
                originX: activeObject.originX,
                originY: activeObject.originY,
                name: 'cropOverlay',
                selectable: true,
                evented: true,
            });

            window.canvas.add(cropRect);
            window.canvas.setActiveObject(cropRect);

            // Create confirm and cancel buttons
            this.createCropControls();

            // Listen for crop overlay modifications
            window.canvas.on('object:modified', this.updateCrop.bind(this));
        },

        // Create crop confirmation controls
        createCropControls() {
            // Create UI elements for crop controls
            const controlsContainer = document.createElement('div');
            controlsContainer.id = 'crop-controls';
            controlsContainer.style = 'position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 1000;';

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Apply Crop';
            confirmBtn.onclick = this.applyCrop.bind(this);

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.onclick = this.cancelCrop.bind(this);

            controlsContainer.appendChild(confirmBtn);
            controlsContainer.appendChild(cancelBtn);

            document.body.appendChild(controlsContainer);
        },

        // Update crop preview based on overlay position
        updateCrop(e) {
            if (!this.cropActive) return;

            const cropOverlay = e.target;
            if (!cropOverlay || cropOverlay.name !== 'cropOverlay') return;

            // TODO: Update crop preview based on overlay
        },

        // Apply the crop
        applyCrop() {
            if (!window.canvas) return;

            // Get the cropOverlay and the image
            const cropOverlay = window.canvas.getObjects().find(obj => obj.name === 'cropOverlay');
            if (!cropOverlay) return;

            const imageObjects = window.canvas.getObjects().filter(obj => obj.type === 'image');
            if (imageObjects.length === 0) return;

            // Get the image to crop (usually the one beneath the overlay)
            const imageObject = imageObjects[0];

            // Calculate crop coordinates
            // This is a simplified example - actual implementation would need to handle
            // rotation, scaling, etc. properly
            const cropX = (cropOverlay.left - imageObject.left) / imageObject.scaleX;
            const cropY = (cropOverlay.top - imageObject.top) / imageObject.scaleY;
            const cropWidth = cropOverlay.width / imageObject.scaleX;
            const cropHeight = cropOverlay.height / imageObject.scaleY;

            // Apply cropping to the image
            imageObject.set({
                cropX: cropX,
                cropY: cropY,
                width: cropWidth,
                height: cropHeight
            });

            // Clean up
            this.cleanupCrop();

            // Render changes
            window.canvas.requestRenderAll();

            // Add to history
            if (typeof addToHistory === 'function') {
                addToHistory();
            }
        },

        // Cancel crop operation
        cancelCrop() {
            if (!window.canvas) return;

            // Restore original state if available
            if (this._originalObjectState) {
                const imageObjects = window.canvas.getObjects().filter(obj => obj.type === 'image');
                if (imageObjects.length > 0) {
                    const imageObject = imageObjects[0];
                    imageObject.set(this._originalObjectState);
                }
            }

            // Clean up
            this.cleanupCrop();

            // Render changes
            window.canvas.requestRenderAll();
        },

        // Clean up after crop operation
        cleanupCrop() {
            if (!window.canvas) return;

            // Remove crop overlay
            const cropOverlay = window.canvas.getObjects().find(obj => obj.name === 'cropOverlay');
            if (cropOverlay) {
                window.canvas.remove(cropOverlay);
            }

            // Remove event listener
            window.canvas.off('object:modified', this.updateCrop);

            // Remove control buttons
            const controlsContainer = document.getElementById('crop-controls');
            if (controlsContainer) {
                controlsContainer.remove();
            }

            // Reset state
            this.cropActive = false;
            this._originalObjectState = null;
        },

        // Group selected objects
        groupSelected() {
            if (!window.canvas) return;

            const activeObject = window.canvas.getActiveObject();
            if (!activeObject || activeObject.type !== 'activeSelection') return;

            // Group the selected objects
            const group = activeObject.toGroup();

            // Give the group a unique ID and name
            group.id = `group_${Date.now()}`;
            group.name = 'Group';

            // Update canvas
            window.canvas.requestRenderAll();
            window.canvas.setActiveObject(group);

            // Add to history
            if (typeof addToHistory === 'function') {
                addToHistory();
            }

            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('object:grouped', {
                detail: {group}
            }));
        },

        // Lock/unlock selected object
        toggleLock() {
            if (!window.canvas) return;

            const activeObject = window.canvas.getActiveObject();
            if (!activeObject) return;

            // Toggle lock state
            const isLocked = activeObject.selectable === false;

            if (isLocked) {
                // Unlock the object
                activeObject.set({
                    selectable: true,
                    evented: true,
                    locked: false
                });
            } else {
                // Lock the object
                activeObject.set({
                    selectable: false,
                    evented: false,
                    locked: true
                });

                // Clear selection since the object is now locked
                window.canvas.discardActiveObject();
            }

            window.canvas.requestRenderAll();

            // Add to history
            if (typeof addToHistory === 'function') {
                addToHistory();
            }
        },

        // Toggle snap to grid functionality
        toggleSnapToGrid() {
            this.snapToGrid = !this.snapToGrid;

            if (!window.canvas) return;

            // Set canvas property for other components to check
            window.canvas.snapToGrid = this.snapToGrid;

            if (this.snapToGrid) {
                // Set grid size
                const gridSize = 20;

                // Add object moving event handler
                window.canvas.on('object:moving', function (options) {
                    const obj = options.target;

                    // Snap to grid
                    obj.set({
                        left: Math.round(obj.left / gridSize) * gridSize,
                        top: Math.round(obj.top / gridSize) * gridSize
                    });
                });
            } else {
                // Remove event handler
                window.canvas.off('object:moving');
            }
        }
    }
}