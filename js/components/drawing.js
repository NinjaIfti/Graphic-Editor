import { EraserBrush } from '@erase2d/fabric';
import { addToHistory, undo as globalUndo, redo as globalRedo } from '../utils/history-manager';

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
        
        // Simple operation flags
        _erasingInProgress: false,
        _historyOperationInProgress: false,
        _lastUndoTime: 0, // Track last undo time for throttling
        _pendingUndo: false, // Track if we have a pending undo operation

        init() {
            this.$nextTick(() => {
                if (window.canvas) {
                    this.isActive = this.$parent.activeTool === "drawing";
                    if (this.isActive) {
                        this.activateDrawingMode();
                    }

                    // Initial history state
                    setTimeout(() => {
                        addToHistory();
                        console.log("Initial drawing state saved to history");
                    }, 500);
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

            // Setup canvas events
            this.setupCanvasEvents();
            
            // Listen for history operations
            document.addEventListener('history:operation:start', () => {
                this._historyOperationInProgress = true;
                console.log("History operation started");
            });
            
            document.addEventListener('history:operation:end', () => {
                setTimeout(() => {
                    this._historyOperationInProgress = false;
                    console.log("History operation ended");
                    
                    // Reactivate drawing mode if needed
                    if (this.isActive) {
                        this.updateDrawingMode(this.activeTab);
                    }
                }, 50);
            });
            
            // Make this component accessible to the window for debugging
            window.drawingComponent = this;
        },

        // Set up canvas events for drawing operations
        setupCanvasEvents() {
            if (!window.canvas) return;

            // Clean up any existing event handlers
            window.canvas.off("path:created");
            window.canvas.off("object:added");
            window.canvas.off("erasing:start");
            window.canvas.off("erasing:end");

            // Handle path creation (drawing) - simple event tracking
            window.canvas.on("path:created", () => {
                // Don't save if this is part of an eraser operation or history operation
                if (this._erasingInProgress || this._historyOperationInProgress) {
                    return;
                }
                
                console.log("Path created, saving to history");
                // Simple delay to allow canvas to update
                setTimeout(() => {
                    addToHistory();
                }, 50);
            });

            // Track eraser operations
            window.canvas.on("erasing:start", () => {
                if (this._historyOperationInProgress) return;
                
                this._erasingInProgress = true;
                
                // Save state before erasing
                console.log("Eraser operation started, saving pre-erase state");
                addToHistory();
            });

            window.canvas.on("erasing:end", () => {
                if (this._historyOperationInProgress) return;
                
                // Add erased state to history after a brief delay
                setTimeout(() => {
                    if (this._erasingInProgress) {
                        this._erasingInProgress = false;
                        console.log("Eraser operation ended, saving post-erase state");
                        addToHistory();
                    }
                }, 100);
            });
        },

        // Activate drawing mode
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

            // Deactivate current mode
            this.deactivateDrawingMode();
            
            // Update active tab
            this.activeTab = tabName;

            // Set up the requested tool
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

        // Set up brush
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

                // Reset flags
                this._erasingInProgress = false;

                window.canvas.freeDrawingBrush = brush;
                window.canvas.isDrawingMode = true;
            } catch (error) {
                console.error("Error setting up brush:", error);
            }
        },

        // Set up eraser
        setupEraser() {
            if (!window.canvas) return;

            try {
                // Reset flags
                this._erasingInProgress = false;

                // Make all path objects erasable
                window.canvas.forEachObject(function(obj) {
                    if (obj.type === 'path') {
                        obj.set('erasable', true);
                    } else {
                        obj.set('erasable', false);
                    }
                });
                window.canvas.requestRenderAll();

                // Create eraser brush
                const eraserBrush = new EraserBrush(window.canvas);
                eraserBrush.width = parseInt(this.eraserSettings.size);
                eraserBrush.inverted = this.eraserSettings.invert;

                // Handle eraser commit
                eraserBrush.on('end', async (e) => {
                    if (!e.detail) return;
                    
                    const { path, targets } = e.detail;
                    
                    // Only commit if we have targets
                    if (targets && targets.length > 0) {
                        await eraserBrush.commit({ path, targets });
                        window.canvas.requestRenderAll();
                        console.log("Erased", targets.length, "objects");
                    }
                });

                // Set as active brush
                window.canvas.freeDrawingBrush = eraserBrush;
                window.canvas.isDrawingMode = true;
            } catch (error) {
                console.error("Error setting up eraser:", error);
            }
        },

        // Deactivate drawing mode
        deactivateDrawingMode() {
            if (!window.canvas) return;
            
            window.canvas.isDrawingMode = false;
            this._erasingInProgress = false;
        },

        // Set up pencil with different brush types
        setupPencil() {
            if (!window.canvas) return;

            try {
                // Reset flags
                this._erasingInProgress = false;
                
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

        // Use global undo function with throttling
        undo() {
            const now = Date.now();
            
            // If an operation is already in progress or we're throttling, queue it
            if (this._historyOperationInProgress || (now - this._lastUndoTime < 300)) {
                if (!this._pendingUndo) {
                    console.log("Throttling undo operation");
                    this._pendingUndo = true;
                    
                    // Try again after a delay
                    setTimeout(() => {
                        this._pendingUndo = false;
                        this.undo();
                    }, 350);
                }
                return;
            }
            
            // Update timestamp and flag
            this._lastUndoTime = now;
            this._historyOperationInProgress = true;
            console.log("Drawing undo requested");
            
            try {
                globalUndo();
            } catch (err) {
                console.error("Error during undo:", err);
            }
            
            // Clear operation flag after a delay
            setTimeout(() => {
                this._historyOperationInProgress = false;
            }, 300);
        },

        // Use global redo function with throttling
        redo() {
            const now = Date.now();
            
            // If an operation is already in progress or we're throttling, ignore
            if (this._historyOperationInProgress || (now - this._lastUndoTime < 300)) {
                if (!this._pendingUndo) {
                    console.log("Throttling redo operation");
                    this._pendingUndo = true;
                    
                    // Try again after a delay
                    setTimeout(() => {
                        this._pendingUndo = false;
                        this.redo();
                    }, 350);
                }
                return;
            }
            
            // Update timestamp and flag
            this._lastUndoTime = now;
            this._historyOperationInProgress = true;
            console.log("Drawing redo requested");
            
            try {
                globalRedo();
            } catch (err) {
                console.error("Error during redo:", err);
            }
            
            // Clear operation flag after a delay
            setTimeout(() => {
                this._historyOperationInProgress = false;
            }, 300);
        },

        // Brush utilities
        updateBrushOpacity(opacity) {
            this.brushSettings.opacity = opacity;
            this.setupBrush();
        },

        updateBrushSize(size) {
            if (this.activeTab === 'brush') {
                this.brushSettings.size = size;
            } else if (this.activeTab === 'eraser') {
                this.eraserSettings.size = size;
            } else if (this.activeTab === 'pencil') {
                this.pencilSettings.size = size;
            }
            this.updateDrawingMode(this.activeTab);
        },

        updateBrushColor(color) {
            if (this.activeTab === 'brush') {
                this.brushSettings.color = color;
            } else if (this.activeTab === 'pencil') {
                this.pencilSettings.color = color;
            }
            this.updateDrawingMode(this.activeTab);
        },

        // Toggle pencil dropdown
        togglePencilDropdown() {
            this.pencilDropdownOpen = !this.pencilDropdownOpen;
        },

        // Change pencil type
        changePencilType(type) {
            this.pencilSettings.brushType = type;
            this.setupPencil();
            this.pencilDropdownOpen = false;
        }
    };
}
