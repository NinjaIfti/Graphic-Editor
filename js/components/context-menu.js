// src/components/contextMenu.js
export default function contextMenuComponent() {
    return {
        isOpen: false,
        posX: 0,
        posY: 0,
        isLocked: false,
        isGrouped: false,

        // Initialize context menu
        init() {
            // Wait for DOM to be fully ready
            setTimeout(() => {
                this.setupEventListeners();
            }, 500);
        },

        setupEventListeners() {
            // Get the canvas element
            let canvasEl = document.getElementById('image-editor');

            if (!canvasEl) {
                const canvases = document.getElementsByTagName('canvas');
                if (canvases.length > 0) {
                    canvasEl = canvases[0];
                }
            }

            if (!canvasEl) {
                return;
            }

            // Bind the mousedown event - using function for proper 'this' binding
            const handleMouseDownBound = (e) => this.handleMouseDown(e);
            canvasEl.addEventListener('mousedown', handleMouseDownBound);

            // Get the canvas container for additional event binding
            const canvasContainer = canvasEl.parentElement;
            if (canvasContainer) {
                canvasContainer.addEventListener('mousedown', handleMouseDownBound);
            }

            // Block ALL contextmenu events on canvas and container to prevent browser menu
            const preventContextMenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            };

            canvasEl.addEventListener('contextmenu', preventContextMenu, false);

            if (canvasContainer) {
                canvasContainer.addEventListener('contextmenu', preventContextMenu, false);
            }

            // Also add event listener directly to the document to block contextmenu globally
            document.addEventListener('contextmenu', (e) => {
                // Check if event is on canvas
                const path = e.composedPath();
                const isOnCanvas = path.includes(canvasEl);

                // If it's on canvas, prevent the default context menu
                if (isOnCanvas) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }, false);
        },

        handleMouseDown(e) {
            // Ensure the default browser context menu is prevented for right clicks
            if (e.button === 2) {
                e.preventDefault();
                e.stopPropagation();

                // Only proceed if canvas is available
                if (!window.canvas) {
                    return;
                }

                // Get the pointer position in canvas coordinates
                const pointer = window.canvas.getPointer(e);

                // Find object under pointer
                const objects = window.canvas.getObjects();
                let clickedObject = null;

                // Iterate backwards to find topmost object first
                for (let i = objects.length - 1; i >= 0; i--) {
                    if (objects[i].containsPoint(pointer)) {
                        clickedObject = objects[i];
                        break;
                    }
                }

                if (clickedObject) {
                    // Select the object
                    window.canvas.setActiveObject(clickedObject);
                    window.canvas.requestRenderAll();

                    // Update menu state based on object
                    this.isLocked = clickedObject.lockMovementX &&
                        clickedObject.lockMovementY;
                    this.isGrouped = clickedObject.type === 'group';

                    // Open context menu
                    this.open(e.clientX, e.clientY);
                }

                return false;
            }
        },

        open(x, y) {
            this.posX = x;
            this.posY = y;
            this.isOpen = true;

            // Instead of $nextTick, use setTimeout
            setTimeout(() => {
                // Find and adjust the context menu element if needed
                const menu = document.querySelector('[x-show="contextMenu.isOpen"]');
                if (menu) {
                    // Ensure highest z-index
                    menu.style.zIndex = '99999999';

                    // Check viewport boundaries
                    const rect = menu.getBoundingClientRect();
                    const viewport = {
                        width: window.innerWidth,
                        height: window.innerHeight
                    };

                    if (rect.right > viewport.width) {
                        this.posX = viewport.width - rect.width - 10;
                    }

                    if (rect.bottom > viewport.height) {
                        this.posY = viewport.height - rect.height - 10;
                    }
                }
            }, 0);
        },

        close() {
            this.isOpen = false;
        },

        handleAction(action) {
            if (!window.canvas) {
                return;
            }

            const activeObject = window.canvas.getActiveObject();
            if (!activeObject) {
                return;
            }

            if (action === 'bringForward') {
                window.canvas.bringForward(activeObject);
                window.canvas.requestRenderAll();
            } else if (action === 'sendBackwards') {
                window.canvas.sendBackwards(activeObject);
                window.canvas.requestRenderAll();
            } else if (action === 'delete') {
                window.canvas.remove(activeObject);
                window.canvas.requestRenderAll();
            }

            // Add to history if available
            if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                window.fabricComponent.addToHistory();
            }

            this.close();
        },

        toggleLock() {
            if (!window.canvas) {
                return;
            }

            const activeObject = window.canvas.getActiveObject();
            if (!activeObject) {
                return;
            }

            this.isLocked = !this.isLocked;

            activeObject.set({
                lockMovementX: this.isLocked,
                lockMovementY: this.isLocked,
                lockRotation: this.isLocked,
                lockScalingX: this.isLocked,
                lockScalingY: this.isLocked
            });

            window.canvas.requestRenderAll();

            // Add to history if available
            if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                window.fabricComponent.addToHistory();
            }

            this.close();
        },

        toggleGroup() {
            if (!window.canvas) {
                return;
            }

            const activeObject = window.canvas.getActiveObject();
            if (!activeObject) {
                return;
            }

            if (activeObject.type === 'activeSelection') {
                activeObject.toGroup();
                this.isGrouped = true;
            } else if (activeObject.type === 'group') {
                activeObject.toActiveSelection();
                this.isGrouped = false;
            }

            window.canvas.requestRenderAll();

            // Add to history if available
            if (window.fabricComponent && typeof window.fabricComponent.addToHistory === 'function') {
                window.fabricComponent.addToHistory();
            }

            this.close();
        }
    }
}