// settings.js 
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
        exportWidth: 1080,
        exportHeight: 1920,
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
            {key: 'pinterestPin', name: 'Pinterest Pin (1000x1500)', value: '1000x1500'},
            {key: 'custom', name: 'Custom Size', value: 'custom'}
        ],
        filteredSizes: [],
        originalImageData: {}, // Store original image dimensions
        
        // Initialize settings
        init() {
            console.log('🚀 Initializing settings component');
            this.filteredSizes = [...this.canvasSizes];

            // Check if 'custom' is selected and show the custom size inputs
            if (this.selectedValue === 'custom') {
                this.customSizeVisible = true;
            }

            // Apply default canvas size and background
            if (window.canvas) {
                // First scan the canvas for any existing images and save their original dimensions
                this.scanExistingImages();

                // Then apply the canvas size
                this.applyCanvasSize(this.selectedValue);
                this.updateBackgroundColor();
            }

            // Add window resize handler
            window.addEventListener('resize', this.handleWindowResize.bind(this));

            // Make settings available globally
            if (window.fabricComponent) {
                window.fabricComponent.settings = this;
            }

            console.log('✅ Settings initialized with:', {
                selectedSize: this.selectedSize,
                selectedValue: this.selectedValue,
                exportWidth: this.exportWidth,
                exportHeight: this.exportHeight
            });
        },

        // Scan canvas for images to track original dimensions
        scanExistingImages() {
            if (!window.canvas) return;
            
            const objects = window.canvas.getObjects();
            const images = objects.filter(obj => obj.type === 'image');
            
            images.forEach(img => {
                const src = img.getSrc();
                if (src && !this.originalImageData[src]) {
                    this.originalImageData[src] = {
                        width: img.width,
                        height: img.height,
                        aspectRatio: img.width / img.height
                    };
                }
            });
        },

        // Handle window resize
        handleWindowResize() {
            // Debounce the resize event to avoid excessive updates
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => {
                this.applyCanvasSize(this.selectedValue);
            }, 250);
        },
        
        selectSize(size) {
            console.log('🔄 Size selected:', size);
            this.selectedSize = size.name;
            this.selectedValue = size.value;
            this.dropdownOpen = false;

            if (size.value === 'custom') {
                this.customSizeVisible = true;
                console.log('📝 Custom size selected, showing inputs');
            } else {
                this.customSizeVisible = false;
                this.applyCanvasSize(size.value);
            }
        },
        
        changeSize(width, height) {
            this.width = width;
            this.height = height;
            const canvasEl = this.$refs.canvas;
            const windowWidth = this.$refs.canvasContainer.clientWidth;
            const windowHeight = this.$refs.canvasContainer.clientHeight;
            let ar = width / height;
            let newWidth = windowWidth / 1.5;
            let newHeight = newWidth / ar;

            console.log(newWidth, newHeight, windowWidth, windowHeight);
            if (newHeight > windowHeight) {
                newHeight = windowHeight / 1.5;
                newWidth = (windowHeight * ar);
            }

            canvas.setDimensions({width: newWidth, height: newHeight});
            canvas.renderAll();
        },

        applyCanvasSize(sizeValue) {
            console.log('📐 Applying canvas size:', sizeValue);

            if (!window.canvas) {
                console.warn('⚠️ Canvas not found');
                return;
            }

            // Get the container element
            const container = document.getElementById('canvas-container');
            if (!container) {
                console.warn('⚠️ Canvas container not found');
                return;
            }

            let width, height;

            // Set dimensions based on selected value
            if (sizeValue === 'custom') {
                width = parseInt(this.customWidth);
                height = parseInt(this.customHeight);
            } else {
                // Parse the dimensions from size value (e.g., '1080x1920')
                const dimensions = sizeValue.split('x');
                width = parseInt(dimensions[0]);
                height = parseInt(dimensions[1]);
            }

            // Validate dimensions
            if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
                console.warn('⚠️ Invalid dimensions:', width, height);
                return;
            }

            // Update export dimensions for reference
            this.exportWidth = width;
            this.exportHeight = height;

            // Ensure fabricComponent also has the export dimensions - critical for export functionality
            if (window.fabricComponent) {
                window.fabricComponent.exportWidth = width;
                window.fabricComponent.exportHeight = height;
                
                // Explicitly make settings available globally to ensure export functions can access it
                window.fabricComponent.settings = this;
                
                console.log(`📊 Updated fabricComponent export dimensions: ${width}x${height}`);
            } else {
                console.warn('⚠️ fabricComponent not found for dimension update');
            }

            // Calculate viewport constraints
            const viewportWidth = window.innerWidth * 0.8;  // 80% of viewport width
            const viewportHeight = window.innerHeight * 0.8; // 80% of viewport height

            // Calculate aspect ratio and container dimensions
            const aspectRatio = width / height;
            let containerWidth, containerHeight;

            if (aspectRatio > 1) {
                // Landscape orientation
                containerWidth = Math.min(viewportWidth, 1000); // Max width 1000px
                containerHeight = containerWidth / aspectRatio;

                // Ensure height doesn't exceed viewport
                if (containerHeight > viewportHeight) {
                    containerHeight = viewportHeight;
                    containerWidth = containerHeight * aspectRatio;
                }
            } else {
                // Portrait orientation
                containerHeight = Math.min(viewportHeight, 660); // Max height 660px
                containerWidth = containerHeight * aspectRatio;

                // Ensure width doesn't exceed viewport
                if (containerWidth > viewportWidth) {
                    containerWidth = viewportWidth;
                    containerHeight = containerWidth / aspectRatio;
                }
            }

            // Update container style
            container.style.width = `${containerWidth}px`;
            container.style.height = `${containerHeight}px`;

            // Set the fabric canvas dimensions (internal canvas size)
            window.canvas.setWidth(width);
            window.canvas.setHeight(height);

            // Calculate zoom to fit canvas in container
            const zoomX = containerWidth / width;
            const zoomY = containerHeight / height;
            const zoom = Math.min(zoomX, zoomY);

            // Apply zoom
            window.canvas.setZoom(zoom);

            // Center canvas content
            window.canvas.viewportTransform[4] = (containerWidth - width * zoom) / 2;
            window.canvas.viewportTransform[5] = (containerHeight - height * zoom) / 2;

            // Refresh canvas
            window.canvas.requestRenderAll();

            console.log(`📏 Canvas size set to ${width}x${height} with zoom: ${zoom.toFixed(2)}`);
            console.log(`📏 Container size set to ${containerWidth.toFixed(0)}x${containerHeight.toFixed(0)}`);
            console.log(`📏 Export dimensions set to ${this.exportWidth}x${this.exportHeight}`);

            // Add to history if available
            if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                window.fabricComponent.addToHistory();
            }
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

            console.log(`🎨 Updating background color to ${this.backgroundColor}`);

            // In Fabric v6, setting backgroundColor property is correct
            window.canvas.backgroundColor = this.backgroundColor;
            window.canvas.requestRenderAll();

            // Add to history
            if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                window.fabricComponent.addToHistory();
            }
        },

        toggleGrid(show) {
            if (!window.canvas) return;

            console.log(`📏 ${show ? 'Showing' : 'Hiding'} grid`);

            // Remove existing grid first
            this.removeGrid();

            if (show) {
                const gridSize = 20;
                const width = window.canvas.width;
                const height = window.canvas.height;

                // Create grid lines with Fabric v6 syntax
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
                console.log(`🧹 Removing ${gridObjects.length} grid lines`);
                gridObjects.forEach(grid => {
                    window.canvas.remove(grid);
                });
                window.canvas.requestRenderAll();
            }
        },

        // Toggle snap to grid
        toggleSnapToGrid(enable) {
            if (!window.canvas) return;

            console.log(`📌 ${enable ? 'Enabling' : 'Disabling'} snap to grid`);

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
                console.log(`📏 Grid size set to ${gridSize}px`);
            } else {
                // Remove event handler
                window.canvas.off('object:moving');
                console.log(`🔄 Snap to grid event handler removed`);
            }
        },

        // Export canvas settings
        exportSettings() {
            console.log(`💾 Exporting canvas settings`);

            const settings = {
                canvasSize: {
                    width: window.fabricComponent?.exportWidth || this.customWidth,
                    height: window.fabricComponent?.exportHeight || this.customHeight,
                    selectedSize: this.selectedSize,
                    selectedValue: this.selectedValue
                },
                backgroundColor: this.backgroundColor
            };

            console.log(`📋 Settings exported:`, settings);
            return settings;
        },

        // Import canvas settings
        importSettings(settings) {
            console.log(`📂 Importing canvas settings:`, settings);

            if (!settings) {
                console.warn(`⚠️ No settings to import`);
                return;
            }

            // Apply size
            if (settings.canvasSize) {
                this.customWidth = settings.canvasSize.width;
                this.customHeight = settings.canvasSize.height;
                this.selectedSize = settings.canvasSize.selectedSize;
                this.selectedValue = settings.canvasSize.selectedValue;

                console.log(`📏 Imported canvas size: ${this.selectedSize} (${this.selectedValue})`);

                // Show custom size inputs if custom size is selected
                if (this.selectedValue === 'custom') {
                    this.customSizeVisible = true;
                    console.log(`📝 Custom size detected, showing inputs: ${this.customWidth}x${this.customHeight}`);
                }

                this.applyCanvasSize(this.selectedValue);
            }

            // Apply background color
            if (settings.backgroundColor) {
                this.backgroundColor = settings.backgroundColor;
                console.log(`🎨 Imported background color: ${this.backgroundColor}`);
                this.updateBackgroundColor();
            }

            console.log(`✅ Settings import complete`);
        },

        // Debug method to inspect image properties
        debugImageProperties(imgObj) {
            if (!imgObj || imgObj.type !== 'image') {
                console.warn(`⚠️ Not an image object`);
                return;
            }

            console.log(`🔍 === IMAGE DEBUG PROPERTIES ===`);
            console.log(`🖼️ Source: ${imgObj.getSrc()?.substring(0, 50) || 'No source'}`);
            console.log(`📊 Width: ${imgObj.width}, Height: ${imgObj.height}`);
            console.log(`📊 ScaleX: ${imgObj.scaleX}, ScaleY: ${imgObj.scaleY}`);
            console.log(`📊 Displayed Size: ${(imgObj.width * imgObj.scaleX).toFixed(1)} x ${(imgObj.height * imgObj.scaleY).toFixed(1)}`);
            console.log(`📍 Position: (${imgObj.left.toFixed(1)}, ${imgObj.top.toFixed(1)})`);
            console.log(`📍 Origin: ${imgObj.originX}, ${imgObj.originY}`);
            console.log(`🔄 Angle: ${imgObj.angle}`);

            // Check if we have original dimensions
            const imgSrc = imgObj.getSrc();
            if (imgSrc && this.originalImageData[imgSrc]) {
                const origData = this.originalImageData[imgSrc];
                console.log(`📏 Original Dimensions: ${origData.width} x ${origData.height}`);
                console.log(`📊 Original Ratio: ${origData.aspectRatio.toFixed(4)}`);

                // Calculate current ratio
                const currentRatio = (imgObj.width * imgObj.scaleX) / (imgObj.height * imgObj.scaleY);
                console.log(`📊 Current Ratio: ${currentRatio.toFixed(4)}`);

                // Check if aspect ratio is preserved
                const ratioDiff = Math.abs(currentRatio - origData.aspectRatio);
                const ratioPercent = Math.abs((currentRatio / origData.aspectRatio - 1) * 100);

                if (ratioPercent > 1) {
                    console.error(`❌ ASPECT RATIO ERROR: Off by ${ratioPercent.toFixed(2)}%`);
                    console.log(`❌ Scale difference: ${Math.abs(imgObj.scaleX - imgObj.scaleY).toFixed(4)}`);
                } else {
                    console.log(`✅ Aspect ratio preserved (${ratioPercent.toFixed(2)}% difference)`);
                }
            } else {
                console.warn(`⚠️ No original dimensions data available`);
            }

            console.log(`🔍 === END IMAGE DEBUG ===`);
        },

        // Debug method to log all canvas objects
        debugCanvasObjects() {
            if (!window.canvas) {
                console.warn(`⚠️ Canvas not found`);
                return;
            }

            console.log(`🔍 === CANVAS OBJECTS DEBUG ===`);
            const objects = window.canvas.getObjects();
            console.log(`📋 Total objects: ${objects.length}`);

            const countByType = {};
            objects.forEach(obj => {
                countByType[obj.type] = (countByType[obj.type] || 0) + 1;
            });

            console.log(`📊 Objects by type:`, countByType);

            // Log image objects in detail
            const imageObjects = objects.filter(obj => obj.type === 'image');
            if (imageObjects.length > 0) {
                console.log(`🖼️ Found ${imageObjects.length} images:`);
                imageObjects.forEach((img, i) => {
                    console.log(`  Image ${i+1}:`);
                    console.log(`  - Width: ${img.width}, Height: ${img.height}`);
                    console.log(`  - ScaleX: ${img.scaleX}, ScaleY: ${img.scaleY}`);
                    console.log(`  - Display size: ${(img.width * img.scaleX).toFixed(1)}x${(img.height * img.scaleY).toFixed(1)}`);

                    // Check aspect ratio
                    const displayRatio = (img.width * img.scaleX) / (img.height * img.scaleY);
                    console.log(`  - Display ratio: ${displayRatio.toFixed(4)}`);

                    const imgSrc = img.getSrc();
                    if (imgSrc && this.originalImageData[imgSrc]) {
                        const origRatio = this.originalImageData[imgSrc].aspectRatio;
                        const ratioDiff = Math.abs(displayRatio - origRatio);
                        const ratioPercent = Math.abs((displayRatio / origRatio - 1) * 100);

                        console.log(`  - Original ratio: ${origRatio.toFixed(4)}`);
                        console.log(`  - Ratio match: ${ratioPercent < 1 ? '✅' : '❌'} (${ratioPercent.toFixed(2)}% difference)`);
                    }
                });
            }

            console.log(`🔍 === END CANVAS OBJECTS DEBUG ===`);
        }
    };
}