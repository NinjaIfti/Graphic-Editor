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

        // Updated alignObjects method for toolbar.js component

        alignObjects(direction) {
            if (!window.canvas) return;

            const activeObject = window.canvas.getActiveObject();
            if (!activeObject) return;

            // Check if we have a single object or multiple objects
            const isMultipleSelection = (activeObject.type === 'activeSelection' || activeObject.type === 'group');

            if (!isMultipleSelection) {
                // CASE 1: Single object - align relative to the canvas
                let targetX, targetY;
                const canvasWidth = window.canvas.width;
                const canvasHeight = window.canvas.height;

                // Get object bounds
                const objectWidth = activeObject.getScaledWidth();
                const objectHeight = activeObject.getScaledHeight();

                // Calculate target position based on alignment direction
                // Account for object origin points (top-left, center, etc.)
                switch (direction) {
                    case 'left':
                        // Align left edge to left canvas edge
                        targetX = 0;
                        if (activeObject.originX === 'center') {
                            targetX = objectWidth / 2;
                        }
                        activeObject.set('left', targetX);
                        break;

                    case 'centerH':
                        // Align center horizontally
                        targetX = canvasWidth / 2;
                        if (activeObject.originX !== 'center') {
                            targetX = canvasWidth / 2 + (objectWidth / 2);
                        }
                        activeObject.set('left', targetX);
                        break;

                    case 'right':
                        // Align right edge to right canvas edge
                        targetX = canvasWidth;
                        if (activeObject.originX === 'center') {
                            targetX = canvasWidth - (objectWidth / 2);
                        } else {
                            targetX = canvasWidth - objectWidth;
                        }
                        activeObject.set('left', targetX);
                        break;

                    case 'top':
                        // Align top edge to top canvas edge
                        targetY = 0;
                        if (activeObject.originY === 'center') {
                            targetY = objectHeight / 2;
                        }
                        activeObject.set('top', targetY);
                        break;

                    case 'centerV':
                        // Align center vertically
                        targetY = canvasHeight / 2;
                        if (activeObject.originY !== 'center') {
                            targetY = canvasHeight / 2 + (objectHeight / 2);
                        }
                        activeObject.set('top', targetY);
                        break;

                    case 'bottom':
                        // Align bottom edge to bottom canvas edge
                        targetY = canvasHeight;
                        if (activeObject.originY === 'center') {
                            targetY = canvasHeight - (objectHeight / 2);
                        } else {
                            targetY = canvasHeight - objectHeight;
                        }
                        activeObject.set('top', targetY);
                        break;
                }
            } else {
                // CASE 2: Multiple objects - align them relative to each other
                const objects = activeObject.getObjects();
                if (objects.length <= 1) return; // Nothing to align with just one object

                // Calculate bounds for all objects in the selection
                let minLeft = Infinity, maxRight = -Infinity, minTop = Infinity, maxBottom = -Infinity;

                // First pass: get the bounds
                objects.forEach(obj => {
                    // Account for object transformations
                    const objBounds = obj.getBoundingRect(true, true);
                    minLeft = Math.min(minLeft, objBounds.left);
                    maxRight = Math.max(maxRight, objBounds.left + objBounds.width);
                    minTop = Math.min(minTop, objBounds.top);
                    maxBottom = Math.max(maxBottom, objBounds.top + objBounds.height);
                });

                // The center point of the selection
                const selectionCenterX = (minLeft + maxRight) / 2;
                const selectionCenterY = (minTop + maxBottom) / 2;

                // Second pass: align objects based on direction
                switch (direction) {
                    case 'left':
                        // Align all objects' left edges to the leftmost point
                        objects.forEach(obj => {
                            const objBounds = obj.getBoundingRect(true, true);
                            const deltaX = minLeft - objBounds.left;
                            obj.set('left', obj.left + deltaX);
                        });
                        break;

                    case 'centerH':
                        // Align all objects to the horizontal center of the selection
                        objects.forEach(obj => {
                            const objBounds = obj.getBoundingRect(true, true);
                            const objCenterX = objBounds.left + (objBounds.width / 2);
                            const deltaX = selectionCenterX - objCenterX;
                            obj.set('left', obj.left + deltaX);
                        });
                        break;

                    case 'right':
                        // Align all objects' right edges to the rightmost point
                        objects.forEach(obj => {
                            const objBounds = obj.getBoundingRect(true, true);
                            const objRight = objBounds.left + objBounds.width;
                            const deltaX = maxRight - objRight;
                            obj.set('left', obj.left + deltaX);
                        });
                        break;

                    case 'top':
                        // Align all objects' top edges to the topmost point
                        objects.forEach(obj => {
                            const objBounds = obj.getBoundingRect(true, true);
                            const deltaY = minTop - objBounds.top;
                            obj.set('top', obj.top + deltaY);
                        });
                        break;

                    case 'centerV':
                        // Align all objects to the vertical center of the selection
                        objects.forEach(obj => {
                            const objBounds = obj.getBoundingRect(true, true);
                            const objCenterY = objBounds.top + (objBounds.height / 2);
                            const deltaY = selectionCenterY - objCenterY;
                            obj.set('top', obj.top + deltaY);
                        });
                        break;

                    case 'bottom':
                        // Align all objects' bottom edges to the bottommost point
                        objects.forEach(obj => {
                            const objBounds = obj.getBoundingRect(true, true);
                            const objBottom = objBounds.top + objBounds.height;
                            const deltaY = maxBottom - objBottom;
                            obj.set('top', obj.top + deltaY);
                        });
                        break;
                }
            }

            // Update object coordinates and render
            activeObject.setCoords();
            window.canvas.requestRenderAll();

            // Add to history
            if (typeof addToHistory === 'function') {
                addToHistory();
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

        deleteSelected() {
            if (!window.canvas) return;

            const activeObject = window.canvas.getActiveObject();
            if (activeObject) {
                if (activeObject.type === 'activeSelection') {
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
                }

                // Update layers panel if needed
                window.dispatchEvent(new CustomEvent('object:removed', {
                    detail: {object: activeObject}
                }));
            }
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