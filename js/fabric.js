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
import {
    initHistoryManager,
    addToHistory as addHistoryState,
    undo as undoHistory,
    redo as redoHistory
} from "./utils/history-manager";
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

            try {
                // Create a selection of all objects
                const selection = new ActiveSelection(objects, {canvas: window.canvas});
                const canvasWidth = window.canvas.width;
                const canvasHeight = window.canvas.height;
                const selectionWidth = selection.width * selection.scaleX;
                const selectionHeight = selection.height * selection.scaleY;
                const scaleX = (canvasWidth - 40) / selectionWidth;
                const scaleY = (canvasHeight - 40) / selectionHeight;
                const scale = Math.min(scaleX, scaleY);

                // Apply scaling
                selection.scale(scale);

                // Center the selection manually (instead of using selection.center())
                const selectionCenter = selection.getCenterPoint();
                const canvasCenter = {x: canvasWidth / 2, y: canvasHeight / 2};

                // Calculate the offset needed to center
                const offsetX = canvasCenter.x - selectionCenter.x;
                const offsetY = canvasCenter.y - selectionCenter.y;

                // Move the selection to center
                selection.left += offsetX;
                selection.top += offsetY;
                selection.setCoords();

                // Apply the changes to the canvas
                window.canvas.setActiveObject(selection);
                window.canvas.discardActiveObject();
                this.addToHistory();
                window.canvas.requestRenderAll();
            } catch (error) {
                console.error("Error in fitToCanvas:", error);
            }
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

            console.log(`[DEBUG] Alignment requested: direction=${direction}, objectType=${activeObject.type}`);

            // Reset objectCaching to ensure alignment changes always take effect
            // This is crucial for text objects that might have their state cached
            activeObject.set('objectCaching', false);

            // Case 1: Single object - align relative to canvas
            if (activeObject.type !== 'activeSelection' && activeObject.type !== 'group') {
                console.log(`[DEBUG] Aligning single object: ${activeObject.type}`);
                this.alignSingleObject(activeObject, direction);
            }
            // Case 2: Multiple objects - align relative to each other
            else {
                console.log(`[DEBUG] Aligning multiple objects: count=${activeObject.getObjects().length}`);
                this.alignMultipleObjects(activeObject, direction);
            }

            // Force dirty state to ensure canvas updates
            if (activeObject.type && (activeObject.type.includes('text') || activeObject.type === 'textbox')) {
                console.log(`[DEBUG] Setting dirty state for text object`);
                activeObject.dirty = true;
            }

            // Ensure coordinates are properly updated
            activeObject.setCoords();

            // Force a complete canvas re-render
            window.canvas.requestRenderAll();

            // Add to history to track the change
            this.addToHistory();

            console.log(`[DEBUG] Alignment completed for ${direction}`);
        },

        // aligning a single object to the canvas
        alignSingleObject(object, direction) {
            const canvasWidth = window.canvas.width;
            const canvasHeight = window.canvas.height;
            const objectWidth = object.width * object.scaleX;
            const objectHeight = object.height * object.scaleY;

            // Store original values in case needed for debugging
            const originalLeft = object.left;
            const originalTop = object.top;
            const originalTextAlign = object.type.includes('text') ? object.textAlign : 'N/A';

            console.log(`[DEBUG] Before alignment: left=${originalLeft.toFixed(2)}, top=${originalTop.toFixed(2)}, textAlign=${originalTextAlign}`);

            // First handle positioning
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

            // Special handling for text objects (Textbox or text type objects)
            if (object.type && (object.type.includes('text') || object.type === 'textbox')) {
                // Handle internal text alignment separately from positioning
                if (direction === "left") {
                    // Force text to be left aligned within its bounding box
                    console.log(`[DEBUG] Setting textAlign to left from ${object.textAlign}`);
                    object.set('textAlign', 'left');

                    // Make sure the object has the right origin point
                    object.set('originX', 'left');
                } else if (direction === "horizontalCenter" || direction === "centerH") {
                    // Force text to be center aligned within its bounding box
                    console.log(`[DEBUG] Setting textAlign to center from ${object.textAlign}`);
                    object.set('textAlign', 'center');

                    // Make sure the object has the right origin point
                    object.set('originX', 'center');
                } else if (direction === "right") {
                    // Force text to be right aligned within its bounding box
                    console.log(`[DEBUG] Setting textAlign to right from ${object.textAlign}`);
                    object.set('textAlign', 'right');

                    // Make sure the object has the right origin point
                    object.set('originX', 'right');
                }

                // Force complete refresh of the object
                object.dirty = true;

                // Apply text alignment directly to ensure it works
                if (typeof object._applyTextStyleDimensions === 'function') {
                    object._applyTextStyleDimensions();
                }
            }

            // Always update coordinates
            object.setCoords();

            console.log(`[DEBUG] After alignment: left=${object.left.toFixed(2)}, top=${object.top.toFixed(2)}, textAlign=${object.type.includes('text') ? object.textAlign : 'N/A'}, originX=${object.originX}`);
        },

// aligning multiple objects relative to each other
        alignMultipleObjects(activeSelection, direction) {
            console.log(`[DEBUG] Starting multiple object alignment for direction: ${direction}`);

            // Get all objects in the selection
            const objects = activeSelection.getObjects();
            if (objects.length <= 1) return; // Nothing to align if only one object

            // Find the bounds of the selection
            const selectionBounds = activeSelection.getBoundingRect(true);
            console.log(`[DEBUG] Selection bounds: left=${selectionBounds.left.toFixed(2)}, top=${selectionBounds.top.toFixed(2)}, width=${selectionBounds.width.toFixed(2)}, height=${selectionBounds.height.toFixed(2)}`);

            switch (direction) {
                case "left":
                    // Align all objects to the leftmost point
                    let minLeft = Infinity;
                    objects.forEach(obj => {
                        const boundingRect = obj.getBoundingRect(true);
                        minLeft = Math.min(minLeft, boundingRect.left);
                    });
                    console.log(`[DEBUG] Found minimum left: ${minLeft.toFixed(2)}`);

                    objects.forEach(obj => {
                        const boundingRect = obj.getBoundingRect(true);
                        const objWidth = boundingRect.width;
                        const oldLeft = obj.left;
                        obj.set({
                            left: obj.left + (minLeft - boundingRect.left) + (objWidth / 2) - (obj.width * obj.scaleX / 2)
                        });
                        console.log(`[DEBUG] Moving object from left=${oldLeft.toFixed(2)} to left=${obj.left.toFixed(2)}`);
                    });
                    break;

                case "horizontalCenter":
                case "centerH":
                    // Align all objects to horizontal center of selection
                    const selectionCenterX = selectionBounds.left + selectionBounds.width / 2;
                    console.log(`[DEBUG] Selection center X: ${selectionCenterX.toFixed(2)}`);

                    objects.forEach(obj => {
                        const oldLeft = obj.left;
                        obj.set({
                            left: obj.left + (selectionCenterX - (obj.left + (obj.width * obj.scaleX / 2)))
                        });
                        console.log(`[DEBUG] Moving object from left=${oldLeft.toFixed(2)} to left=${obj.left.toFixed(2)}`);
                    });
                    break;

                case "right":
                    // Align all objects to the rightmost point
                    let maxRight = -Infinity;
                    objects.forEach(obj => {
                        const boundingRect = obj.getBoundingRect(true);
                        maxRight = Math.max(maxRight, boundingRect.left + boundingRect.width);
                    });
                    console.log(`[DEBUG] Found maximum right: ${maxRight.toFixed(2)}`);

                    objects.forEach(obj => {
                        const boundingRect = obj.getBoundingRect(true);
                        const objWidth = boundingRect.width;
                        const oldLeft = obj.left;
                        obj.set({
                            left: obj.left + (maxRight - (boundingRect.left + boundingRect.width)) + (obj.width * obj.scaleX / 2) - (objWidth / 2)
                        });
                        console.log(`[DEBUG] Moving object from left=${oldLeft.toFixed(2)} to left=${obj.left.toFixed(2)}`);
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
            console.log(`[DEBUG] Multiple object alignment completed for direction: ${direction}`);
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
            addHistoryState();
        },

        undo() {
            undoHistory();
        },

        redo() {
            redoHistory();
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
                // Initialize the canvas first - this creates window.canvas
                this.initCanvas();

                // Initialize the history manager
                initHistoryManager();

                // Set up responsive resizing after canvas initialization
                if (this.settings && typeof this.settings.setupResponsiveResizing === 'function') {
                    this.settings.setupResponsiveResizing();
                }

                // Dimension tracking for exports
                if (typeof this.initDimensionTracking === 'function') {
                    this.initDimensionTracking();
                }

                // Set up event listeners only after canvas is initialized
                this.setupCanvasEventListeners();

                // Initialize keyboard shortcuts for all functions
                this.initKeyboardShortcuts();

                // Fix for quick options bar alignment
                this.patchQuickOptionsBarAlignment();

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

        setupCanvasEventListeners() {
            // Make sure canvas exists before adding event listeners
            if (!window.canvas) {
                console.error("Cannot setup canvas event listeners: canvas is undefined");
                return;
            }

            // Now it's safe to add the event listeners
            window.canvas.on('object:added', function(e) {
                const obj = e.target;

                // Mark all objects as "don't scale me"
                obj._noScale = true;

                // If it's an image, ensure it's displayed at its natural size
                if (obj.type === 'image' && !obj._naturalSizeSet) {
                    const imgElement = obj._element;
                    if (imgElement) {
                        // Calculate the scale to show at natural size
                        const naturalScaleX = imgElement.naturalWidth / obj.width;
                        const naturalScaleY = imgElement.naturalHeight / obj.height;

                        // Apply the natural size scaling
                        obj.set({
                            scaleX: naturalScaleX,
                            scaleY: naturalScaleY,
                            _naturalSizeSet: true
                        });

                        // Update coordinates
                        obj.setCoords();
                        window.canvas.requestRenderAll();
                    }
                }
            });

            console.log("Canvas event listeners successfully initialized");
        },
        // Patch for quick options bar alignment functionality
        patchQuickOptionsBarAlignment() {
            try {
                // This patches the minified Ko function that handles alignment
                window.fixAlignment = function (type, object) {
                    console.log("[DEBUG] Quick options bar alignment called:", type);

                    if (!object || !window.canvas) return false;

                    // Store object state before alignment for debug
                    const originalLeft = object.left;
                    const originalTop = object.top;
                    const canvasWidth = window.canvas.width;
                    const canvasHeight = window.canvas.height;

                    // Disable object caching to ensure changes take effect
                    object.set('objectCaching', false);

                    // Handle different alignment types
                    switch (type) {
                        case "left":
                            object.set({left: 0});
                            break;
                        case "right":
                            object.set({left: canvasWidth - object.getScaledWidth()});
                            break;
                        case "centerH":
                            object.set({left: canvasWidth / 2});
                            break;
                        case "top":
                            object.set({top: 0});
                            break;
                        case "bottom":
                            object.set({top: canvasHeight - object.getScaledHeight()});
                            break;
                        case "centerV":
                            object.set({top: canvasHeight / 2});
                            break;
                    }

                    // Special handling for text objects to update textAlign if needed
                    if (object.type && (object.type.includes('text') || object.type === 'textbox')) {
                        if (type === "left") {
                            object.set('textAlign', 'left');
                            object.set('originX', 'left');
                        } else if (type === "centerH") {
                            object.set('textAlign', 'center');
                            object.set('originX', 'center');
                        } else if (type === "right") {
                            object.set('textAlign', 'right');
                            object.set('originX', 'right');
                        }

                        // Force dirty state to ensure rendering
                        object.dirty = true;
                    }

                    // Update coordinates and render
                    object.setCoords();
                    window.canvas.requestRenderAll();

                    console.log(`[DEBUG] Aligned object from left=${originalLeft.toFixed(2)}, top=${originalTop.toFixed(2)} to left=${object.left.toFixed(2)}, top=${object.top.toFixed(2)}`);
                    return true;
                };

                // Patch the page's click event for alignment buttons 
                if (typeof jQuery !== 'undefined') {
                    jQuery(document).off('click', '.quick-options-bar .alignment-btns .single-tool');
                    jQuery(document).on('click', '.quick-options-bar .alignment-btns .single-tool', function () {
                        let activeObject = window.canvas.getActiveObject();
                        let alignType = jQuery(this).attr('data-type') || jQuery(this).data('type');

                        if (!activeObject) return false;

                        // Call our fixed alignment function instead of Ko
                        window.fixAlignment(alignType, activeObject);

                        // Make sure the object is selected and canvas is updated
                        window.canvas.setActiveObject(activeObject);
                        window.canvas.requestRenderAll();

                        // Add to history if possible
                        if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                            window.fabricComponent.addToHistory();
                        }
                    });

                    console.log("[DEBUG] Quick options bar alignment patch applied");
                }
            } catch (error) {
                console.error("Error patching quick options bar alignment:", error);
            }
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

        // Update the initCanvas method in fabricComponent.js
        initCanvas() {
            try {
                // Get the canvas container element
                const canvasContainer = document.getElementById('canvas-container');
                if (!canvasContainer) {
                    console.error("Canvas container not found");
                    return;
                }

                // Default resolution for internal canvas (high quality exports)
                const defaultWidth = 1920;
                const defaultHeight = 1080;

                // Store export dimensions
                this.exportWidth = defaultWidth;
                this.exportHeight = defaultHeight;

                // Create canvas with high-resolution for exports
                const canvas = new fabric.Canvas("image-editor", {
                    preserveObjectStacking: true,
                    width: defaultWidth,
                    height: defaultHeight,
                    backgroundColor: "#ffffff",
                    enableRetinaScaling: true,
                    renderOnAddRemove: false,
                    selection: true,
                    selectionBorderColor: 'blue',
                    selectionColor: 'rgba(0, 0, 255, 0.3)',
                    selectionLineWidth: 2,
                });

                // Store canvas reference globally and in Alpine state
                window.canvas = canvas;
                this.canvas = canvas;
                window.fabricComponent = this;

                // Initialize settings component if not already initialized
                if (this.settings && typeof this.settings.init === 'function') {
                    // Settings will handle responsive resizing
                    console.log('Settings component will handle responsive sizing');
                } else {
                    // Use the settings component directly if available, or fallback
                    if (this.settings && typeof this.settings.setupResponsiveResizing === 'function') {
                        console.log('Using settings.setupResponsiveResizing()');
                        this.settings.setupResponsiveResizing();
                    } else {
                        // Fallback if settings component not available or not initialized
                        console.log('Using fallback responsive sizing');
                        this.setupResponsiveCanvas(defaultWidth, defaultHeight);
                    }
                }

                // Enable multi-selection via Shift or Ctrl key
                canvas.on('mouse:down', function (options) {
                    const isCtrlKey = options.e.ctrlKey || options.e.metaKey;
                    const isShiftKey = options.e.shiftKey;

                    if (isCtrlKey || isShiftKey) {
                        canvas.isSelection = true;
                    }
                });

                // Set up event listeners
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
                    this.centerAll();
                    canvas.requestRenderAll();
                }, 100);

                // Initialize the toolbar
                this.toolbar = toolbarComponent();
                if (this.toolbar && typeof this.toolbar.init === 'function') {
                    this.toolbar.init();
                }

                console.log("Canvas initialized successfully");

            } catch (error) {
                console.error("Error initializing canvas:", error);
            }
        },

// Add a fallback responsive canvas setup if settings component is not available
        setupResponsiveCanvas(width, height) {
            if (!window.canvas) return;

            const canvasContainer = document.getElementById('canvas-container');
            if (!canvasContainer) return;

            // Store the export dimensions
            this.exportWidth = width;
            this.exportHeight = height;

            // Calculate aspect ratio
            const ar = width / height;

            // Implement the manager's resize approach
            const resizeCanvas = () => {
                // Get container dimensions
                const windowWidth = canvasContainer.clientWidth;
                const windowHeight = canvasContainer.clientHeight;

                // Calculate new dimensions using manager's formula
                let newWidth = windowWidth / 1.5;
                let newHeight = newWidth / ar;

                if (newHeight > windowHeight) {
                    newHeight = windowHeight / 1.5;
                    newWidth = newHeight * ar;
                }

                // Apply dimensions
                window.canvas.setDimensions({
                    width: newWidth,
                    height: newHeight
                });

                // Also update CSS dimensions
                window.canvas.setDimensions({
                    width: newWidth + 'px',
                    height: newHeight + 'px'
                }, { cssOnly: true });

                window.canvas.renderAll();

                console.log(`Canvas resized to: ${newWidth.toFixed(0)}x${newHeight.toFixed(0)}`);
            };

            // Add resize event listener with debounce
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(resizeCanvas, 250);
            });

            // Initial call
            console.log('Initial canvas sizing with fallback method');
            resizeCanvas();
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

        // Keyboard shortcuts
        initKeyboardShortcuts() {
            // Remove any existing global event handlers to avoid duplicates
            document.removeEventListener('keydown', this.handleKeyDown);

            // Add a single, comprehensive keyboard shortcut handler
            document.addEventListener('keydown', this.handleKeyDown = (e) => {
                // Skip if we're in an input field or textarea
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    return;
                }

                // Skip if alt key is pressed (usually browser shortcuts)
                if (e.altKey) {
                    return;
                }

                // Get active canvas object
                const activeObject = window.canvas?.getActiveObject();

                // Undo: Ctrl+Z (Windows/Linux) or Command+Z (Mac)
                if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
                    e.preventDefault(); // Important to prevent browser's default undo
                    console.log('Undo triggered via keyboard');
                    undoHistory(); // Call the imported function
                    return;
                }

                // Redo: Ctrl+Shift+Z or Ctrl+Y (Windows/Linux) or Command+Shift+Z or Command+Y (Mac)
                if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
                    ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')) {
                    e.preventDefault(); // Important to prevent browser's default redo
                    console.log('Redo triggered via keyboard');
                    redoHistory(); // Call the imported function
                    return;
                }

                // Delete / Backspace key - FIXED CASE SENSITIVITY
                if ((e.key === 'Delete' || e.key === 'Backspace') && activeObject) {
                    e.preventDefault();

                    // If multiple objects are selected (check case-insensitive)
                    if (activeObject.type && activeObject.type.toLowerCase() === 'activeselection') {
                        // Get all objects in the selection
                        const objects = activeObject.getObjects();

                        // Remove the active selection first
                        window.canvas.discardActiveObject();

                        // Remove each object from the canvas
                        objects.forEach(obj => {
                            window.canvas.remove(obj);
                        });

                        window.canvas.requestRenderAll();
                        this.addToHistory();

                        console.log(`Deleted ${objects.length} objects with backspace/delete key`);
                    } else {
                        // Single object deletion
                        this.deleteObject();
                        window.canvas.requestRenderAll();
                    }
                }

                // Ctrl+C (Copy)
                if ((e.ctrlKey || e.metaKey) && e.key === 'c' && activeObject) {
                    e.preventDefault();
                    // Store object data as JSON
                    window._clipboard = {
                        type: activeObject.type,
                        json: activeObject.toJSON(['src', 'crossOrigin']),
                    };
                }

                // Ctrl+X (Cut)
                if ((e.ctrlKey || e.metaKey) && e.key === 'x' && activeObject) {
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
                if ((e.ctrlKey || e.metaKey) && e.key === 'v' && window._clipboard) {
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
                    } else if (window._clipboard.type === 'image') {
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
                    } else {
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