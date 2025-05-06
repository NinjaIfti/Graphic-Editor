import {FabricImage, filters, Rect} from 'fabric';
import Alpine from 'alpinejs';

export default function uploadsComponent() {
    return {
        files: [],
        selectedObject: null,
        selectedImage: null,
        activeFilter: '',
        uploadedItems: [],
        filterAvailable: false,
        originalImage: null,
        filesUpdated: 0,

        // Image filter properties with default values
        filters: {
            brightness: 0,
            contrast: 0,
            blur: 0,
            noise: 0,
            saturation: 0,
            hue: 0,
            pixelate: 2,
        },

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

        // Initialize the component
        init() {
            this.checkFilterAvailability();

            // Initialize arrays
            this.files = [];
            this.uploadedItems = [];
            this.filesUpdated = 0;

            // Add listeners for history operations to maintain panel state
            window.addEventListener('history:operation:start', (e) => {
                // Store current image selection for later restoration
                if (this.selectedImage) {
                    this._lastSelectedImage = {
                        id: this.selectedImage.id,
                        left: this.selectedImage.left,
                        top: this.selectedImage.top,
                        width: this.selectedImage.width,
                        height: this.selectedImage.height,
                        src: this.selectedImage.src || (this.selectedImage._element && this.selectedImage._element.src)
                    };
                    console.log('Storing image selection for history operation', this._lastSelectedImage);
                }
            });

            window.addEventListener('history:operation:end', (e) => {
                // Ensure the panel stays active
                if (window.fabricComponent && window.fabricComponent.activeTool === 'uploads') {
                    console.log('Uploads panel is active after history operation');
                    
                    // Sync filter sliders if filter data is available
                    if (e.detail.filterData && e.detail.filterData.filters) {
                        console.log('Syncing filter UI with restored filter values', e.detail.filterData);
                        
                        // Update the filter model values to match the restored state
                        const filterData = e.detail.filterData.filters;
                        
                        // Update each filter value if it exists in the data
                        if (filterData.brightness !== undefined) this.filters.brightness = filterData.brightness;
                        if (filterData.contrast !== undefined) this.filters.contrast = filterData.contrast;
                        if (filterData.blur !== undefined) this.filters.blur = filterData.blur;
                        if (filterData.saturation !== undefined) this.filters.saturation = filterData.saturation;
                        if (filterData.noise !== undefined) this.filters.noise = filterData.noise;
                        if (filterData.hue !== undefined) this.filters.hue = filterData.hue;
                        if (filterData.pixelate !== undefined && filterData.pixelate > 2) this.filters.pixelate = filterData.pixelate;
                        
                        console.log('Updated filter values:', this.filters);
                    } else {
                        // If no filter data but we have a selected image with no filters, reset filter UI
                        setTimeout(() => {
                            if (this.selectedImage && (!this.selectedImage.filters || this.selectedImage.filters.length === 0)) {
                                console.log('Selected image has no filters, resetting filter UI');
                                
                                // Reset filter values to default
                                this.filters = {
                                    brightness: 0,
                                    contrast: 0,
                                    blur: 0,
                                    noise: 0,
                                    saturation: 0,
                                    hue: 0,
                                    pixelate: 2,
                                };
                            }
                        }, 50);
                    }
                    
                    // Give a moment for canvas to update
                    setTimeout(() => {
                        // Check if we still have a selected image
                        if (!this.selectedImage && window.canvas) {
                            console.log('Trying to restore image selection after history operation');
                            
                            // First try to get currently active object
                            const active = window.canvas.getActiveObject();
                            if (active && active.type === 'image') {
                                this.selectedObject = active;
                                this.selectedImage = active;
                                this.syncObjectProperties();
                                console.log('Found active image object');
                                return;
                            }
                            
                            // Otherwise try to find a matching image from our stored reference
                            if (this._lastSelectedImage) {
                                const images = window.canvas.getObjects().filter(obj => obj.type === 'image');
                                
                                let bestMatch = null;
                                let bestScore = -1;
                                
                                // Try to find the best matching image based on stored properties
                                images.forEach(img => {
                                    let score = 0;
                                    
                                    // Check by id first
                                    if (this._lastSelectedImage.id && img.id === this._lastSelectedImage.id) {
                                        score += 100;
                                    }
                                    
                                    // Check by position
                                    if (this._lastSelectedImage.left && this._lastSelectedImage.top) {
                                        const posScore = 50 - (
                                            Math.abs(img.left - this._lastSelectedImage.left) + 
                                            Math.abs(img.top - this._lastSelectedImage.top)
                                        ) / 10;
                                        if (posScore > 0) score += posScore;
                                    }
                                    
                                    // Check by source
                                    if (this._lastSelectedImage.src && 
                                        (img.src === this._lastSelectedImage.src || 
                                         (img._element && img._element.src === this._lastSelectedImage.src))) {
                                        score += 75;
                                    }
                                    
                                    if (score > bestScore) {
                                        bestScore = score;
                                        bestMatch = img;
                                    }
                                });
                                
                                // Select the best matching image if found
                                if (bestMatch) {
                                    window.canvas.setActiveObject(bestMatch);
                                    this.selectedObject = bestMatch;
                                    this.selectedImage = bestMatch;
                                    this.syncObjectProperties();
                                    window.canvas.requestRenderAll();
                                    console.log('Restored image selection by properties match');
                                }
                                // If no matching image found, select any image
                                else if (images.length > 0) {
                                    window.canvas.setActiveObject(images[0]);
                                    this.selectedObject = images[0];
                                    this.selectedImage = images[0];
                                    this.syncObjectProperties();
                                    window.canvas.requestRenderAll();
                                    console.log('Selected first available image');
                                }
                            }
                        }
                    }, 50);
                }
            });

            // Watch for selection changes from fabric.js
            if (window.canvas) {
                window.canvas.on('selection:created', (e) => {
                    if (e.selected && e.selected[0] && e.selected[0].type === 'image') {
                        this.selectedObject = e.selected[0];
                        this.selectedImage = e.selected[0];
                        this.syncObjectProperties();
                    } else if (e.selected && e.selected[0]) {
                        // Handle selection of non-image objects
                        this.selectedObject = e.selected[0];
                        this.selectedImage = null;
                        this.syncObjectProperties();
                    }
                });

                // Watch for object modification to update stored filter states
                window.canvas.on('object:modified', (e) => {
                    if (e.target && e.target.type === 'image' && 
                        e.target.filters && e.target.filters.length > 0) {
                        // Store filter state for history operations
                        if (!e.target._filterBackup) {
                            e.target._filterBackup = {
                                count: e.target.filters.length,
                                width: e.target.width,
                                height: e.target.height,
                                scaleX: e.target.scaleX,
                                scaleY: e.target.scaleY,
                                left: e.target.left,
                                top: e.target.top,
                                angle: e.target.angle || 0,
                                flipX: e.target.flipX || false,
                                flipY: e.target.flipY || false,
                                originX: e.target.originX || 'center',
                                originY: e.target.originY || 'center'
                            };
                        }
                    }
                });

                window.canvas.on('selection:updated', (e) => {
                    if (e.selected && e.selected[0] && e.selected[0].type === 'image') {
                        this.selectedObject = e.selected[0];
                        this.selectedImage = e.selected[0];
                        this.syncObjectProperties();
                    } else if (e.selected && e.selected[0]) {
                        // Handle selection of non-image objects
                        this.selectedObject = e.selected[0];
                        this.selectedImage = null;
                        this.syncObjectProperties();
                    }
                });

                window.canvas.on('selection:cleared', () => {
                    this.selectedObject = null;
                    this.selectedImage = null;
                });
            }
        },

        // Check if fabric.js filters are available
        checkFilterAvailability() {
            if (typeof filters === "undefined") {
                this.filterAvailable = false;
                return;
            }
            this.filterAvailable = true;
        },

        storeOriginalImage() {
            if (!this.selectedObject || this.selectedObject.type !== 'image') {
                return;
            }

            try {
                if (this.selectedObject.getElement) {
                    this.originalImage = this.selectedObject.getElement();
                } else if (this.selectedObject.getSrc) {
                    const imgSrc = this.selectedObject.getSrc();
                    const img = new Image();
                    img.src = imgSrc;
                    img.crossOrigin = "anonymous";
                    this.originalImage = img;
                }
            } catch (error) {
                console.log('[UPLOADS] Error storing original image:', error);
            }
        },

        resetFilters() {
            this.filters = {
                brightness: 0,
                contrast: 0,
                blur: 0,
                noise: 0,
                saturation: 0,
                hue: 0,
                pixelate: 2,
            };

            if (this.selectedImage) {
                // Reset the image filters
                this.selectedImage.filters = [];
                this.selectedImage.applyFilters();
                window.canvas.requestRenderAll();
                window.fabricComponent.addToHistory();
            }

            this.activeFilter = '';

            // Update UI
            setTimeout(() => {
                const sliders = document.querySelectorAll('input[type="range"]');
                sliders.forEach(slider => {
                    const filterType = slider.getAttribute('data-filter') || slider.getAttribute('@input')?.split(',')[0]?.trim().replace(/uploads.applySimpleFilter\(\'|\'$/g, '');

                    if (filterType && this.filters[filterType] !== undefined) {
                        slider.value = this.filters[filterType];
                    }
                });
            }, 0);
        },

        renderUploadedImages() {
            console.log('[UPLOADS] Rendering uploaded images, count:', this.files.length);

            setTimeout(() => {
                const container = document.getElementById("file-upload-con");
                if (!container) {
                    console.warn('[UPLOADS] Upload container not found');
                    return;
                }

                // Clear the container first
                container.innerHTML = "";

                // Render each image
                this.files.forEach((file, index) => {
                    const imgElement = document.createElement("div");
                    imgElement.className = "aspect-square border border-gray-200 rounded overflow-hidden relative group";

                    // Create the image element
                    const img = document.createElement("img");
                    img.src = file.url;
                    img.alt = file.name;
                    img.className = "w-full h-full object-cover cursor-pointer";
                    img.setAttribute('data-upload-url', file.url);
                    img.draggable = true;

                    // Add regular click handler
                    img.onclick = () => {
                        this.addImageToCanvas(file.url);
                    };

                    // Add drag start handler for the new mask functionality
                    img.addEventListener('dragstart', (e) => {
                        console.log('[UPLOADS] Started dragging image:', file.url);
                        e.dataTransfer.setData('text/plain', file.url);
                        e.dataTransfer.effectAllowed = 'copy';
                    });

                    // Create the delete button
                    const deleteBtn = document.createElement("div");
                    deleteBtn.className = "absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200";
                    deleteBtn.innerHTML = `
                <button class="bg-white bg-opacity-80 hover:bg-opacity-100 p-1.5 rounded-full text-red-500 hover:text-red-700 shadow-sm">
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            `;

                    // Add the deleteImage click handler
                    const self = this; // Store reference to component
                    deleteBtn.querySelector('button').addEventListener('click', function (e) {
                        e.stopPropagation();
                        self.deleteImage(file.url);
                    });

                    // Append elements to the container
                    imgElement.appendChild(img);
                    imgElement.appendChild(deleteBtn);
                    container.appendChild(imgElement);
                });

                console.log('[UPLOADS] Rendered', this.files.length, 'images in upload panel');
            }, 0);
        },

        deleteImage(url) {
            console.log('[UPLOADS] Deleting image:', url);

            // Find the index of the image to delete
            const fileIndex = this.files.findIndex(file => file.url === url);
            const uploadedIndex = this.uploadedItems.findIndex(item => item.url === url);

            if (fileIndex !== -1) {
                // Remove from files array
                this.files.splice(fileIndex, 1);
            }

            if (uploadedIndex !== -1) {
                // Remove from uploadedItems array
                this.uploadedItems.splice(uploadedIndex, 1);
            }

            // Re-render the images
            this.filesUpdated++;
            this.renderUploadedImages();

            // If the deleted image is currently selected, clear selection
            if (this.selectedImage && this.selectedImage.cacheKey &&
                this.selectedImage.cacheKey.includes(url)) {
                this.selectedObject = null;
                this.selectedImage = null;
            }

            console.log('[UPLOADS] Image deleted, remaining images:', this.files.length);
        },

        handleFileUpload(event) {
            const files = event.target.files;

            if (!files || files.length === 0) {
                console.log('[UPLOADS] No files selected');
                return;
            }

            console.log('[UPLOADS] Processing file upload, files count:', files.length);

            // Check if Fabric filters are available
            this.filterAvailable = typeof filters !== "undefined";

            // Initialize arrays if they don't exist
            if (!this.files) this.files = [];
            if (!this.uploadedItems) this.uploadedItems = [];

            let filesProcessed = 0;
            const totalFiles = files.length;

            // Store reference to component
            const self = this;

            Array.from(files).forEach((file, index) => {
                // Check if the file is an image
                if (!file.type.match("image.*")) {
                    console.warn('[UPLOADS] File is not an image:', file.name, file.type);
                    filesProcessed++;
                    if (filesProcessed === totalFiles) {
                        self.renderUploadedImages();
                    }
                    return;
                }

                console.log('[UPLOADS] Processing image file:', file.name, file.type);

                const reader = new FileReader();

                reader.onload = function (e) {
                    const imgURL = e.target.result;

                    // Add the image URL to the uploadedItems and files arrays for tracking
                    self.uploadedItems.push({
                        url: imgURL,
                        name: file.name,
                    });

                    self.files.push({
                        url: imgURL,
                        name: file.name,
                        src: imgURL
                    });

                    console.log('[UPLOADS] File loaded:', file.name);

                    filesProcessed++;
                    if (filesProcessed === totalFiles) {
                        self.renderUploadedImages();
                    }
                };

                reader.onerror = function (error) {
                    console.error('[UPLOADS] Error reading file:', file.name, error);
                    filesProcessed++;
                    if (filesProcessed === totalFiles) {
                        self.renderUploadedImages();
                    }
                };

                reader.readAsDataURL(file);
            });

            console.log('[UPLOADS] Started processing', totalFiles, 'files');
        },

        addImageToCanvas(url) {
            // Ensure the canvas is initialized
            if (!window.canvas) {
                console.error('[UPLOADS] Canvas not available for adding image');
                return;
            }

            console.log('[UPLOADS] Adding image to canvas:', url);

            try {
                const imgElement = new Image();
                imgElement.crossOrigin = "anonymous";

                // Store reference to component
                const self = this;

                imgElement.onload = function () {
                    try {
                        console.log('[UPLOADS] Image loaded, dimensions:', imgElement.width, 'x', imgElement.height);

                        // Check if a mask is selected - if so, apply image to mask instead
                        if (window.canvas.getActiveObject() &&
                            window.canvas.getActiveObject().maskType === 'maskContainer' &&
                            window.masks &&
                            typeof window.masks.applyImageToMask === 'function') {

                            console.log('[UPLOADS] Mask is selected, applying image to mask');
                            window.masks.applyImageToMask(window.canvas.getActiveObject(), url);
                            return;
                        }

                        // Normal flow - create a fabric image and add to canvas
                        // Create a Fabric.js Image object from the DOM Image using v6 syntax
                        const fabricImage = new FabricImage(imgElement, {
                            left: window.canvas.width / 2,  // Center image
                            top: window.canvas.height / 2,
                            originX: "center",
                            originY: "center",
                            name: "Uploaded Image",
                        });

                        // Scale the image to fit within max dimensions
                        const maxWidth = 400;
                        const maxHeight = 300;
                        const scaleX = maxWidth / fabricImage.width;
                        const scaleY = maxHeight / fabricImage.height;
                        const scale = Math.min(scaleX, scaleY, 1);
                        fabricImage.scale(scale);

                        // Add to canvas
                        window.canvas.add(fabricImage);
                        window.canvas.setActiveObject(fabricImage);
                        window.canvas.requestRenderAll();

                        // Update the component state
                        self.selectedObject = fabricImage;
                        self.selectedImage = fabricImage;
                        self.syncObjectProperties();

                        // Store the original image for filter resets
                        self.originalImage = imgElement;

                        // Let fabric component know image was added
                        window.fabricComponent.addToHistory();

                        console.log('[UPLOADS] Image added to canvas successfully');
                    } catch (error) {
                        console.error('[UPLOADS] Error adding image to canvas:', error);
                    }
                };

                imgElement.onerror = function(err) {
                    console.error('[UPLOADS] Failed to load image:', url, err);
                };

                // Start loading the image
                imgElement.src = url;
            } catch (e) {
                console.error('[UPLOADS] Exception in addImageToCanvas:', e);
            }
        },

        syncObjectProperties() {
            if (!this.selectedObject) {
                return;
            }

            const obj = this.selectedObject;

            this.objectProperties = {
                opacity: obj.opacity !== undefined ? obj.opacity : 1,
                stroke: obj.stroke || "#000000",
                strokeWidth: obj.strokeWidth !== undefined ? obj.strokeWidth : 0,
                radius: obj.clipPath ? obj.clipPath.rx || 0 : 0,
                skewX: obj.skewX || 0,
                skewY: obj.skewY || 0,
                fill: obj.fill || "#000000",
                shadowEnabled: !!obj.shadow,
                shadowColor: obj.shadow ? obj.shadow.color : "#dddddd",
                shadowBlur: obj.shadow ? obj.shadow.blur : 20,
                shadowOffsetX: obj.shadow ? obj.shadow.offsetX : 0,
                shadowOffsetY: obj.shadow ? obj.shadow.offsetY : 0,
            };
            
            // Also sync filter values if this is an image with filters
            if (obj.type === 'image') {
                // First reset filter values to default
                const defaultFilters = {
                    brightness: 0,
                    contrast: 0,
                    blur: 0,
                    noise: 0,
                    saturation: 0,
                    hue: 0,
                    pixelate: 2,
                };
                
                // Set default values first
                Object.assign(this.filters, defaultFilters);
                
                // Then extract values from actual filters if they exist
                if (obj.filters && obj.filters.length > 0) {
                    console.log('Syncing filter values from image:', obj.filters.length, 'filters');
                    
                    obj.filters.forEach(filter => {
                        if (!filter) return;
                        
                        // Determine filter type and extract values
                        if (filter.type === 'Brightness' && filter.brightness !== undefined) {
                            this.filters.brightness = filter.brightness;
                        }
                        else if (filter.type === 'Contrast' && filter.contrast !== undefined) {
                            this.filters.contrast = filter.contrast;
                        }
                        else if (filter.type === 'Blur' && filter.blur !== undefined) {
                            // Convert back from the 0.5 multiplier used when applying
                            this.filters.blur = filter.blur * 2; 
                        }
                        else if (filter.type === 'Saturation' && filter.saturation !== undefined) {
                            this.filters.saturation = filter.saturation;
                        }
                        else if (filter.type === 'Noise' && filter.noise !== undefined) {
                            // Convert back from the 100 multiplier used when applying
                            this.filters.noise = filter.noise / 100;
                        }
                        else if (filter.type === 'Pixelate' && filter.blocksize !== undefined) {
                            this.filters.pixelate = filter.blocksize;
                        }
                        
                        // Note: Hue is more complex as it uses ColorMatrix
                        // We'd need additional logic to extract the hue value from the matrix
                    });
                }
            }
        },

        applyCustomFilter(filterName) {
            if (!this.selectedObject || !window.canvas) {
                return;
            }

            if (this.selectedObject.type !== "image") {
                return;
            }

            this.activeFilter = filterName;

            if (!this.originalImage) {
                this.storeOriginalImage();
                if (!this.originalImage) {
                    return;
                }
            }

            const activeObject = this.selectedObject;
            
            // Store original state for recovery if needed
            const originalState = {
                filters: activeObject.filters ? [...activeObject.filters] : [],
                scaleX: activeObject.scaleX,
                scaleY: activeObject.scaleY,
                width: activeObject.width,
                height: activeObject.height
            };

            try {
                // Clear existing filters
                activeObject.filters = [];

                // Apply Fabric's built-in filters based on filter type
                switch (filterName) {
                    case "black_white":
                    case "grayscale":
                        activeObject.filters.push(new filters.Grayscale());
                        break;

                    case "sepia":
                        activeObject.filters.push(new filters.Sepia());
                        break;

                    case "invert":
                        activeObject.filters.push(new filters.Invert());
                        break;

                    case "brownie":
                        activeObject.filters.push(new filters.ColorMatrix({
                            matrix: [
                                0.59, 0.34, 0.07, 0, 0,
                                0.31, 0.54, 0.15, 0, 0,
                                0.19, 0.28, 0.47, 0, 0,
                                0, 0, 0, 1, 0
                            ]
                        }));
                        break;

                    case "vintage":
                        activeObject.filters.push(new filters.Sepia());
                        activeObject.filters.push(new filters.Contrast({
                            contrast: -0.15
                        }));
                        break;

                    case "kodachrome":
                        activeObject.filters.push(new filters.ColorMatrix({
                            matrix: [
                                1.1285582396593525, -0.3967382283601348, -0.03992559172921793, 0, 63.72958762196502,
                                -0.16404339962244616, 1.0835251566291304, -0.05498805115633132, 0, 24.732407896706203,
                                -0.16786010706155763, -0.5603416277695248, 1.6014850761964943, 0, 35.62982807460946,
                                0, 0, 0, 1, 0
                            ]
                        }));
                        break;

                    case "polaroid":
                        activeObject.filters.push(new filters.ColorMatrix({
                            matrix: [
                                1.438, -0.062, -0.062, 0, 0,
                                -0.122, 1.378, -0.122, 0, 0,
                                -0.016, -0.016, 1.483, 0, 0,
                                0, 0, 0, 1, 0
                            ]
                        }));
                        activeObject.filters.push(new filters.Brightness({
                            brightness: 0.1
                        }));
                        break;

                    case "sharpen":
                        activeObject.filters.push(new filters.Convolute({
                            matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0]
                        }));
                        break;

                    case "emboss":
                        activeObject.filters.push(new filters.Convolute({
                            matrix: [1, 1, 1, 1, 0.7, -1, -1, -1, -1]
                        }));
                        break;

                    case "technicolor":
                        activeObject.filters.push(new filters.ColorMatrix({
                            matrix: [
                                1.9125277891456083, -0.8545344976951645, -0.09155508482755585, 0, 11.793603434377337,
                                -0.3087833385928097, 1.7658908555458428, -0.10601743074722245, 0, -70.35205161461398,
                                -0.231103377548616, -0.7501899197440212, 1.847597816108189, 0, 30.950940869491138,
                                0, 0, 0, 1, 0
                            ]
                        }));
                        break;

                    default:
                        console.warn(`Unknown filter type: ${filterName}`);
                        break;
                }

                // Create comprehensive backup for proper undo operations
                activeObject._filterBackup = {
                    count: activeObject.filters.length,
                    width: activeObject.width,
                    height: activeObject.height,
                    scaleX: activeObject.scaleX,
                    scaleY: activeObject.scaleY,
                    left: activeObject.left,
                    top: activeObject.top,
                    angle: activeObject.angle || 0,
                    flipX: activeObject.flipX || false,
                    flipY: activeObject.flipY || false,
                    originX: activeObject.originX || 'center',
                    originY: activeObject.originY || 'center',
                    src: activeObject.src || (activeObject._element && activeObject._element.src),
                    filterName: filterName // Store which filter was applied
                };

                // Apply the filters
                activeObject.applyFilters();
                window.canvas.requestRenderAll();
                
                // Explicitly notify the history manager
                if (window.historyManager && typeof window.historyManager.filterApplied === 'function') {
                    window.historyManager.filterApplied(activeObject);
                } else if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                    // Fallback to standard history
                    window.fabricComponent.addToHistory();
                }

                console.log(`Applied ${filterName} filter`);
            } catch (error) {
                console.error("Error applying filter:", error);
                
                // Recover from error by restoring original filters
                try {
                    activeObject.filters = originalState.filters;
                    activeObject.scaleX = originalState.scaleX;
                    activeObject.scaleY = originalState.scaleY;
                    activeObject.applyFilters();
                    window.canvas.requestRenderAll();
                    console.log("Recovered from filter error");
                } catch (e) {
                    console.error("Failed to recover from filter error:", e);
                }
            }
        },

        // Method for slider-based filters
        applySimpleFilter(filterType, value) {
            if (!this.selectedImage || !window.canvas) {
                return;
            }

            // Update the component state
            this.filters[filterType.toLowerCase()] = parseFloat(value);

            // Store original state for recovery if needed
            const originalState = {
                filters: this.selectedImage.filters ? [...this.selectedImage.filters] : [],
                scaleX: this.selectedImage.scaleX,
                scaleY: this.selectedImage.scaleY,
                width: this.selectedImage.width,
                height: this.selectedImage.height
            };

            try {
                // Clear existing filters
                this.selectedImage.filters = [];

                // Apply filters based on current values
                if (this.filters.brightness !== 0) {
                    this.selectedImage.filters.push(new filters.Brightness({
                        brightness: parseFloat(this.filters.brightness)
                    }));
                }

                if (this.filters.contrast !== 0) {
                    this.selectedImage.filters.push(new filters.Contrast({
                        contrast: parseFloat(this.filters.contrast)
                    }));
                }

                if (this.filters.saturation !== 0) {
                    this.selectedImage.filters.push(new filters.Saturation({
                        saturation: parseFloat(this.filters.saturation)
                    }));
                }

                if (this.filters.blur !== 0) {
                    this.selectedImage.filters.push(new filters.Blur({
                        blur: parseFloat(this.filters.blur) * 0.5
                    }));
                }

                if (this.filters.noise !== 0) {
                    this.selectedImage.filters.push(new filters.Noise({
                        noise: parseFloat(this.filters.noise) * 100
                    }));
                }

                if (this.filters.pixelate > 2) {
                    this.selectedImage.filters.push(new filters.Pixelate({
                        blocksize: Math.floor(parseFloat(this.filters.pixelate))
                    }));
                }

                if (this.filters.hue !== 0) {
                    // Implement hue rotation with ColorMatrix
                    const hueRotation = parseFloat(this.filters.hue) * Math.PI;
                    const cosHue = Math.cos(hueRotation);
                    const sinHue = Math.sin(hueRotation);
                    const lumR = 0.213;
                    const lumG = 0.715;
                    const lumB = 0.072;

                    this.selectedImage.filters.push(new filters.ColorMatrix({
                        matrix: [
                            lumR + cosHue * (1 - lumR) + sinHue * (-lumR), lumG + cosHue * (-lumG) + sinHue * (-lumG), lumB + cosHue * (-lumB) + sinHue * (1 - lumB), 0, 0,
                            lumR + cosHue * (-lumR) + sinHue * (0.143), lumG + cosHue * (1 - lumG) + sinHue * (0.140), lumB + cosHue * (-lumB) + sinHue * (-0.283), 0, 0,
                            lumR + cosHue * (-lumR) + sinHue * (-(1 - lumR)), lumG + cosHue * (-lumG) + sinHue * (lumG), lumB + cosHue * (1 - lumB) + sinHue * (lumB), 0, 0,
                            0, 0, 0, 1, 0
                        ]
                    }));
                }

                // Create a comprehensive backup of the current image state
                // This is critical for proper undo/redo operations
                this.selectedImage._filterBackup = {
                    count: this.selectedImage.filters.length,
                    width: this.selectedImage.width,
                    height: this.selectedImage.height,
                    scaleX: this.selectedImage.scaleX,
                    scaleY: this.selectedImage.scaleY,
                    left: this.selectedImage.left,
                    top: this.selectedImage.top,
                    angle: this.selectedImage.angle || 0,
                    flipX: this.selectedImage.flipX || false,
                    flipY: this.selectedImage.flipY || false,
                    originX: this.selectedImage.originX || 'center',
                    originY: this.selectedImage.originY || 'center',
                    src: this.selectedImage.src || (this.selectedImage._element && this.selectedImage._element.src),
                    filterValues: {...this.filters} // Store current filter values
                };

                // Apply the filters to the image
                this.selectedImage.applyFilters();
                window.canvas.requestRenderAll();

                // Explicitly notify the history manager
                if (window.historyManager && typeof window.historyManager.filterApplied === 'function') {
                    // Use the history manager's filterApplied method which handles state saving properly
                    window.historyManager.filterApplied(this.selectedImage);
                } else if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                    // Fallback to standard history
                    window.fabricComponent.addToHistory();
                }
            } catch (error) {
                console.error("Error applying filters:", error);
                
                // Recover from error by restoring original filters
                try {
                    this.selectedImage.filters = originalState.filters;
                    this.selectedImage.scaleX = originalState.scaleX;
                    this.selectedImage.scaleY = originalState.scaleY;
                    this.selectedImage.applyFilters();
                    window.canvas.requestRenderAll();
                } catch (e) {
                    console.error("Failed to recover from filter error:", e);
                }
            }
        },

        // Object property update (for opacity, color, etc.)
        updateObjectProperty(property, value) {
            if (!this.selectedObject || !window.canvas) {
                return;
            }

            // Update the object property
            if (property === 'shadowEnabled') {
                if (value) {
                    this.selectedObject.set('shadow', {
                        color: this.objectProperties.shadowColor,
                        blur: this.objectProperties.shadowBlur,
                        offsetX: this.objectProperties.shadowOffsetX,
                        offsetY: this.objectProperties.shadowOffsetY
                    });
                } else {
                    this.selectedObject.set('shadow', null);
                }
            } else if (property === 'shadowColor' || property === 'shadowBlur' || property === 'shadowOffsetX' || property === 'shadowOffsetY') {
                if (this.objectProperties.shadowEnabled) {
                    // Get current shadow or create new one
                    const shadow = this.selectedObject.shadow || {};

                    // Update the specific property
                    shadow[property.replace('shadow', '').toLowerCase()] = value;

                    // Apply updated shadow
                    this.selectedObject.set('shadow', shadow);
                }
            } else if (property === 'clipPath') {
                // Handle radius property (stored as clipPath in UI but needs to create actual clipPath)
                const radius = parseFloat(value);
                this.objectProperties.radius = radius;

                if (radius > 0) {
                    // Create rounded rectangle clipPath with the given radius
                    const width = this.selectedObject.width * this.selectedObject.scaleX;
                    const height = this.selectedObject.height * this.selectedObject.scaleY;

                    // Use Rect class for Fabric.js v6
                    const clipPath = new Rect({
                        width: width,
                        height: height,
                        rx: radius,
                        ry: radius,
                        originX: 'center',
                        originY: 'center'
                    });

                    this.selectedObject.set('clipPath', clipPath);
                } else {
                    // Remove clipPath
                    this.selectedObject.set('clipPath', null);
                }
            } else {
                // Handle standard properties
                this.selectedObject.set(property, value);
            }

            // Update the object
            this.selectedObject.setCoords();
            window.canvas.requestRenderAll();

            // Add to history
            window.fabricComponent.addToHistory();
        },

        // Method called when image is added to track it
        imageAdded(img) {
            this.selectedObject = img;
            this.selectedImage = img;
            this.syncObjectProperties();
            this.storeOriginalImage();
        },

        // Check if an active mask exists and redirect the image to it
        checkApplyToActiveMask(url) {
            if (window.canvas && window.masks) {
                const activeObject = window.canvas.getActiveObject();
                if (activeObject && activeObject.maskType === 'maskContainer') {
                    console.log('[UPLOADS] Active mask found, applying image');
                    window.masks.applyImageToMask(activeObject, url);
                    return true;
                }
            }
            return false;
        }
    };
}