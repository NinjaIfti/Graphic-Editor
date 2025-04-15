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
                // Silent error handling
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
            setTimeout(() => {
                const container = document.getElementById("file-upload-con");
                if (!container) {
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
                    img.onclick = () => {
                        this.addImageToCanvas(file.url);
                    };

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
            }, 0);
        },

        deleteImage(url) {
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
        },

        handleFileUpload(event) {
            const files = event.target.files;

            if (!files || files.length === 0) {
                return;
            }

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
                    filesProcessed++;
                    if (filesProcessed === totalFiles) {
                        self.renderUploadedImages();
                    }
                    return;
                }

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

                    filesProcessed++;
                    if (filesProcessed === totalFiles) {
                        self.renderUploadedImages();
                    }
                };

                reader.onerror = function (error) {
                    filesProcessed++;
                    if (filesProcessed === totalFiles) {
                        self.renderUploadedImages();
                    }
                };

                reader.readAsDataURL(file);
            });
        },

        addImageToCanvas(url) {
            // Ensure the canvas is initialized
            if (!window.canvas) {
                return;
            }

            try {
                const imgElement = new Image();
                imgElement.crossOrigin = "anonymous";

                // Store reference to component
                const self = this;

                imgElement.onload = function () {
                    try {
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
                    } catch (error) {
                        // Silent error handling
                    }
                };

                // Start loading the image
                imgElement.src = url;
            } catch (e) {
                // Silent error handling
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
                            1.2, 0.1, 0.1, 0, 0,
                            0.1, 1.1, 0.1, 0, 0,
                            0.1, 0.1, 1.3, 0, 0,
                            0, 0, 0, 1, 0
                        ]
                    }));
                    break;

                case "technicolor":
                    activeObject.filters.push(new filters.ColorMatrix({
                        matrix: [
                            1.3, -0.3, -0.3, 0, 0,
                            -0.2, 1.2, -0.2, 0, 0,
                            -0.1, -0.1, 1.2, 0, 0,
                            0, 0, 0, 1, 0
                        ]
                    }));
                    break;

                case "polaroid":
                    activeObject.filters.push(new filters.ColorMatrix({
                        matrix: [
                            1.3, -0.3, 0.2, 0, 0,
                            0, 1.1, 0, 0, 0,
                            0, 0.2, 1.1, 0, 0,
                            0, 0, 0, 1, 0
                        ]
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
            }

            // Apply the filters
            activeObject.applyFilters();
            window.canvas.requestRenderAll();

            // Add to history
            window.fabricComponent.addToHistory();
        },

        // Method for slider-based filters
        applySimpleFilter(filterType, value) {
            if (!this.selectedImage || !window.canvas) {
                return;
            }

            // Update the component state
            this.filters[filterType.toLowerCase()] = parseFloat(value);

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

            // Apply the filters
            this.selectedImage.applyFilters();
            window.canvas.requestRenderAll();

            // Add to history
            window.fabricComponent.addToHistory();
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
        }
    };
}