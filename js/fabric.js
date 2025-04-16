import {
    Canvas,
    Textbox,
    Rect,
    Path,
    PencilBrush,
    Circle,
    Line,
    FabricImage,
    ActiveSelection,
    filters,
} from "fabric";
import textComponent from "./components/text";
import uploadsComponent from "./components/uploads";
import drawingComponent from "./components/drawing";
import layersComponent from "./components/layers";
import clipArtsComponent from "./components/clipArts";
import masksComponent from "./components/masks";
import settingsComponent from "./components/settings";
import toolbarComponent from "./components/toolbar";
import contextMenuComponent from "./components/contextMenu";
import {downloadJPG, downloadPNG} from "./utils/export-utils";

// Create the unified fabric component
export default function fabricComponent() {

    return {


        // Main component properties
        activeTool: "templates", // Default active tool
        canvas: null,

        // Import all the components
        contextMenu: contextMenuComponent(),
        text: textComponent(),
        uploads: uploadsComponent(),
        drawing: drawingComponent(),
        layers: layersComponent(),
        clipArts: clipArtsComponent(),
        masks: masksComponent(),
        settings: settingsComponent(),
        toolbar: toolbarComponent(),

        fitToCanvas() {
            if (!window.canvas) return;
            const objects = window.canvas.getObjects();
            if (objects.length === 0) return;

            const selection = new ActiveSelection(objects, {canvas: window.canvas});
            const canvasWidth = window.canvas.width;
            const canvasHeight = window.canvas.height;
            const selectionWidth = selection.width * selection.scaleX;
            const selectionHeight = selection.height * selection.scaleY;
            const scaleX = (canvasWidth - 40) / selectionWidth;
            const scaleY = (canvasHeight - 40) / selectionHeight;
            const scale = Math.min(scaleX, scaleY);

            selection.scale(scale);
            selection.center();
            window.canvas.discardActiveObject();
            this.addToHistory();
            window.canvas.requestRenderAll();
        },

        clearCanvas() {
            if (!window.canvas) return;
            window.canvas.clear();
            window.canvas.setBackgroundColor(
                "#ffffff",
                window.canvas.renderAll.bind(window.canvas)
            );
            this.addToHistory();
        },

        align(direction) {
            if (!window.canvas) return;
            const activeObject = window.canvas.getActiveObject();
            if (!activeObject) return;

            // Case 1: Single object - align relative to canvas
            if (activeObject.type !== 'activeSelection' && activeObject.type !== 'group') {
                this.alignSingleObject(activeObject, direction);
            }
            // Case 2: Multiple objects - align relative to each other
            else {
                this.alignMultipleObjects(activeObject, direction);
            }

            window.canvas.requestRenderAll();
            this.addToHistory();
        },

        // aligning a single object to the canvas
        alignSingleObject(object, direction) {
            const canvasWidth = window.canvas.width;
            const canvasHeight = window.canvas.height;
            const objectWidth = object.width * object.scaleX;
            const objectHeight = object.height * object.scaleY;

            switch (direction) {
                case "left":
                    object.set({left: objectWidth / 2});
                    break;
                case "horizontalCenter":
                case "centerH":
                    object.set({left: canvasWidth / 2});
                    break;
                case "right":
                    object.set({left: canvasWidth - objectWidth / 2});
                    break;
                case "top":
                    object.set({top: objectHeight / 2});
                    break;
                case "verticalCenter":
                case "centerV":
                    object.set({top: canvasHeight / 2});
                    break;
                case "bottom":
                    object.set({top: canvasHeight - objectHeight / 2});
                    break;
            }

            object.setCoords();
        },

// aligning multiple objects relative to each other
        alignMultipleObjects(activeSelection, direction) {
            // Get all objects in the selection
            const objects = activeSelection.getObjects();
            if (objects.length <= 1) return; // Nothing to align if only one object

            // Find the bounds of the selection
            const selectionBounds = activeSelection.getBoundingRect(true);

            switch (direction) {
                case "left":
                    // Align all objects to the leftmost point
                    let minLeft = Infinity;
                    objects.forEach(obj => {
                        const boundingRect = obj.getBoundingRect(true);
                        minLeft = Math.min(minLeft, boundingRect.left);
                    });

                    objects.forEach(obj => {
                        const boundingRect = obj.getBoundingRect(true);
                        const objWidth = boundingRect.width;
                        obj.set({
                            left: obj.left + (minLeft - boundingRect.left) + (objWidth / 2) - (obj.width * obj.scaleX / 2)
                        });
                    });
                    break;

                case "horizontalCenter":
                case "centerH":
                    // Align all objects to horizontal center of selection
                    const selectionCenterX = selectionBounds.left + selectionBounds.width / 2;
                    objects.forEach(obj => {
                        obj.set({
                            left: obj.left + (selectionCenterX - (obj.left + (obj.width * obj.scaleX / 2)))
                        });
                    });
                    break;

                case "right":
                    // Align all objects to the rightmost point
                    let maxRight = -Infinity;
                    objects.forEach(obj => {
                        const boundingRect = obj.getBoundingRect(true);
                        maxRight = Math.max(maxRight, boundingRect.left + boundingRect.width);
                    });

                    objects.forEach(obj => {
                        const boundingRect = obj.getBoundingRect(true);
                        const objWidth = boundingRect.width;
                        obj.set({
                            left: obj.left + (maxRight - (boundingRect.left + boundingRect.width)) + (obj.width * obj.scaleX / 2) - (objWidth / 2)
                        });
                    });
                    break;

                case "top":
                    // Align all objects to the topmost point
                    let minTop = Infinity;
                    objects.forEach(obj => {
                        const boundingRect = obj.getBoundingRect(true);
                        minTop = Math.min(minTop, boundingRect.top);
                    });

                    objects.forEach(obj => {
                        const boundingRect = obj.getBoundingRect(true);
                        const objHeight = boundingRect.height;
                        obj.set({
                            top: obj.top + (minTop - boundingRect.top) + (objHeight / 2) - (obj.height * obj.scaleY / 2)
                        });
                    });
                    break;

                case "verticalCenter":
                case "centerV":
                    // Align all objects to vertical center of selection
                    const selectionCenterY = selectionBounds.top + selectionBounds.height / 2;
                    objects.forEach(obj => {
                        obj.set({
                            top: obj.top + (selectionCenterY - (obj.top + (obj.height * obj.scaleY / 2)))
                        });
                    });
                    break;

                case "bottom":
                    // Align all objects to the bottommost point
                    let maxBottom = -Infinity;
                    objects.forEach(obj => {
                        const boundingRect = obj.getBoundingRect(true);
                        maxBottom = Math.max(maxBottom, boundingRect.top + boundingRect.height);
                    });

                    objects.forEach(obj => {
                        const boundingRect = obj.getBoundingRect(true);
                        const objHeight = boundingRect.height;
                        obj.set({
                            top: obj.top + (maxBottom - (boundingRect.top + boundingRect.height)) + (obj.height * obj.scaleY / 2) - (objHeight / 2)
                        });
                    });
                    break;
            }

            // Need to call this after modifying objects within a selection
            activeSelection.setCoords();
        },

        group() {
            if (!window.canvas) return;
            if (!window.canvas.getActiveObject()) return;
            if (window.canvas.getActiveObject().type !== "activeSelection") return;

            window.canvas.getActiveObject().toGroup();
            window.canvas.requestRenderAll();
            this.addToHistory();
        },

        ungroup() {
            if (!window.canvas) return;
            if (!window.canvas.getActiveObject()) return;
            if (window.canvas.getActiveObject().type !== "group") return;

            window.canvas.getActiveObject().toActiveSelection();
            window.canvas.requestRenderAll();
            this.addToHistory();
        },

        bringToFront() {
            if (!window.canvas) return;
            const activeObject = window.canvas.getActiveObject();
            if (activeObject) {
                window.canvas.bringToFront(activeObject);
                this.addToHistory();
            }
        },

        bringForward() {
            if (!window.canvas) return;
            const activeObject = window.canvas.getActiveObject();
            if (activeObject) {
                window.canvas.bringForward(activeObject);
                this.addToHistory();
            }
        },

        sendBackward() {
            if (!window.canvas) return;
            const activeObject = window.canvas.getActiveObject();
            if (activeObject) {
                window.canvas.sendBackwards(activeObject);
                this.addToHistory();
            }
        },

        sendToBack() {
            if (!window.canvas) return;
            const activeObject = window.canvas.getActiveObject();
            if (activeObject) {
                window.canvas.sendToBack(activeObject);
                this.addToHistory();
            }
        },

        deleteObject() {
            if (!window.canvas) return;
            const activeObject = window.canvas.getActiveObject();
            if (activeObject) {
                window.canvas.remove(activeObject);
                this.addToHistory();
            }
        },

        cloneObject() {
            if (!window.canvas) return;
            const activeObject = window.canvas.getActiveObject();
            if (!activeObject) return;

            activeObject.clone((cloned) => {
                cloned.set({
                    left: activeObject.left + 10,
                    top: activeObject.top + 10,
                });
                window.canvas.add(cloned);
                window.canvas.setActiveObject(cloned);
                this.addToHistory();
            });
        },

        toggleLock() {
            if (!window.canvas) return;
            const activeObject = window.canvas.getActiveObject();
            if (activeObject) {
                activeObject.set({
                    lockMovementX: !activeObject.lockMovementX,
                    lockMovementY: !activeObject.lockMovementY,
                    lockRotation: !activeObject.lockRotation,
                    lockScalingX: !activeObject.lockScalingX,
                    lockScalingY: !activeObject.lockScalingY,
                });
                window.canvas.requestRenderAll();
                this.addToHistory();
            }
        },

        // History management
        historyStack: [],
        historyPosition: -1,
        maxHistorySteps: 50,

        initHistoryManager() {
            this.historyStack = [];
            this.historyPosition = -1;
            this.saveCanvasState();
        },

        saveCanvasState() {
            if (!window.canvas) return;
            const json = window.canvas.toJSON([
                "lockMovementX",
                "lockMovementY",
                "lockRotation",
                "lockScalingX",
                "lockScalingY",
            ]);
            const canvasState = JSON.stringify(json);

            // If we're not at the end of the stack, remove future states
            if (this.historyPosition < this.historyStack.length - 1) {
                this.historyStack = this.historyStack.slice(
                    0,
                    this.historyPosition + 1
                );
            }

            // Add the new state
            this.historyStack.push(canvasState);

            // Limit the history size
            if (this.historyStack.length > this.maxHistorySteps) {
                this.historyStack.shift();
            } else {
                this.historyPosition++;
            }
        },

        addToHistory() {
            this.saveCanvasState();
        },

        undo() {
            if (this.historyPosition > 0) {
                this.historyPosition--;
                this.loadCanvasState(this.historyStack[this.historyPosition]);
            }
        },

        redo() {
            if (this.historyPosition < this.historyStack.length - 1) {
                this.historyPosition++;
                this.loadCanvasState(this.historyStack[this.historyPosition]);
            }
        },

        loadCanvasState(state) {
            if (!window.canvas || !state) return;

            window.canvas.clear();
            window.canvas.loadFromJSON(JSON.parse(state), () => {
                window.canvas.requestRenderAll();
            });
        },

        exportFunctions: {
            downloadCanvas(format) {
                if (!window.canvas) return;

                if (format === "png") {
                    downloadPNG();
                } else if (format === "jpg" || format === "jpeg") {
                    downloadJPG();
                }
            },
        },

        // Main component initialization
        init() {
            this.$nextTick(() => {
                this.initCanvas();
                this.initHistoryManager();
                this.initKeyboardShortcuts();
                // Initialize context menu
                if (this.contextMenu && typeof this.contextMenu.init === 'function') {
                    this.contextMenu.init();
                }
                   // Initialize masks component
                if (this.masks && typeof this.masks.init === 'function') {
                    this.masks.init();
                }
                if (this.layers && typeof this.layers.init === 'function') {
                    this.layers.init();
                }
                // Initialize other components as needed
                if (this.uploads && typeof this.uploads.init === 'function') {
                    this.uploads.init();
                }
                // Keep this important log for initialization verification
                console.log("Canvas initialized:", !!window.canvas);
            });

            this.$watch("activeTool", (value) => {
                this.activeTool = value;
            });
        },

        // Change tool method
        changeTool(toolName) {
            this.activeTool = toolName;

            // Deactivate drawing mode when switching to non-drawing tools
            if (window.canvas && toolName !== "drawing") {
                window.canvas.isDrawingMode = false;
            }

            // If drawing tool is selected, initialize it
            if (toolName === "drawing" && this.drawing) {
                // Initialize the drawing mode
                this.drawing.updateDrawingMode("brush");
            }
        },

        initCanvas() {
            try {
                // Get the canvas container element
                const canvasContainer = document.getElementById('canvas-container');

                // Set size to be square (same width and height)
                const containerSize = Math.min(canvasContainer.clientWidth, canvasContainer.clientHeight);

                // Create canvas with square dimensions
                const canvas = new Canvas("image-editor", {
                    preserveObjectStacking: true,
                    width: containerSize,
                    height: containerSize, // Make sure height equals width
                    backgroundColor: "#ffffff",
                    enableRetinaScaling: true,
                    renderOnAddRemove: false,
                });

                // Store canvas reference globally and in Alpine state
                window.canvas = canvas;
                this.canvas = canvas;

                // Make this component accessible globally for child components
                window.fabricComponent = this;

                // Add proper resize handling to maintain square aspect ratio
                window.addEventListener('resize', () => {
                    // Get new container size (should be square)
                    const newSize = Math.min(canvasContainer.clientWidth, canvasContainer.clientHeight);

                    // Update canvas dimensions as a square
                    canvas.setDimensions({
                        width: newSize,
                        height: newSize // Equal to width for square
                    });

                    // Re-center all objects
                    const objects = canvas.getObjects();
                    if (objects.length > 0) {
                        const selection = new ActiveSelection(objects, {canvas: canvas});
                        // Use centerH and centerV instead of center
                        selection.centerH();
                        selection.centerV();
                        canvas.discardActiveObject();
                        canvas.requestRenderAll();
                    }
                });

                // Make wheel event passive for better performance
                if (canvas.wrapperEl) {
                    const originalAddEventListener = canvas.wrapperEl.addEventListener;
                    canvas.wrapperEl.addEventListener = function (
                        type,
                        listener,
                        options
                    ) {
                        if (type === "wheel") {
                            if (typeof options === "object") {
                                options.passive = true;
                            } else {
                                options = {passive: true};
                            }
                        }
                        return originalAddEventListener.call(this, type, listener, options);
                    };
                }

                // Set up native Fabric event listeners with proper context binding
                canvas.on("selection:created", (e) => this.handleSelection(e));
                canvas.on("selection:updated", (e) => this.handleSelection(e));
                canvas.on("selection:cleared", () => this.handleSelectionCleared());
                canvas.on("object:modified", (e) => this.handleObjectModified(e));
                canvas.on("object:added", (e) => this.handleObjectAdded(e));
                canvas.on("object:removed", (e) => this.handleObjectRemoved(e));

                // Initial render
                canvas.requestRenderAll();

                // Ensure canvas is properly centered initially
                setTimeout(() => {
                    // Use the fixed centerAll method
                    this.centerAll();
                    canvas.requestRenderAll();
                }, 100);
            } catch (error) {
                console.error("Error initializing canvas:", error);
            }
        },
        handleSelection(e) {
            try {
                const activeObject = this.canvas.getActiveObject();
                if (activeObject) {
                    

                    // Update specific component states
                    if (this.toolbar) {
                        this.toolbar.hasSelection = true;
                        this.toolbar.canCrop = activeObject.type === "image";
                        this.toolbar.isMultiSelection =
                            activeObject.type === "activeSelection";
                    }

                    // Handle text objects
                    if (activeObject.type && activeObject.type.includes("text")) {
                        if (this.text) {
                            this.text.selectedObject = activeObject;
                            if (typeof this.text.syncTextProperties === "function") {
                                this.text.syncTextProperties(activeObject);
                            }
                        }
                    }
                    // Handle image objects
                    else if (activeObject.type === "image") {
                        if (this.uploads) {
                            this.uploads.selectedObject = activeObject;
                            this.uploads.selectedImage = activeObject;
                            if (typeof this.uploads.syncObjectProperties === "function") {
                                this.uploads.syncObjectProperties();
                            }
                        }
                        // Make sure masks component knows about image selection
                        if (this.masks) {
                            this.masks.selectedObject = activeObject;
                        }
                    }
                }
            } catch (error) {
                console.error("Error in handleSelection:", error);
            }
        },

        handleSelectionCleared() {
            try {
                // Reset selection states
                if (this.toolbar) {
                    this.toolbar.hasSelection = false;
                    this.toolbar.canCrop = false;
                    this.toolbar.isMultiSelection = false;
                }

                if (this.text) {
                    this.text.selectedObject = null;
                }

                if (this.uploads) {
                    this.uploads.selectedObject = null;
                    this.uploads.selectedImage = null;
                }
            } catch (error) {
                // Silent error handling
            }
        },

        handleObjectModified(e) {
            try {
                // Add to history for undo/redo
                this.addToHistory();
            } catch (error) {
                // Silent error handling
            }
        },

        handleObjectAdded(e) {
            try {
                // Add to history for undo/redo
                this.addToHistory();

                // Update layers panel if available
                if (this.layers && typeof this.layers.syncLayers === "function") {
                    this.layers.syncLayers();
                }
            } catch (error) {
                // Silent error handling
            }
        },

        handleObjectRemoved(e) {
            try {
                // Add to history for undo/redo
                this.addToHistory();

                // Update layers panel if available
                if (this.layers && typeof this.layers.syncLayers === "function") {
                    this.layers.syncLayers();
                }
            } catch (error) {
                // Silent error handling
            }
        },

        // Image manipulation methods
        applyFilter(imageObject, filterType, options) {
            if (!imageObject) return;

            // Clear existing filters
            imageObject.filters = [];

            // Apply Fabric's built-in filters based on filter type
            switch (filterType) {
                case "grayscale":
                    imageObject.filters.push(new filters.Grayscale());
                    break;
                case "sepia":
                    imageObject.filters.push(new filters.Sepia());
                    break;
                case "invert":
                    imageObject.filters.push(new filters.Invert());
                    break;
                case "blur":
                    imageObject.filters.push(
                        new filters.Blur({
                            blur: options?.amount || 0.5,
                        })
                    );
                    break;
                case "contrast":
                    imageObject.filters.push(
                        new filters.Contrast({
                            contrast: options?.amount || 0.25,
                        })
                    );
                    break;
                case "brightness":
                    imageObject.filters.push(
                        new filters.Brightness({
                            brightness: options?.amount || 0.1,
                        })
                    );
                    break;
                case "saturation":
                    imageObject.filters.push(
                        new filters.Saturation({
                            saturation: options?.amount || 0.3,
                        })
                    );
                    break;
                case "noise":
                    imageObject.filters.push(
                        new filters.Noise({
                            noise: options?.amount || 100,
                        })
                    );
                    break;
                case "pixelate":
                    imageObject.filters.push(
                        new filters.Pixelate({
                            blocksize: options?.amount || 10,
                        })
                    );
                    break;
            }

            // Apply the filters
            imageObject.applyFilters();
            this.canvas.requestRenderAll();
            this.addToHistory();
        },

        addImage(url) {
            if (!this.canvas) return;

            FabricImage.fromURL(url, (img) => {
                // Set reasonable defaults
                const canvasWidth = this.canvas.width;
                const canvasHeight = this.canvas.height;
                const imgRatio = img.width / img.height;

                // Scale to fit within 80% of canvas (maintain aspect ratio)
                const maxWidth = canvasWidth * 0.8;
                const maxHeight = canvasHeight * 0.8;

                if (img.width > maxWidth || img.height > maxHeight) {
                    if (imgRatio > 1) {
                        img.scaleToWidth(maxWidth);
                    } else {
                        img.scaleToHeight(maxHeight);
                    }
                }

                // Center the image
                img.set({
                    left: canvasWidth / 2,
                    top: canvasHeight / 2,
                    originX: "center",
                    originY: "center",
                });

                this.canvas.add(img);
                this.canvas.setActiveObject(img);
                this.canvas.requestRenderAll();
                this.addToHistory();

                if (this.uploads && typeof this.uploads.imageAdded === "function") {
                    this.uploads.imageAdded(img);
                }
            });
        },

        addText(text, options = {}) {
            if (!this.canvas) return;

            const textbox = new Textbox(text || "Double-click to edit", {
                left: this.canvas.width / 2,
                top: this.canvas.height / 2,
                originX: "center",
                originY: "center",
                fontSize: options.fontSize || 40,
                fontFamily: options.fontFamily || "Arial",
                fill: options.fill || "#000000",
                textAlign: options.textAlign || "center",
                fontWeight: options.fontWeight || "normal",
                fontStyle: options.fontStyle || "normal",
                underline: options.underline || false,
                linethrough: options.linethrough || false,
                charSpacing: options.charSpacing || 0,
                lineHeight: options.lineHeight || 1.16,
                stroke: options.stroke || "",
                strokeWidth: options.strokeWidth || 0,
                backgroundColor: options.backgroundColor || "",
                width: options.width || 250,
            });

            this.canvas.add(textbox);
            this.canvas.setActiveObject(textbox);
            this.canvas.requestRenderAll();
            this.addToHistory();

            if (this.text && typeof this.text.textAdded === "function") {
                this.text.textAdded(textbox);
            }
        },

        //  keyboard shortcuts
        initKeyboardShortcuts() {
            // Add event listener for keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                // Skip if we're in an input field or textarea
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    return;
                }

                // Skip if any modifier keys are pressed except for the ones we explicitly check for
                if (e.altKey) {
                    return;
                }

                // Get active canvas object
                const activeObject = window.canvas?.getActiveObject();

                // Delete / Backspace key
                if ((e.key === 'Delete' || e.key === 'Backspace') && activeObject) {
                    e.preventDefault();
                    this.deleteObject();
                    window.canvas.requestRenderAll();
                }

                // Ctrl+C (Copy)
                if (e.ctrlKey && e.key === 'c' && activeObject) {
                    e.preventDefault();
                    // Store object data as JSON
                    window._clipboard = {
                        type: activeObject.type,
                        json: activeObject.toJSON(['src', 'crossOrigin']),
                    };
                }

                // Ctrl+X (Cut)
                if (e.ctrlKey && e.key === 'x' && activeObject) {
                    e.preventDefault();
                    // Store object data as JSON
                    window._clipboard = {
                        type: activeObject.type,
                        json: activeObject.toJSON(['src', 'crossOrigin']),
                    };
                    this.deleteObject();
                    window.canvas.requestRenderAll();
                }

                // Ctrl+V (Paste)
                if (e.ctrlKey && e.key === 'v' && window._clipboard) {
                    e.preventDefault();

                    // Handle different object types appropriately
                    if (window._clipboard.type === 'textbox') {
                        // For textboxes, create a new textbox instead of cloning
                        const textData = window._clipboard.json;
                        const newTextbox = new Textbox(textData.text, {
                            left: textData.left + 10,
                            top: textData.top + 10,
                            width: textData.width,
                            fontSize: textData.fontSize,
                            fontFamily: textData.fontFamily,
                            fill: textData.fill,
                            textAlign: textData.textAlign,
                            fontWeight: textData.fontWeight,
                            fontStyle: textData.fontStyle,
                            underline: textData.underline,
                            linethrough: textData.linethrough,
                            charSpacing: textData.charSpacing,
                            lineHeight: textData.lineHeight,
                            stroke: textData.stroke,
                            strokeWidth: textData.strokeWidth,
                            backgroundColor: textData.backgroundColor,
                            originX: textData.originX,
                            originY: textData.originY
                        });
                        window.canvas.add(newTextbox);
                        window.canvas.setActiveObject(newTextbox);
                        window.canvas.requestRenderAll();
                        this.addToHistory();

                        // Update text component if available
                        if (this.text && typeof this.text.textAdded === 'function') {
                            this.text.textAdded(newTextbox);
                        }
                    }
                    else if (window._clipboard.type === 'image') {
                        // Special handling for images - recreate from source instead of cloning
                        const imgData = window._clipboard.json;

                        if (imgData.src) {
                            // Create a completely new image from the source URL
                            FabricImage.fromURL(imgData.src, (img) => {
                                // Apply all the original properties
                                img.set({
                                    left: imgData.left + 10,
                                    top: imgData.top + 10,
                                    scaleX: imgData.scaleX,
                                    scaleY: imgData.scaleY,
                                    angle: imgData.angle,
                                    flipX: imgData.flipX,
                                    flipY: imgData.flipY,
                                    originX: imgData.originX || 'center',
                                    originY: imgData.originY || 'center',
                                    opacity: imgData.opacity,
                                    skewX: imgData.skewX,
                                    skewY: imgData.skewY,
                                    cropX: imgData.cropX,
                                    cropY: imgData.cropY
                                });

                                // Apply filters if any
                                if (imgData.filters && imgData.filters.length > 0) {
                                    // Recreate filters
                                    const newFilters = [];

                                    for (const filterData of imgData.filters) {
                                        if (!filterData) continue;

                                        // Create filters based on their class name
                                        switch (filterData.type) {
                                            case 'Grayscale':
                                                newFilters.push(new filters.Grayscale());
                                                break;
                                            case 'Sepia':
                                                newFilters.push(new filters.Sepia());
                                                break;
                                            case 'Invert':
                                                newFilters.push(new filters.Invert());
                                                break;
                                            case 'Blur':
                                                newFilters.push(new filters.Blur({blur: filterData.blur || 0.5}));
                                                break;
                                            case 'Brightness':
                                                newFilters.push(new filters.Brightness({brightness: filterData.brightness || 0.1}));
                                                break;
                                            case 'Contrast':
                                                newFilters.push(new filters.Contrast({contrast: filterData.contrast || 0.25}));
                                                break;
                                            case 'Saturation':
                                                newFilters.push(new filters.Saturation({saturation: filterData.saturation || 0.3}));
                                                break;
                                            case 'Noise':
                                                newFilters.push(new filters.Noise({noise: filterData.noise || 100}));
                                                break;
                                            case 'Pixelate':
                                                newFilters.push(new filters.Pixelate({blocksize: filterData.blocksize || 10}));
                                                break;
                                        }
                                    }

                                    // Apply the recreated filters
                                    if (newFilters.length > 0) {
                                        img.filters = newFilters;
                                        img.applyFilters();
                                    }
                                }

                                // Add to canvas
                                window.canvas.add(img);
                                window.canvas.setActiveObject(img);
                                window.canvas.requestRenderAll();
                                this.addToHistory();

                                // Update uploads component if available
                                if (this.uploads && typeof this.uploads.imageAdded === 'function') {
                                    this.uploads.imageAdded(img);
                                }
                            }, {crossOrigin: 'anonymous'});
                        }
                    }
                    else {
                        // For other objects, use the standard fabric util to recreate from JSON
                        // This avoids using the problematic clone method
                        window.fabric.util.enlivenObjects([window._clipboard.json], (objects) => {
                            const cloned = objects[0];
                            cloned.set({
                                left: window._clipboard.json.left + 10,
                                top: window._clipboard.json.top + 10
                            });
                            window.canvas.add(cloned);
                            window.canvas.setActiveObject(cloned);
                            window.canvas.requestRenderAll();
                            this.addToHistory();
                        });
                    }
                }

                // Escape (Deselect)
                if (e.key === 'Escape') {
                    window.canvas.discardActiveObject();
                    window.canvas.requestRenderAll();
                }
            });
        },

        // Override the centerAll method in your fabricComponent.js file
        centerAll() {
            
            if (!window.canvas) return;
            const objects = window.canvas.getObjects();
            if (objects.length === 0) return;

            try {
                // Don't use ActiveSelection which is causing the centerH error
                // Instead, calculate and apply offsets manually for each object

                // Find the bounding box of all objects
                let minX = Number.MAX_VALUE;
                let minY = Number.MAX_VALUE;
                let maxX = Number.MIN_VALUE;
                let maxY = Number.MIN_VALUE;

                objects.forEach(obj => {
                    const boundingRect = obj.getBoundingRect();
                    minX = Math.min(minX, boundingRect.left);
                    minY = Math.min(minY, boundingRect.top);
                    maxX = Math.max(maxX, boundingRect.left + boundingRect.width);
                    maxY = Math.max(maxY, boundingRect.top + boundingRect.height);
                });

                // Calculate the current center of all objects
                const currentCenterX = (minX + maxX) / 2;
                const currentCenterY = (minY + maxY) / 2;

                // Calculate the canvas center
                const canvasCenterX = window.canvas.width / 2;
                const canvasCenterY = window.canvas.height / 2;

                // Calculate the offset needed to center the objects
                const offsetX = canvasCenterX - currentCenterX;
                const offsetY = canvasCenterY - currentCenterY;

                // Apply offset to each object
                objects.forEach(obj => {
                    obj.set({
                        left: obj.left + offsetX,
                        top: obj.top + offsetY
                    });
                    obj.setCoords();
                });

                // Update canvas
                window.canvas.requestRenderAll();

                if (typeof this.addToHistory === 'function') {
                    this.addToHistory();
                }

                console.log("Objects centered successfully");
            } catch (error) {
                console.error("Error in centerAll:", error);
            }
        }


    };
}