// src/components/fabric/contextMenu.js
export default function contextMenuComponent() {
    return {

        isOpen: false,
        posX: 0,
        posY: 0,
        isLocked: false,
        isGrouped: false,

        open(x, y) {
            this.posX = x;
            this.posY = y;
            this.isOpen = true;
        },

        close() {
            this.isOpen = false;
        },

        handleAction(action) {
            if (action === 'bringForward') {
                if (window.canvas) {
                    const activeObject = window.canvas.getActiveObject();
                    if (activeObject) {
                        window.canvas.bringObjectForward(activeObject);
                        window.canvas.requestRenderAll();
                    }
                }
            } else if (action === 'sendBackwards') {
                if (window.canvas) {
                    const activeObject = window.canvas.getActiveObject();
                    if (activeObject) {
                        window.canvas.sendObjectBackward(activeObject);
                        window.canvas.requestRenderAll();
                    }
                }
            } else if (action === 'delete') {
                if (window.canvas) {
                    const activeObject = window.canvas.getActiveObject();
                    if (activeObject) {
                        window.canvas.remove(activeObject);
                        window.canvas.requestRenderAll();
                    }
                }
            }
            this.close();
        },

        toggleLock() {
            this.isLocked = !this.isLocked;
            // Implement locking functionality
            this.close();
        },

        toggleGroup() {
            this.isGrouped = !this.isGrouped;
            // Implement grouping functionality
            this.close();
        }
    }
}