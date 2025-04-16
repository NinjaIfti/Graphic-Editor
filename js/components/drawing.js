import { EraserBrush } from '@erase2d/fabric';
export default function drawingComponent() {
    return {
        isActive: false,
        activeTab: "brush",

        // Brush settings
        brushSettings: {
            size: 20,
            opacity: 1,
            color: "#264653",
        },

        // Eraser settings
        eraserSettings: {
            size: 20,
            invert: false,
        },

        // Pencil settings
        pencilSettings: {
            brushType: "Pencil",
            size: 20,
            shadowWidth: 0,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            color: "#333333",
            shadowColor: "#000000",
        },

        pencilDropdownOpen: false,

        // Canvas history settings
        canvasHistory: [],
        historyIndex: -1,
        maxHistorySteps: 20,

        init() {
            this.$nextTick(() => {
                if (window.canvas) {
                    this.isActive = this.$parent.activeTool === "drawing";
                    if (this.isActive) {
                        this.activateDrawingMode();
                    }
                }
            });

            // Add watchers for settings changes
            this.$watch('brushSettings', () => {
                if (this.isActive && this.activeTab === 'brush') {
                    this.setupBrush();
                }
            }, { deep: true });

            this.$watch('eraserSettings', () => {
                if (this.isActive && this.activeTab === 'eraser') {
                    this.setupEraser();
                }
            }, { deep: true });

            this.$watch('pencilSettings', () => {
                if (this.isActive && this.activeTab === 'pencil') {
                    this.setupPencil();
                }
            }, { deep: true });

            // Add tab change listener
            this.$watch('activeTab', (newTab) => {
                if (this.isActive) {
                    this.updateDrawingMode(newTab);
                }
            });

            // Setup canvas history events
            this.setupCanvasHistory();
        },

        // Setup canvas history tracking
        setupCanvasHistory() {
            if (!window.canvas) return;

            // Save initial state
            this.saveCanvasState();

            // Add event listener for object modifications
            window.canvas.on("object:added", () => this.saveCanvasState());
            window.canvas.on("object:modified", () => this.saveCanvasState());
            window.canvas.on("object:removed", () => this.saveCanvasState());
        },

        // Save current canvas state
        saveCanvasState() {
            if (!window.canvas) return;

            if (this._applyingHistory) return;

            try {
                // Get JSON representation of canvas
                const json = window.canvas.toJSON();

                if (this.historyIndex < this.canvasHistory.length - 1) {
                    this.canvasHistory = this.canvasHistory.slice(0, this.historyIndex + 1);
                }

                this.canvasHistory.push(json);

                if (this.canvasHistory.length > this.maxHistorySteps) {
                    this.canvasHistory.shift();
                } else {
                    this.historyIndex++;
                }
            } catch (error) {
                console.error("Error saving canvas state:", error);
            }
        },

        // Undo last action
        undo() {
            if (this.historyIndex <= 0) return;
            this.historyIndex--;
            this.applyCanvasState(this.canvasHistory[this.historyIndex]);
        },

        // Redo last undone action
        redo() {
            if (this.historyIndex >= this.canvasHistory.length - 1) return;
            this.historyIndex++;
            this.applyCanvasState(this.canvasHistory[this.historyIndex]);
        },

        // Apply a saved canvas state
        applyCanvasState(state) {
            if (!window.canvas) return;

            try {
                this._applyingHistory = true;
                window.canvas.loadFromJSON(state, () => {
                    window.canvas.renderAll();
                    this._applyingHistory = false;
                });
            } catch (error) {
                console.error("Error applying canvas state:", error);
                this._applyingHistory = false;
            }
        },

        // Update brush preview (UI only)
        updateBrushPreview() {
            if (this.isActive) {
                this.updateDrawingMode(this.activeTab);
            }
        },

        // Activate drawing mode on the canvas
        activateDrawingMode() {
            if (!window.canvas) {
                console.error("Canvas not found!");
                return;
            }

            window.canvas.isDrawingMode = true;
            this.updateDrawingMode(this.activeTab);
        },

        // Update drawing mode based on active tab
        updateDrawingMode(tabName) {
            if (!window.canvas) {
                console.error("Canvas not found when updating drawing mode");
                return;
            }

            this.deactivateDrawingMode();

            this.activeTab = tabName;

            switch (tabName) {
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

            try {
                const brush = new fabric.PencilBrush(window.canvas);
                brush.width = parseInt(this.brushSettings.size);
                const opacity = parseFloat(this.brushSettings.opacity);

                if (opacity < 1) {
                    const hex = this.brushSettings.color.replace("#", "");
                    const r = parseInt(hex.substring(0, 2), 16);
                    const g = parseInt(hex.substring(2, 4), 16);
                    const b = parseInt(hex.substring(4, 6), 16);
                    brush.color = `rgba(${r}, ${g}, ${b}, ${opacity})`;
                } else {
                    brush.color = this.brushSettings.color;
                }

                window.canvas.freeDrawingBrush = brush;
                window.canvas.isDrawingMode = true;
            } catch (error) {
                console.error("Error setting up brush:", error);
            }
        },


        setupEraser() {
            if (!window.canvas) return;

            try {
                // Set erasable property based on object type
                window.canvas.forEachObject(function(obj) {
                    // Only make paths erasable, not text or images
                    if (obj.type === 'path') {
                        obj.set('erasable', true);
                    } else {
                        obj.set('erasable', false);
                    }
                });
                window.canvas.requestRenderAll();

                // Create an instance of EraserBrush
                const eraserBrush = new EraserBrush(window.canvas);

                // Set brush size
                eraserBrush.width = parseInt(this.eraserSettings.size);

                // Set inverted mode if needed
                eraserBrush.inverted = this.eraserSettings.invert;

                // Listen for the end event to commit changes
                eraserBrush.on('end', async (e) => {
                    const { path, targets } = e.detail;
                    await eraserBrush.commit({ path, targets });
                    window.canvas.requestRenderAll();
                });

                // Set as active brush
                window.canvas.freeDrawingBrush = eraserBrush;
                window.canvas.isDrawingMode = true;
            } catch (error) {
                console.error("Error setting up eraser brush:", error);

                // Fallback implementation if needed
            }
        },

        // Clean up when switching tools
        deactivateDrawingMode() {
            if (!window.canvas) return;

            window.canvas.isDrawingMode = false;

            // If the current brush is our eraser, reset it
            if (window.canvas.freeDrawingBrush && window.canvas.freeDrawingBrush.type === "eraser") {
                // Nothing special needed here since we're modifying the instance, not the prototype
            }
        },

        // Setup pencil with different brush types
        setupPencil() {
            if (!window.canvas) return;

            try {
                let brush;
                const brushType = this.pencilSettings.brushType;
                const size = parseInt(this.pencilSettings.size);
                const color = this.pencilSettings.color;

                switch (brushType) {
                    case "Circle":
                        brush = new fabric.CircleBrush(window.canvas);
                        break;
                    case "Spray":
                        brush = new fabric.SprayBrush(window.canvas);
                        break;
                    case "hLine":
                    case "vLine":
                    case "square":
                    case "diamond":
                    case "texture":
                        brush = new fabric.PatternBrush(window.canvas);
                        brush.getPatternSrc = () => {
                            const patternCanvas = document.createElement("canvas");
                            const ctx = patternCanvas.getContext("2d");
                            patternCanvas.width = patternCanvas.height = 10;
                            ctx.fillStyle = color;

                            switch (brushType) {
                                case "hLine":
                                    ctx.fillRect(0, 5, 10, 1);
                                    break;
                                case "vLine":
                                    ctx.fillRect(5, 0, 1, 10);
                                    break;
                                case "square":
                                    ctx.fillRect(2, 2, 6, 6);
                                    break;
                                case "diamond":
                                    ctx.beginPath();
                                    ctx.moveTo(5, 0);
                                    ctx.lineTo(10, 5);
                                    ctx.lineTo(5, 10);
                                    ctx.lineTo(0, 5);
                                    ctx.closePath();
                                    ctx.fill();
                                    break;
                                case "texture":
                                    ctx.fillRect(1, 1, 2, 2);
                                    ctx.fillRect(6, 6, 2, 2);
                                    break;
                            }

                            return patternCanvas;
                        };
                        break;
                    default:
                        brush = new fabric.PencilBrush(window.canvas);
                }

                brush.width = size;
                brush.color = color;

                if (parseInt(this.pencilSettings.shadowWidth) > 0) {
                    brush.shadow = new fabric.Shadow({
                        blur: parseInt(this.pencilSettings.shadowWidth),
                        offsetX: parseInt(this.pencilSettings.shadowOffsetX),
                        offsetY: parseInt(this.pencilSettings.shadowOffsetY),
                        color: this.pencilSettings.shadowColor,
                    });
                }

                window.canvas.freeDrawingBrush = brush;
                window.canvas.isDrawingMode = true;
            } catch (error) {
                console.error("Error setting up pencil:", error);
            }
        },

        // Update brush opacity (fix for the missing function issue)
        updateBrushOpacity(opacity) {
            if (this.activeTab === 'brush') {
                this.brushSettings.opacity = parseFloat(opacity);
                this.setupBrush();
            }
        },

        // Update brush size
        updateBrushSize(size) {
            if (this.activeTab === 'brush') {
                this.brushSettings.size = parseInt(size);
                this.setupBrush();
            } else if (this.activeTab === 'pencil') {
                this.pencilSettings.size = parseInt(size);
                this.setupPencil();
            }
        },

        // Update brush color
        updateBrushColor(color) {
            if (this.activeTab === 'brush') {
                this.brushSettings.color = color;
                this.setupBrush();
            } else if (this.activeTab === 'pencil') {
                this.pencilSettings.color = color;
                this.setupPencil();
            }
        },

        // Toggle pencil dropdown
        togglePencilDropdown() {
            this.pencilDropdownOpen = !this.pencilDropdownOpen;
        },

        // Change pencil type
        changePencilType(type) {
            this.pencilSettings.brushType = type;
            if (this.activeTab === 'pencil') {
                this.setupPencil();
            }
        },
    };
}
