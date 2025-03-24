import Alpine from 'alpinejs'

// Fabric js
import { fabric } from 'fabric';
window.Alpine = Alpine
Alpine.data('fabric', fabric)
Alpine.start()
// Context Menu Alpine component
document.addEventListener('alpine:init', () => {
    Alpine.data('contextMenu', () => ({
        isOpen: false,
        posX: 0,
        posY: 0,
        isLocked: false,
        isGrouped: false,
        canvas: null,
        activeObject: null,

        init() {
            // Initialize fabric canvas reference
            this.initFabricCanvas();

            // Set up event listeners for context menu
            document.addEventListener('contextmenu', (e) => {
                const activeObject = this.canvas?.getActiveObject();
                if (activeObject) {
                    e.preventDefault();
                    this.activeObject = activeObject;
                    this.posX = e.clientX;
                    this.posY = e.clientY;
                    this.isOpen = true;
                    this.isLocked = activeObject.lockMovementX && activeObject.lockMovementY;
                    this.isGrouped = activeObject.type === 'group';
                }
            });

            // Setup keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (!this.canvas) return;

                const activeObject = this.canvas.getActiveObject();
                if (!activeObject) return;

                // Ctrl + [
                if (e.ctrlKey && e.key === '[') {
                    this.handleAction('bringForward');
                }

                // Ctrl + ]
                if (e.ctrlKey && e.key === ']') {
                    this.handleAction('sendBackwards');
                }

                // Ctrl + L
                if (e.ctrlKey && e.key === 'l') {
                    this.toggleLock();
                }

                // Ctrl + G
                if (e.ctrlKey && e.key === 'g') {
                    this.toggleGroup();
                }

                // Delete
                if (e.key === 'Delete') {
                    this.handleAction('delete');
                }
            });
        },

        initFabricCanvas() {
            // We'll connect to the Fabric.js canvas once it's initialized elsewhere
            window.addEventListener('canvas:initialized', (e) => {
                this.canvas = e.detail.canvas;
            });
        },

        close() {
            this.isOpen = false;
        },

        handleAction(action) {
            if (!this.canvas || !this.activeObject) return;

            switch (action) {
                case 'bringForward':
                    this.canvas.bringForward(this.activeObject);
                    break;
                case 'sendBackwards':
                    this.canvas.sendBackwards(this.activeObject);
                    break;
                case 'delete':
                    this.canvas.remove(this.activeObject);
                    break;
            }

            this.canvas.requestRenderAll();
            this.close();
        },

        toggleLock() {
            if (!this.canvas || !this.activeObject) return;

            this.isLocked = !this.isLocked;
            this.activeObject.set({
                lockMovementX: this.isLocked,
                lockMovementY: this.isLocked,
                lockRotation: this.isLocked,
                lockScalingX: this.isLocked,
                lockScalingY: this.isLocked
            });

            this.canvas.requestRenderAll();
            this.close();
        },

        toggleGroup() {
            if (!this.canvas) return;

            if (this.isGrouped) {
                // Ungroup
                const items = this.activeObject.getObjects();
                this.activeObject.destroy();
                this.canvas.remove(this.activeObject);
                this.canvas.discardActiveObject();

                items.forEach(item => {
                    this.canvas.add(item);
                });
            } else {
                // Group
                if (!this.canvas.getActiveObjects() || this.canvas.getActiveObjects().length < 2) {
                    return;
                }

                const selection = new fabric.Group(this.canvas.getActiveObjects(), {
                    canvas: this.canvas
                });

                this.canvas.remove(...this.canvas.getActiveObjects());
                this.canvas.add(selection);
                this.canvas.setActiveObject(selection);
            }

            this.isGrouped = !this.isGrouped;
            this.canvas.requestRenderAll();
            this.close();
        }
    }));
});
// Fabric js
import { fabric } from 'fabric';
document.addEventListener('alpine:init', () => {
    // Canvas Editor component (main Fabric.js canvas functionality)
    Alpine.data('canvasEditor', () => ({
        canvas: null,

        init() {
            this.$nextTick(() => {
                // Initialize Fabric.js canvas
                this.canvas = new fabric.Canvas(this.$refs.canvas, {
                    preserveObjectStacking: true,
                    width: 800,
                    height: 600
                });

                // Add some initial shapes
                const helloWorld = new fabric.Text('Checking Fabric Js', {
                    fontSize: 24,
                    fontFamily: 'Arial'
                });

                const rect = new fabric.Rect({
                    fill: '#ff0000',
                    left: 400,
                    top: 200,
                    width: 250,
                    height: 250
                });

                this.canvas.add(rect);
                this.canvas.add(helloWorld);
                this.canvas.centerObject(helloWorld);

                // Dispatch an event to notify other components that the canvas is ready
                window.dispatchEvent(new CustomEvent('canvas:initialized', {
                    detail: { canvas: this.canvas }
                }));
            });
        },

        // Add the download method we discussed earlier
        downloadCanvas(type) {
            if (!this.canvas) return;

            // Set background color for JPG (needed because JPG doesn't support transparency)
            const originalBgColor = this.canvas.backgroundColor;
            if (type === 'jpg' && !originalBgColor) {
                this.canvas.backgroundColor = '#ffffff';
                this.canvas.renderAll();
            }

            // Generate data URL
            const dataURL = this.canvas.toDataURL({
                format: type,
                quality: 1
            });

            // Restore original background
            if (type === 'jpg' && !originalBgColor) {
                this.canvas.backgroundColor = originalBgColor;
                this.canvas.renderAll();
            }

            // Create temporary link and trigger download
            const link = document.createElement('a');
            link.download = `steve-editor-design.${type}`;
            link.href = dataURL;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }));
});
// Tool selection component
document.addEventListener('alpine:init', () => {
    Alpine.data('toolManager', () => ({
        activeTool: 'templates',

        init() {
            this.$watch('activeTool', (value) => {
                // Broadcast the active tool to all components
                this.$dispatch('tool-changed', { type: value });
            });

            // Listen for tool change events from sidebar items
            this.$root.addEventListener('change-tool', (e) => {
                // Deactivate all tool items
                document.querySelectorAll('.tool-item').forEach(item => {
                    Alpine.raw(item.__x.$data).active = false;
                });

                // Set the active tool
                this.activeTool = e.detail.type;
            });
        }
    }));
});
// Uploads Panel component
document.addEventListener('alpine:init', () => {
    Alpine.data('uploadsPanel', () => ({
        isActive: false,
        uploads: [],
        selectedObject: null,
        activeFilter: null,
        showDistortion: false,
        showShadow: false,

        // Object properties
        objectProperties: {
            opacity: 1,
            stroke: '#000000',
            strokeWidth: 0,
            radius: 0,
            skewX: 0,
            skewY: 0,
            fill: '#000000',
            shadowEnabled: false,
            shadowColor: '#dddddd',
            shadowBlur: 20,
            shadowOffsetX: 0,
            shadowOffsetY: 0
        },

        // Filter values
        filters: {
            brightness: 0,
            contrast: 0,
            blur: 0,
            noise: 0,
            saturation: 0,
            hue: 0,
            pixelate: 0
        },

        init() {
            // Listen for object selection events from canvas
            window.addEventListener('object:selected', (e) => {
                this.selectedObject = e.detail;
                this.syncObjectProperties();
            });

            // Listen for object cleared events
            window.addEventListener('selection:cleared', () => {
                this.selectedObject = null;
            });
        },

        // Synchronize object properties with the panel
        syncObjectProperties() {
            if (!this.selectedObject) return;

            // Get properties from the selected object
            const obj = this.selectedObject;

            this.objectProperties = {
                opacity: obj.opacity || 1,
                stroke: obj.stroke || '#000000',
                strokeWidth: obj.strokeWidth || 0,
                radius: obj.clipPath ? obj.clipPath.radius : 0,
                skewX: obj.skewX || 0,
                skewY: obj.skewY || 0,
                fill: obj.fill || '#000000',
                shadowEnabled: !!obj.shadow,
                shadowColor: obj.shadow ? obj.shadow.color : '#dddddd',
                shadowBlur: obj.shadow ? obj.shadow.blur : 20,
                shadowOffsetX: obj.shadow ? obj.shadow.offsetX : 0,
                shadowOffsetY: obj.shadow ? obj.shadow.offsetY : 0
            };

            // Reset filters
            this.resetFilterValues();
        },

        resetFilterValues() {
            this.filters = {
                brightness: 0,
                contrast: 0,
                blur: 0,
                noise: 0,
                saturation: 0,
                hue: 0,
                pixelate: 0
            };
            this.activeFilter = null;
        },

        // Handle file uploads
        handleFileUpload(event) {
            const files = event.target.files;
            if (!files || files.length === 0) return;

            Array.from(files).forEach(file => {
                if (!file.type.match('image.*')) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    const imgURL = e.target.result;
                    this.uploads.push({
                        url: imgURL,
                        name: file.name
                    });

                    // Add to the grid
                    const container = document.getElementById('file-upload-con');
                    const imgElement = document.createElement('div');
                    imgElement.className = 'aspect-square border border-gray-200 rounded overflow-hidden';
                    imgElement.innerHTML = `<img src="${imgURL}" alt="${file.name}" class="w-full h-full object-cover cursor-pointer">`;
                    imgElement.onclick = () => this.addImageToCanvas(imgURL);
                    container.appendChild(imgElement);
                };
                reader.readAsDataURL(file);
            });
        },

        // Add an image to the canvas
        addImageToCanvas(url) {
            if (!window.canvas) return;

            fabric.Image.fromURL(url, (img) => {
                img.scaleToWidth(200);
                window.canvas.add(img);
                window.canvas.setActiveObject(img);
                window.canvas.renderAll();
            });
        },

        // Apply a specific filter to the active object
        applyFilter(type, value) {
            if (!this.selectedObject || !window.canvas) return;

            const obj = this.selectedObject;
            let filter;

            switch (type) {
                case 'brightness':
                    filter = new fabric.Image.filters.Brightness({
                        brightness: parseFloat(value)
                    });
                    break;
                case 'contrast':
                    filter = new fabric.Image.filters.Contrast({
                        contrast: parseFloat(value)
                    });
                    break;
                case 'blur':
                    filter = new fabric.Image.filters.Blur({
                        blur: parseFloat(value)
                    });
                    break;
                case 'noise':
                    filter = new fabric.Image.filters.Noise({
                        noise: parseInt(value, 10)
                    });
                    break;
                case 'saturation':
                    filter = new fabric.Image.filters.Saturation({
                        saturation: parseFloat(value)
                    });
                    break;
                case 'hue':
                    filter = new fabric.Image.filters.HueRotation({
                        rotation: parseFloat(value)
                    });
                    break;
                case 'pixelate':
                    filter = new fabric.Image.filters.Pixelate({
                        blocksize: parseInt(value, 10)
                    });
                    break;
            }

            if (!filter || obj.type !== 'image') return;

            // Find if this filter type already exists in the object
            const filterIndex = obj.filters ? obj.filters.findIndex(f =>
                f.type === filter.type) : -1;

            // Initialize filters array if it doesn't exist
            if (!obj.filters) obj.filters = [];

            // Either update or add the filter
            if (filterIndex > -1) {
                obj.filters[filterIndex] = filter;
            } else {
                obj.filters.push(filter);
            }

            // Apply filters
            obj.applyFilters();
            window.canvas.renderAll();
        },

        // Apply a preset filter from the filter gallery
        applyPresetFilter(filterName) {
            if (!this.selectedObject || !window.canvas || this.selectedObject.type !== 'image') return;

            // Set active filter
            this.activeFilter = filterName;

            const obj = this.selectedObject;

            // Clear existing filters
            obj.filters = [];

            // Apply the selected filter
            switch (filterName) {
                case 'black_white':
                    obj.filters.push(new fabric.Image.filters.BlackWhite());
                    break;
                case 'brownie':
                    obj.filters.push(new fabric.Image.filters.Brownie());
                    break;
                case 'grayscale':
                    obj.filters.push(new fabric.Image.filters.Grayscale());
                    break;
                case 'invert':
                    obj.filters.push(new fabric.Image.filters.Invert());
                    break;
                case 'sepia':
                    obj.filters.push(new fabric.Image.filters.Sepia());
                    break;
                case 'kodachrome':
                    obj.filters.push(new fabric.Image.filters.Kodachrome());
                    break;
                case 'technicolor':
                    obj.filters.push(new fabric.Image.filters.Technicolor());
                    break;
                case 'sharpen':
                    obj.filters.push(new fabric.Image.filters.Convolute({
                        matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0]
                    }));
                    break;
                case 'polaroid':
                    obj.filters.push(new fabric.Image.filters.Polaroid());
                    break;
                case 'emboss':
                    obj.filters.push(new fabric.Image.filters.Convolute({
                        matrix: [1, 1, 1, 1, 0.7, -1, -1, -1, -1]
                    }));
                    break;
                case 'vintage':
                    obj.filters.push(new fabric.Image.filters.Vintage());
                    break;
            }

            // Apply the filters
            obj.applyFilters();
            window.canvas.renderAll();
        },

        // Reset all filters
        resetFilters() {
            if (!this.selectedObject || !window.canvas || this.selectedObject.type !== 'image') return;

            this.activeFilter = null;
            this.resetFilterValues();

            this.selectedObject.filters = [];
            this.selectedObject.applyFilters();
            window.canvas.renderAll();
        },

        // Update a property on the selected object
        updateObjectProperty(property, value) {
            if (!this.selectedObject || !window.canvas) return;

            // Convert value types appropriately
            const numValue = parseFloat(value);

            // Set the property
            this.selectedObject.set(property, numValue);

            // Update local state
            this.objectProperties[property] = numValue;

            // Render the canvas
            window.canvas.renderAll();
        },

        // Update clip path (border radius)
        updateClipPath(value) {
            if (!this.selectedObject || !window.canvas) return;

            const radius = parseInt(value, 10);
            this.objectProperties.radius = radius;

            if (radius === 0) {
                this.selectedObject.clipPath = null;
            } else {
                const width = this.selectedObject.width * this.selectedObject.scaleX;
                const height = this.selectedObject.height * this.selectedObject.scaleY;

                this.selectedObject.clipPath = new fabric.Rect({
                    width: width,
                    height: height,
                    rx: radius,
                    ry: radius,
                    originX: 'center',
                    originY: 'center'
                });
            }

            window.canvas.renderAll();
        },

        // Toggle shadow on/off
        toggleShadow() {
            if (!this.selectedObject || !window.canvas) return;

            if (this.objectProperties.shadowEnabled) {
                // Enable shadow
                this.selectedObject.shadow = new fabric.Shadow({
                    color: this.objectProperties.shadowColor,
                    blur: this.objectProperties.shadowBlur,
                    offsetX: this.objectProperties.shadowOffsetX,
                    offsetY: this.objectProperties.shadowOffsetY
                });
            } else {
                // Disable shadow
                this.selectedObject.shadow = null;
            }

            window.canvas.renderAll();
        },

        // Update shadow properties
        updateShadow(property, value) {
            if (!this.selectedObject || !window.canvas || !this.objectProperties.shadowEnabled) return;

            // Update local state
            this.objectProperties[`shadow${property.charAt(0).toUpperCase() + property.slice(1)}`] = property === 'color' ? value : parseFloat(value);

            // Create a new shadow with updated properties
            this.selectedObject.shadow = new fabric.Shadow({
                color: this.objectProperties.shadowColor,
                blur: this.objectProperties.shadowBlur,
                offsetX: this.objectProperties.shadowOffsetX,
                offsetY: this.objectProperties.shadowOffsetY
            });

            window.canvas.renderAll();
        }
    }));
});
// Text Panel component
document.addEventListener('alpine:init', () => {
    Alpine.data('textPanel', () => ({
        isActive: false,
        selectedObject: null,
        showDistortion: false,
        showShadow: false,
        fonts: [
            '42dot Sans',
            'ABeeZee',
            'ADLaM Display',
            'AR One Sans',
            'Abel',
            'Abhaya Libre',
            'Aboreto',
            'Abril Fatface',
            'Abyssinica SIL',
            'Aclonica',
            'Roboto' // Add more fonts as needed
        ],

        // Text properties
        textProperties: {
            fill: '#000000',
            fontFamily: 'Roboto',
            fontSize: 40,
            fontWeight: 'normal',
            fontStyle: 'normal',
            underline: false,
            opacity: 1,
            stroke: '#000000',
            strokeWidth: 0,
            charSpacing: 0,
            rotation: 0,
            skewX: 0,
            skewY: 0,
            shadowEnabled: false,
            shadowColor: '#dddddd',
            shadowBlur: 20,
            shadowOffsetX: 0,
            shadowOffsetY: 0
        },

        init() {
            // Listen for object selection events from canvas
            window.addEventListener('object:selected', (e) => {
                if (e.detail && e.detail.type === 'text') {
                    this.selectedObject = e.detail;
                    this.syncTextProperties();
                }
            });

            // Listen for object cleared events
            window.addEventListener('selection:cleared', () => {
                this.selectedObject = null;
            });
        },

        // Add simple text
        addText() {
            if (!window.canvas) return;

            const text = new fabric.Text('Your text here', {
                left: 100,
                top: 100,
                fontFamily: this.textProperties.fontFamily,
                fontSize: this.textProperties.fontSize,
                fill: this.textProperties.fill
            });

            window.canvas.add(text);
            window.canvas.setActiveObject(text);
            window.canvas.renderAll();

            // Trigger selection event manually
            const customEvent = new CustomEvent('object:selected', {
                detail: text
            });
            window.dispatchEvent(customEvent);
        },

        // Add pre-built heading
        addHeading(type) {
            if (!window.canvas) return;

            let props = {};

            switch(type) {
                case 'full':
                    props = {
                        text: 'Add a heading',
                        fontSize: 48,
                        fontWeight: 'bold'
                    };
                    break;
                case 'sub':
                    props = {
                        text: 'Add a subheading',
                        fontSize: 32,
                        fontWeight: 'normal'
                    };
                    break;
                case 'paragraph':
                    props = {
                        text: 'Add a little bit of body text',
                        fontSize: 24,
                        fontWeight: 'normal'
                    };
                    break;
            }

            const text = new fabric.Text(props.text, {
                left: 100,
                top: 100,
                fontFamily: this.textProperties.fontFamily,
                fontSize: props.fontSize,
                fontWeight: props.fontWeight,
                fill: this.textProperties.fill
            });

            window.canvas.add(text);
            window.canvas.setActiveObject(text);
            window.canvas.renderAll();

            // Trigger selection event manually
            const customEvent = new CustomEvent('object:selected', {
                detail: text
            });
            window.dispatchEvent(customEvent);
        },

        // Sync text properties when object is selected
        syncTextProperties() {
            if (!this.selectedObject || this.selectedObject.type !== 'text') return;

            const obj = this.selectedObject;

            this.textProperties = {
                fill: obj.fill || '#000000',
                fontFamily: obj.fontFamily || 'Roboto',
                fontSize: obj.fontSize || 40,
                fontWeight: obj.fontWeight || 'normal',
                fontStyle: obj.fontStyle || 'normal',
                underline: obj.underline || false,
                opacity: obj.opacity || 1,
                stroke: obj.stroke || '#000000',
                strokeWidth: obj.strokeWidth || 0,
                charSpacing: obj.charSpacing || 0,
                rotation: 2500, // Starting value for text curve slider
                skewX: obj.skewX || 0,
                skewY: obj.skewY || 0,
                shadowEnabled: !!obj.shadow,
                shadowColor: obj.shadow ? obj.shadow.color : '#dddddd',
                shadowBlur: obj.shadow ? obj.shadow.blur : 20,
                shadowOffsetX: obj.shadow ? obj.shadow.offsetX : 0,
                shadowOffsetY: obj.shadow ? obj.shadow.offsetY : 0
            };
        },

        // Toggle font weight (bold/normal)
        toggleFontWeight() {
            if (!this.selectedObject || !window.canvas) return;

            this.textProperties.fontWeight = this.textProperties.fontWeight === 'bold' ? 'normal' : 'bold';
            this.selectedObject.set('fontWeight', this.textProperties.fontWeight);
            window.canvas.renderAll();
        },

        // Toggle font style (italic/normal)
        toggleFontStyle() {
            if (!this.selectedObject || !window.canvas) return;

            this.textProperties.fontStyle = this.textProperties.fontStyle === 'italic' ? 'normal' : 'italic';
            this.selectedObject.set('fontStyle', this.textProperties.fontStyle);
            window.canvas.renderAll();
        },

        // Toggle underline
        toggleUnderline() {
            if (!this.selectedObject || !window.canvas) return;

            this.textProperties.underline = !this.textProperties.underline;
            this.selectedObject.set('underline', this.textProperties.underline);
            window.canvas.renderAll();
        },

        // Filter fonts based on search
        filterFonts() {
            if (!this.search) {
                this.filteredFonts = this.fonts;
                return;
            }

            this.filteredFonts = this.fonts.filter(font =>
                font.toLowerCase().includes(this.search.toLowerCase())
            );
        },

        // Select a font
        selectFont(font) {
            if (!this.selectedObject || !window.canvas) return;

            this.textProperties.fontFamily = font;
            this.selectedObject.set('fontFamily', font);
            window.canvas.renderAll();
        },

        // Update text curve/path
        updateTextCurve(value) {
            if (!this.selectedObject || !window.canvas) return;

            // This is a placeholder for implementing curved text
            // The actual implementation would depend on how fabric.js handles curved text
            // You might need to use a TextPath extension or implement a custom solution

            this.textProperties.rotation = parseInt(value);

            // For now, we'll just update the rotation angle as a simple example
            const angle = (parseInt(value) - 2500) / 10; // Convert slider value to an angle between -250 and 250
            this.selectedObject.set('angle', angle);
            window.canvas.renderAll();
        },

        // Update any object property
        updateObjectProperty(property, value) {
            if (!this.selectedObject || !window.canvas) return;

            // Convert value types appropriately
            let finalValue = value;
            if (typeof this.selectedObject[property] === 'number') {
                finalValue = parseFloat(value);
            }

            // Set the property
            this.selectedObject.set(property, finalValue);

            // Update local state
            this.textProperties[property] = finalValue;

            // Render the canvas
            window.canvas.renderAll();
        },

        // Toggle shadow on/off
        toggleShadow() {
            if (!this.selectedObject || !window.canvas) return;

            if (this.textProperties.shadowEnabled) {
                // Enable shadow
                this.selectedObject.shadow = new fabric.Shadow({
                    color: this.textProperties.shadowColor,
                    blur: this.textProperties.shadowBlur,
                    offsetX: this.textProperties.shadowOffsetX,
                    offsetY: this.textProperties.shadowOffsetY
                });
            } else {
                // Disable shadow
                this.selectedObject.shadow = null;
            }

            window.canvas.renderAll();
        },

        // Update shadow properties
        updateShadow(property, value) {
            if (!this.selectedObject || !window.canvas || !this.textProperties.shadowEnabled) return;

            // Update local state
            this.textProperties[`shadow${property.charAt(0).toUpperCase() + property.slice(1)}`] =
                property === 'color' ? value : parseFloat(value);

            // Create a new shadow with updated properties
            this.selectedObject.shadow = new fabric.Shadow({
                color: this.textProperties.shadowColor,
                blur: this.textProperties.shadowBlur,
                offsetX: this.textProperties.shadowOffsetX,
                offsetY: this.textProperties.shadowOffsetY
            });

            window.canvas.renderAll();
        }
    }));
});
// Drawing Panel component
document.addEventListener('alpine:init', () => {
    Alpine.data('drawingPanel', () => ({
        isActive: false,
        activeTab: 'brush',

        // Brush settings
        brushSettings: {
            size: 20,
            opacity: 1,
            color: '#264653'
        },

        // Eraser settings
        eraserSettings: {
            size: 20,
            invert: false
        },

        // Pencil settings
        pencilSettings: {
            brushType: 'Pencil',
            size: 20,
            shadowWidth: 0,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            color: '#333333',
            shadowColor: '#000000'
        },

        init() {
            // Initialize drawing on canvas when this panel becomes active
            this.$watch('isActive', (value) => {
                if (value) {
                    this.activateDrawingMode();
                } else {
                    this.deactivateDrawingMode();
                }
            });

            // Watch for tab changes to update the drawing mode
            this.$watch('activeTab', (value) => {
                if (this.isActive) {
                    this.updateDrawingMode(value);
                }
            });
        },

        // Update brush preview
        updateBrushPreview() {
            // This function updates the visual preview of the brush
            // No specific implementation needed beyond what's in the template binding
        },

        // Activate drawing mode on the canvas
        activateDrawingMode() {
            if (!window.canvas) return;

            // Enable Fabric.js free drawing mode
            window.canvas.isDrawingMode = true;

            // Apply current settings based on active tab
            this.updateDrawingMode(this.activeTab);
        },

        // Deactivate drawing mode
        deactivateDrawingMode() {
            if (!window.canvas) return;

            // Disable Fabric.js free drawing mode
            window.canvas.isDrawingMode = false;
        },

        // Update drawing mode based on active tab
        updateDrawingMode(tabName) {
            if (!window.canvas) return;

            switch(tabName) {
                case 'brush':
                    this.setupBrush();
                    break;
                case 'eraser':
                    this.setupEraser();
                    break;
                case 'pencil':
                    this.setupPencil();
                    break;
            }
        },

        // Setup brush drawing
        setupBrush() {
            if (!window.canvas) return;

            // Create a new brush
            const brush = new fabric.PencilBrush(window.canvas);

            // Set brush properties
            brush.width = parseInt(this.brushSettings.size);
            brush.color = this.brushSettings.color;
            brush.opacity = parseFloat(this.brushSettings.opacity);

            // Apply brush to canvas
            window.canvas.freeDrawingBrush = brush;
            window.canvas.isDrawingMode = true;
        },

        // Setup eraser
        setupEraser() {
            if (!window.canvas) return;

            // Create eraser brush
            const eraser = new fabric.EraserBrush(window.canvas);
            eraser.width = parseInt(this.eraserSettings.size);

            // Set inverted mode if needed
            if (this.eraserSettings.invert) {
                eraser.inverted = true;
            }

            // Apply eraser to canvas
            window.canvas.freeDrawingBrush = eraser;
            window.canvas.isDrawingMode = true;
        },

        // Setup pencil with different brush types
        setupPencil() {
            if (!window.canvas) return;

            let brush;

            // Create appropriate brush based on brush type
            switch(this.pencilSettings.brushType) {
                case 'Circle':
                    brush = new fabric.CircleBrush(window.canvas);
                    break;
                case 'Spray':
                    brush = new fabric.SprayBrush(window.canvas);
                    break;
                case 'hLine':
                case 'vLine':
                case 'square':
                case 'diamond':
                case 'texture':
                    // Create a pattern brush
                    brush = new fabric.PatternBrush(window.canvas);
                    brush.getPatternSrc = () => {
                        // Create a pattern based on the selected type
                        const patternCanvas = document.createElement('canvas');
                        const ctx = patternCanvas.getContext('2d');
                        patternCanvas.width = patternCanvas.height = 10;

                        ctx.fillStyle = this.pencilSettings.color;

                        switch(this.pencilSettings.brushType) {
                            case 'hLine':
                                ctx.fillRect(0, 5, 10, 1);
                                break;
                            case 'vLine':
                                ctx.fillRect(5, 0, 1, 10);
                                break;
                            case 'square':
                                ctx.fillRect(2, 2, 6, 6);
                                break;
                            case 'diamond':
                                ctx.beginPath();
                                ctx.moveTo(5, 0);
                                ctx.lineTo(10, 5);
                                ctx.lineTo(5, 10);
                                ctx.lineTo(0, 5);
                                ctx.closePath();
                                ctx.fill();
                                break;
                            case 'texture':
                                ctx.fillRect(1, 1, 2, 2);
                                ctx.fillRect(5, 5, 2, 2);
                                ctx.fillRect(8, 2, 1, 1);
                                ctx.fillRect(2, 8, 1, 1);
                                break;
                        }

                        return patternCanvas;
                    };
                    break;
                default:
                    // Default to pencil brush
                    brush = new fabric.PencilBrush(window.canvas);
            }

            // Set common properties
            brush.width = parseInt(this.pencilSettings.size);
            brush.color = this.pencilSettings.color;

            // Set shadow if enabled
            if (parseInt(this.pencilSettings.shadowWidth) > 0) {
                brush.shadow = new fabric.Shadow({
                    blur: parseInt(this.pencilSettings.shadowWidth),
                    offsetX: parseInt(this.pencilSettings.shadowOffsetX),
                    offsetY: parseInt(this.pencilSettings.shadowOffsetY),
                    color: this.pencilSettings.shadowColor
                });
            }

            // Apply brush to canvas
            window.canvas.freeDrawingBrush = brush;
            window.canvas.isDrawingMode = true;
        }
    }));
});
// Settings Panel component
document.addEventListener('alpine:init', () => {
    Alpine.data('settingsPanel', () => ({
        isActive: false,
        customSizeVisible: false,
        backgroundColor: '#ffffff',
        customWidth: 1080,
        customHeight: 1920,

        // Predefined canvas sizes
        canvasSizes: [
            { name: 'TikTok (1080x1920)', value: '1080x1920' },
            { name: 'YouTube (1280x720)', value: '1280x720' },
            { name: 'Facebook Post (1200x630)', value: '1200x630' },
            { name: 'Instagram Post (1080x1080)', value: '1080x1080' },
            { name: 'Instagram Story (1080x1920)', value: '1080x1920' },
            { name: 'Facebook Cover (820x312)', value: '820x312' },
            { name: 'LinkedIn Post (1200x1200)', value: '1200x1200' },
            { name: 'LinkedIn Cover (1584x396)', value: '1584x396' },
            { name: 'Twitter Header (1500x500)', value: '1500x500' },
            { name: 'Snapchat Story (1080x1920)', value: '1080x1920' },
            { name: 'YouTube Channel Art (2560x1440)', value: '2560x1440' },
            { name: 'Pinterest Pin (1600x900)', value: '1600x900' },
            { name: 'Custom', value: 'custom' }
        ],
        filteredSizes: [],

        init() {
            // Initialize with current canvas settings if available
            if (window.canvas) {
                this.backgroundColor = window.canvas.backgroundColor || '#ffffff';
            }
        },

        // Filter sizes based on search
        filterSizes() {
            if (!this.search) {
                this.filteredSizes = this.canvasSizes;
                return;
            }

            this.filteredSizes = this.canvasSizes.filter(size =>
                size.name.toLowerCase().includes(this.search.toLowerCase())
            );
        },

        // Select a size from the dropdown
        selectSize(size) {
            if (size.value === 'custom') {
                this.customSizeVisible = true;
                return;
            }

            this.customSizeVisible = false;

            // Parse dimensions from the value (format: "WidthxHeight")
            const [width, height] = size.value.split('x').map(Number);

            // Apply size to canvas
            this.resizeCanvas(width, height);
        },

        // Apply custom size
        applyCustomSize() {
            if (!this.customWidth || !this.customHeight) return;

            this.resizeCanvas(this.customWidth, this.customHeight);
        },

        // Resize the canvas to specified dimensions
        resizeCanvas(width, height) {
            if (!window.canvas) return;

            // Set canvas dimensions
            window.canvas.setWidth(width);
            window.canvas.setHeight(height);

            // Center the canvas content
            const objects = window.canvas.getObjects();
            if (objects.length > 0) {
                const selection = new fabric.ActiveSelection(objects, { canvas: window.canvas });
                selection.center();
                window.canvas.discardActiveObject();
            }

            // Trigger a canvas resize event
            window.dispatchEvent(new CustomEvent('canvas:resized', {
                detail: { width, height }
            }));

            window.canvas.renderAll();
        },

        // Update background color
        updateBackgroundColor() {
            if (!window.canvas) return;

            window.canvas.setBackgroundColor(this.backgroundColor, () => {
                window.canvas.renderAll();
            });
        }
    }));
});
// Layers Panel component
document.addEventListener('alpine:init', () => {
    Alpine.data('layersPanel', () => ({
        isActive: false,
        layers: [],
        selectedLayerId: null,

        init() {
            // Update layers when canvas changes
            window.addEventListener('object:added', this.updateLayers.bind(this));
            window.addEventListener('object:removed', this.updateLayers.bind(this));
            window.addEventListener('object:modified', this.updateLayers.bind(this));

            // Listen for selection changes
            window.addEventListener('object:selected', (e) => {
                if (e.detail && e.detail.id) {
                    this.selectedLayerId = e.detail.id;
                }
            });

            window.addEventListener('selection:cleared', () => {
                this.selectedLayerId = null;
            });

            // Initial update
            this.updateLayers();
        },

        // Update the layers list from canvas objects
        updateLayers() {
            if (!window.canvas) return;

            const objects = window.canvas.getObjects();
            this.layers = objects.map(obj => ({
                id: obj.id || this.generateId(),
                name: obj.name || this.getObjectTypeName(obj),
                type: obj.type,
                visible: !obj.invisible,
                object: obj
            })).reverse(); // Reverse to match visual stacking order
        },

        // Generate a unique ID for objects that don't have one
        generateId() {
            return '_' + Math.random().toString(36).substr(2, 9);
        },

        // Get a human-readable name based on object type
        getObjectTypeName(obj) {
            switch(obj.type) {
                case 'text':
                    return `Text: ${obj.text.substr(0, 15)}${obj.text.length > 15 ? '...' : ''}`;
                case 'image':
                    return 'Image';
                case 'rect':
                    return 'Rectangle';
                case 'circle':
                    return 'Circle';
                case 'path':
                    return 'Drawing';
                default:
                    return `Layer ${this.layers.length + 1}`;
            }
        },

        // Select a layer
        selectLayer(layer) {
            if (!window.canvas) return;

            window.canvas.discardActiveObject();
            window.canvas.setActiveObject(layer.object);
            this.selectedLayerId = layer.id;
            window.canvas.renderAll();
        },

        // Toggle layer visibility
        toggleLayerVisibility(layer) {
            if (!window.canvas) return;

            layer.visible = !layer.visible;
            layer.object.set('visible', layer.visible);
            window.canvas.renderAll();
        },

        // Move layer up in stacking order
        moveLayerUp(index) {
            if (!window.canvas || index === 0) return;

            // Get the actual objects from canvas (reverse to match our display order)
            const objects = window.canvas.getObjects().slice().reverse();
            const objectToMove = objects[index];

            // Move in the canvas (bring forward)
            window.canvas.bringForward(objects[index]);

            // Update our layer array to reflect change
            this.updateLayers();
        },

        // Move layer down in stacking order
        moveLayerDown(index) {
            if (!window.canvas || index === this.layers.length - 1) return;

            // Get the actual objects from canvas (reverse to match our display order)
            const objects = window.canvas.getObjects().slice().reverse();
            const objectToMove = objects[index];

            // Move in the canvas (send backward)
            window.canvas.sendBackwards(objects[index]);

            // Update our layer array to reflect change
            this.updateLayers();
        },

        // Delete a layer
        deleteLayer(layer) {
            if (!window.canvas) return;

            // Remove from canvas
            window.canvas.remove(layer.object);

            // Update layers
            this.updateLayers();
        }
    }));
});
// Clip Arts Panel component
document.addEventListener('alpine:init', () => {
    Alpine.data('clipArtsPanel', () => ({
        isActive: false,

        init() {
            // Component initialization code if needed
        },

        // Add a clip art to the canvas
        addClipArt(url) {
            if (!window.canvas) return;

            fabric.Image.fromURL(url, (img) => {
                // Scale the image to a reasonable size
                const maxDimension = 200;
                if (img.width > maxDimension || img.height > maxDimension) {
                    const scaleFactor = Math.min(
                        maxDimension / img.width,
                        maxDimension / img.height
                    );
                    img.scale(scaleFactor);
                }

                // Position the image in the center of the canvas
                img.set({
                    left: window.canvas.width / 2,
                    top: window.canvas.height / 2,
                    originX: 'center',
                    originY: 'center',
                    name: 'Clip Art'
                });

                // Add the image to the canvas
                window.canvas.add(img);
                window.canvas.setActiveObject(img);
                window.canvas.renderAll();

                // Dispatch event for other components to know about the new object
                window.dispatchEvent(new CustomEvent('object:added', {
                    detail: img
                }));
            });
        }
    }));
});
// Mask Panel component
document.addEventListener('alpine:init', () => {
    Alpine.data('maskPanel', () => ({
        isActive: false,

        init() {
            // Component initialization code if needed
        },

        // Apply a mask to the currently selected object
        applyMask(maskUrl) {
            if (!window.canvas) return;

            const activeObject = window.canvas.getActiveObject();
            if (!activeObject) {
                // Alert user to select an object first
                alert('Please select an image to apply a mask to');
                return;
            }

            // Check if the active object is an image
            if (activeObject.type !== 'image') {
                alert('Masks can only be applied to images');
                return;
            }

            // Load the mask SVG
            fabric.loadSVGFromURL(maskUrl, (objects, options) => {
                // Create a group from all the SVG objects
                const svgGroup = fabric.util.groupSVGElements(objects, options);

                // Scale and position the mask to match the image
                svgGroup.set({
                    scaleX: activeObject.width / svgGroup.width,
                    scaleY: activeObject.height / svgGroup.height,
                    originX: 'center',
                    originY: 'center',
                    left: activeObject.left,
                    top: activeObject.top,
                    angle: activeObject.angle
                });

                // Apply the mask (using clipPath in Fabric.js)
                activeObject.clipPath = svgGroup;

                // Update the canvas
                window.canvas.renderAll();
            });
        }
    }));
});
// canvas
// Quick Options Bar component
document.addEventListener('alpine:init', () => {
    Alpine.data('quickOptionsBar', () => ({
        hasSelection: false,
        canCrop: false,
        cropActive: false,
        cropInstance: null,

        init() {
            // Wait for canvas to be initialized
            window.addEventListener('canvas:initialized', (e) => {
                // Listen for selection changes
                window.canvas.on('selection:created', this.handleSelection.bind(this));
                window.canvas.on('selection:updated', this.handleSelection.bind(this));
                window.canvas.on('selection:cleared', this.handleSelectionCleared.bind(this));
            });
        },

        // Handle selection on canvas
        handleSelection(e) {
            const activeObject = e.selected ? e.selected[0] : window.canvas.getActiveObject();
            this.hasSelection = !!activeObject;

            // Check if the selected object is an image (can be cropped)
            this.canCrop = activeObject && activeObject.type === 'image';
        },

        // Handle selection cleared
        handleSelectionCleared() {
            this.hasSelection = false;
            this.canCrop = false;
        },

        // Align selected objects
        alignObjects(alignType) {
            if (!window.canvas || !this.hasSelection) return;

            const activeObject = window.canvas.getActiveObject();
            if (!activeObject) return;

            // Get canvas dimensions
            const canvasWidth = window.canvas.width;
            const canvasHeight = window.canvas.height;

            // Calculate new position based on alignment type
            let newLeft, newTop;

            switch (alignType) {
                case 'left':
                    newLeft = activeObject.getScaledWidth() / 2;
                    window.canvas.centerObjectH(activeObject, false);
                    activeObject.set({ left: newLeft });
                    break;
                case 'centerH':
                    window.canvas.centerObjectH(activeObject);
                    break;
                case 'right':
                    newLeft = canvasWidth - activeObject.getScaledWidth() / 2;
                    window.canvas.centerObjectH(activeObject, false);
                    activeObject.set({ left: newLeft });
                    break;
                case 'top':
                    newTop = activeObject.getScaledHeight() / 2;
                    window.canvas.centerObjectV(activeObject, false);
                    activeObject.set({ top: newTop });
                    break;
                case 'centerV':
                    window.canvas.centerObjectV(activeObject);
                    break;
                case 'bottom':
                    newTop = canvasHeight - activeObject.getScaledHeight() / 2;
                    window.canvas.centerObjectV(activeObject, false);
                    activeObject.set({ top: newTop });
                    break;
            }

            // Update canvas
            window.canvas.renderAll();
        },

        // Start crop mode
        startCrop() {
            if (!window.canvas || !this.canCrop) return;

            const activeObject = window.canvas.getActiveObject();
            if (!activeObject || activeObject.type !== 'image') return;

            // Enable crop mode
            this.cropActive = true;

            // Create crop interface using Fabric.js cropzones
            // This is a simplified example - actual implementation would depend on your Fabric.js setup
            this.cropInstance = new fabric.Cropzone(activeObject, {
                cornerColor: 'blue',
                cornerSize: 12,
                transparentCorners: false
            });

            window.canvas.add(this.cropInstance);
            window.canvas.setActiveObject(this.cropInstance);
            window.canvas.renderAll();
        },

        // Apply crop
        applyCrop() {
            if (!window.canvas || !this.cropActive || !this.cropInstance) return;

            // Apply cropping to the image
            // This is a simplified example - actual implementation would depend on your Fabric.js setup
            const image = this.cropInstance.image;
            const cropData = this.cropInstance.getCropData();

            // Apply crop data to the image
            image.set({
                cropX: cropData.x,
                cropY: cropData.y,
                width: cropData.width,
                height: cropData.height
            });

            // Remove crop interface
            window.canvas.remove(this.cropInstance);
            this.cropInstance = null;
            this.cropActive = false;

            // Update canvas
            window.canvas.renderAll();
        },

        // Reset crop
        resetCrop() {
            if (!window.canvas || !this.cropActive || !this.cropInstance) return;

            // Remove crop interface without applying changes
            window.canvas.remove(this.cropInstance);
            this.cropInstance = null;
            this.cropActive = false;

            // Update canvas
            window.canvas.renderAll();
        },

        // Delete selected object
        deleteSelected() {
            if (!window.canvas || !this.hasSelection) return;

            const activeObject = window.canvas.getActiveObject();
            if (!activeObject) return;

            window.canvas.remove(activeObject);
            this.hasSelection = false;
            window.canvas.renderAll();
        }
    }));
});
// Initialize Alpine
Alpine.start();