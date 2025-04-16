// src/components/settings.js
import { Line } from 'fabric';

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
            {key: 'youtube', name: 'YouTube (1280x720)', value: '1280x720'},
            {key: 'facebook', name: 'Facebook Post (1200x630)', value: '1200x630'},
            {key: 'instagram', name: 'Instagram Post (1080x1080)', value: '1080x1080'},
            {key: 'instagramStory', name: 'Instagram Story (1080x1920)', value: '1080x1920'},
            {key: 'facebookCover', name: 'Facebook Cover (820x312)', value: '820x312'},
            {key: 'linkedinPost', name: 'LinkedIn Post (1200x1200)', value: '1200x1200'},
            {key: 'linkedinCover', name: 'LinkedIn Cover (1584x396)', value: '1584x396'},
            {key: 'twitterHeader', name: 'Twitter Header (1500x500)', value: '1500x500'},
            {key: 'snapchatStory', name: 'Snapchat Story (1080x1920)', value: '1080x1920'},
            {key: 'youtubeArt', name: 'YouTube Channel Art (2560x1440)', value: '2560x1440'},
            {key: 'pinterestPin', name: 'Pinterest Pin (1600x900)', value: '1600x900'},
            {key: 'custom', name: 'Custom Size', value: 'custom'}
        ],
        filteredSizes: [],

        // Initialize settings
        init() {
            this.filteredSizes = [...this.canvasSizes];

            // Check if 'custom' is selected and show the custom size inputs
            if (this.selectedValue === 'custom') {
                this.customSizeVisible = true;
            }

            // Apply default canvas size and background
            if (window.canvas) {
                this.applyCanvasSize(this.selectedValue);
                this.updateBackgroundColor();
            }

            // For debugging - log initialization state
            console.log('Settings initialized with:', {
                selectedSize: this.selectedSize,
                selectedValue: this.selectedValue,
                customWidth: this.customWidth,
                customHeight: this.customHeight,
                customSizeVisible: this.customSizeVisible
            });
        },

        selectSize(size) {
            console.log('Size selected:', size);
            this.selectedSize = size.name;
            this.selectedValue = size.value;
            this.dropdownOpen = false;

            if (size.value === 'custom') {
                this.customSizeVisible = true;
                console.log('Custom size selected, showing inputs');
                // Don't apply canvas size yet - wait for user to click Apply button
            } else {
                this.customSizeVisible = false;
                this.applyCanvasSize(size.value);
            }
        },

        applyCanvasSize(size) {
            console.log('Applying canvas size:', size);
            if (!window.canvas) {
                console.error('Canvas not found');
                return;
            }

            // Store old dimensions
            const oldWidth = window.canvas.width;
            const oldHeight = window.canvas.height;

            let newWidth, newHeight;

            if (size === 'custom') {
                newWidth = parseInt(this.customWidth);
                newHeight = parseInt(this.customHeight);
                console.log('Using custom dimensions:', newWidth, 'x', newHeight);
            } else {
                const [width, height] = size.split('x');
                newWidth = parseInt(width);
                newHeight = parseInt(height);
                console.log('Using preset dimensions:', newWidth, 'x', newHeight);
            }

            // Don't proceed if dimensions are invalid
            if (isNaN(newWidth) || isNaN(newHeight) || newWidth <= 0 || newHeight <= 0) {
                console.warn('Invalid canvas dimensions:', newWidth, 'x', newHeight);
                return;
            }

            // Get container element
            const container = document.getElementById('canvas-container');
            if (!container) {
                console.warn('Canvas container not found');
                return;
            }

            // Update container style to match new dimensions
            const aspectRatio = newHeight / newWidth;

            // For small canvas sizes, we need to ensure the container shrinks appropriately
            // Remove the previous fixed constraints and let the canvas determine the size
            container.style.width = 'auto';
            container.style.height = 'auto';

            // Set the canvas container to exactly match the canvas dimensions
            // This ensures no white space appears around the canvas
            container.style.width = `${newWidth}px`;
            container.style.height = `${newHeight}px`;
            container.style.aspectRatio = `${newWidth} / ${newHeight}`;

            // Remove any max-width constraints that might be causing white space
            container.style.maxWidth = 'none';

            console.log('Container style updated:', {
                width: container.style.width,
                height: container.style.height,
                aspectRatio: container.style.aspectRatio
            });

            // Set new dimensions for the Fabric.js canvas
            window.canvas.setDimensions({
                width: newWidth,
                height: newHeight
            });

            console.log('Canvas dimensions set to:', newWidth, 'x', newHeight);

            // Scale factor for objects if needed
            const scaleX = newWidth / oldWidth;
            const scaleY = newHeight / oldHeight;

            // Option to scale all objects when canvas size changes - without popup
            if (oldWidth > 0 && oldHeight > 0 && (scaleX !== 1 || scaleY !== 1)) {
                // Always scale objects to fit new canvas size
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
                console.log('Objects scaled with factors:', scaleX, scaleY);
            }

            // Update canvas
            window.canvas.requestRenderAll();

            // Add to history - directly call the method on the parent fabricComponent
            if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                window.fabricComponent.addToHistory();
            }
        },

        applyCustomSize() {
            console.log('Applying custom size:', this.customWidth, 'x', this.customHeight);

            // Validation
            if (!this.customWidth || !this.customHeight) {
                console.warn('Custom dimensions missing');
                return;
            }

            const width = parseInt(this.customWidth);
            const height = parseInt(this.customHeight);

            if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
                console.warn('Invalid custom dimensions');
                return;
            }

            // Update selection display
            this.selectedSize = `Custom (${width}x${height})`;
            this.selectedValue = 'custom';

            // Apply the custom size
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

            // In Fabric v6, setting backgroundColor property is correct
            window.canvas.backgroundColor = this.backgroundColor;
            window.canvas.requestRenderAll();

            // Add to history - directly call the method on the parent component
            if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                window.fabricComponent.addToHistory();
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

                // Create grid lines with Fabric v6 syntax - Line is already imported correctly
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

                // Use the native Fabric event
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

                // Show custom size inputs if custom size is selected
                if (this.selectedValue === 'custom') {
                    this.customSizeVisible = true;
                }

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