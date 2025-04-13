// src/components/settings.js
import {Line} from 'fabric';
import {addToHistory} from '../utils/history-manager';

export default function settingsComponent() {
    return {
        selectedSize: 'TikTok (1080x1920)',
        selectedValue: '1080x1920',
        customWidth: 1200,
        customHeight: 600,
        customSizeVisible: false,
        dropdownOpen: false,
        search: '',
        backgroundColor: '#ffffff',
        canvasSizes: [
            {key: 'tiktok', name: 'TikTok (1080x1920)', value: '1080x1920'},
            {key: 'instagram', name: 'Instagram Post (1080x1080)', value: '1080x1080'},
            {key: 'facebook', name: 'Facebook Post (1200x630)', value: '1200x630'},
            {key: 'twitter', name: 'Twitter Post (1200x675)', value: '1200x675'},
            {key: 'custom', name: 'Custom Size', value: 'custom'}
        ],
        filteredSizes: [],

        // Initialize settings
        init() {
            this.filteredSizes = [...this.canvasSizes];

            // Apply default canvas size and background
            if (window.canvas) {
                this.applyCanvasSize(this.selectedValue);
                this.updateBackgroundColor();
            }
        },

        selectSize(size) {
            this.selectedSize = size.name;
            this.selectedValue = size.value;
            this.dropdownOpen = false;

            if (size.value === 'custom') {
                this.customSizeVisible = true;
            } else {
                this.customSizeVisible = false;
                this.applyCanvasSize(size.value);
            }
        },

        applyCanvasSize(size) {
            if (!window.canvas) return;

            // Store old dimensions
            const oldWidth = window.canvas.width;
            const oldHeight = window.canvas.height;

            let newWidth, newHeight;

            if (size === 'custom') {
                newWidth = parseInt(this.customWidth);
                newHeight = parseInt(this.customHeight);
            } else {
                const [width, height] = size.split('x');
                newWidth = parseInt(width);
                newHeight = parseInt(height);
            }

            // Don't proceed if dimensions are invalid
            if (isNaN(newWidth) || isNaN(newHeight) || newWidth <= 0 || newHeight <= 0) {
                console.warn('Invalid canvas dimensions');
                return;
            }

            // Set new dimensions
            window.canvas.setDimensions({
                width: newWidth,
                height: newHeight
            });

            // Scale factor for objects if needed
            const scaleX = newWidth / oldWidth;
            const scaleY = newHeight / oldHeight;

            // Option to scale all objects when canvas size changes
            if (oldWidth > 0 && oldHeight > 0 && (scaleX !== 1 || scaleY !== 1)) {
                // Add a confirmation dialog or preference option before scaling
                const scaleObjects = confirm("Do you want to scale objects to fit the new canvas size?");

                if (scaleObjects) {
                    const objects = window.canvas.getObjects();
                    objects.forEach(obj => {
                        // Scale position proportionally
                        const objectLeft = obj.left * scaleX;
                        const objectTop = obj.top * scaleY;

                        // Update object position
                        obj.set({
                            left: objectLeft,
                            top: objectTop,
                            scaleX: obj.scaleX * scaleX,
                            scaleY: obj.scaleY * scaleY
                        });

                        obj.setCoords();
                    });
                } else {
                    // Center objects on the new canvas
                    window.canvas.centerObject(window.canvas.getActiveObject());
                }
            }

            // Update canvas
            window.canvas.requestRenderAll();

            // Add to history
            if (typeof addToHistory === 'function') {
                addToHistory();
            }

            // Notify other components about size change
            window.dispatchEvent(new CustomEvent('canvas:resized', {
                detail: {width: newWidth, height: newHeight}
            }));
        },

        applyCustomSize() {
            if (!this.customWidth || !this.customHeight) return;

            this.selectedSize = `Custom (${this.customWidth}x${this.customHeight})`;
            this.selectedValue = 'custom';
            this.applyCanvasSize('custom');
        },

        toggleDropdown() {
            this.dropdownOpen = !this.dropdownOpen;
        },

        filterSizes() {
            if (!this.search) {
                this.filteredSizes = [...this.canvasSizes];
                return;
            }

            this.filteredSizes = this.canvasSizes.filter(size =>
                size.name.toLowerCase().includes(this.search.toLowerCase())
            );
        },

        updateBackgroundColor() {
            if (!window.canvas) return;

            // FIX: Use setBackgroundColor correctly
            // Changed from setBackgroundColor() to just setting the backgroundColor property
            window.canvas.backgroundColor = this.backgroundColor;
            window.canvas.requestRenderAll();

            // Add to history
            if (typeof addToHistory === 'function') {
                addToHistory();
            }
        },

        toggleGrid(show) {
            if (!window.canvas) return;

            // Remove existing grid first
            this.removeGrid();

            if (show) {
                const gridSize = 20;
                const width = window.canvas.width;
                const height = window.canvas.height;

                // Create grid lines
                for (let i = 0; i <= width / gridSize; i++) {
                    const xPos = i * gridSize;
                    const verticalLine = new Line([xPos, 0, xPos, height], {
                        stroke: '#dcdcdc',
                        strokeWidth: 1,
                        selectable: false,
                        evented: false,
                        id: `grid_v_${i}`,
                    });
                    window.canvas.add(verticalLine);
                    verticalLine.sendToBack();
                }

                for (let i = 0; i <= height / gridSize; i++) {
                    const yPos = i * gridSize;
                    const horizontalLine = new Line([0, yPos, width, yPos], {
                        stroke: '#dcdcdc',
                        strokeWidth: 1,
                        selectable: false,
                        evented: false,
                        id: `grid_h_${i}`,
                    });
                    window.canvas.add(horizontalLine);
                    horizontalLine.sendToBack();
                }

                window.canvas.requestRenderAll();
            }
        },

        // Remove grid from canvas
        removeGrid() {
            if (!window.canvas) return;

            const gridObjects = window.canvas.getObjects().filter(obj =>
                obj.id && (obj.id.startsWith('grid_v_') || obj.id.startsWith('grid_h_'))
            );

            if (gridObjects.length > 0) {
                gridObjects.forEach(grid => {
                    window.canvas.remove(grid);
                });
                window.canvas.requestRenderAll();
            }
        },

        // Toggle snap to grid
        toggleSnapToGrid(enable) {
            if (!window.canvas) return;

            window.canvas.snapToGrid = enable;

            if (enable) {
                // Grid size
                const gridSize = 20;

                // Add snapToGrid event handler
                window.canvas.on('object:moving', function (options) {
                    const obj = options.target;
                    obj.set({
                        left: Math.round(obj.left / gridSize) * gridSize,
                        top: Math.round(obj.top / gridSize) * gridSize
                    });
                });
            } else {
                // Remove event handler
                window.canvas.off('object:moving');
            }
        },

        // Export canvas settings
        exportSettings() {
            const settings = {
                canvasSize: {
                    width: window.canvas ? window.canvas.width : this.customWidth,
                    height: window.canvas ? window.canvas.height : this.customHeight,
                    selectedSize: this.selectedSize,
                    selectedValue: this.selectedValue
                },
                backgroundColor: this.backgroundColor
            };

            return settings;
        },

        // Import canvas settings
        importSettings(settings) {
            if (!settings) return;

            // Apply size
            if (settings.canvasSize) {
                this.customWidth = settings.canvasSize.width;
                this.customHeight = settings.canvasSize.height;
                this.selectedSize = settings.canvasSize.selectedSize;
                this.selectedValue = settings.canvasSize.selectedValue;

                this.applyCanvasSize(this.selectedValue);
            }

            // Apply background color
            if (settings.backgroundColor) {
                this.backgroundColor = settings.backgroundColor;
                this.updateBackgroundColor();
            }
        }
    }
}