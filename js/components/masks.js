// src/components/masks.js
import {FabricImage} from 'fabric';
import {addToHistory} from '../utils/history-manager';

export default function masksComponent() {
    return {
        // Gallery of available masks
        maskItems: [],
        selectedMask: null,

        applyMask(maskSrc) {
            if (!window.canvas) return;

            const activeObject = window.canvas.getActiveObject();
            if (!activeObject || !activeObject.type.includes('image')) return;

            FabricImage.fromURL(maskSrc, (mask) => {
                if (mask) { // Ensure mask loaded successfully
                    // Resize mask to match the active object dimensions
                    mask.scaleToWidth(activeObject.getScaledWidth());
                    mask.scaleToHeight(activeObject.getScaledHeight());

                    // Position mask relative to the active object
                    mask.set({
                        originX: 'center',
                        originY: 'center',
                        left: activeObject.left,
                        top: activeObject.top,
                    });

                    // Apply mask as clipPath
                    activeObject.clipPath = mask;

                    // Update canvas
                    window.canvas.requestRenderAll();

                    // Add to history
                    if (typeof addToHistory === 'function') {
                        addToHistory();
                    }

                    // Save reference to selected mask
                    this.selectedMask = maskSrc;
                } else {
                    console.error('Failed to load mask from:', maskSrc);
                }
            }, {
                crossOrigin: 'anonymous', // Handle CORS if needed
            });
        },

        // Remove currently applied mask
        removeMask() {
            if (!window.canvas) return;

            const activeObject = window.canvas.getActiveObject();
            if (!activeObject) return;

            // Remove clip path
            activeObject.clipPath = null;

            // Update canvas
            window.canvas.requestRenderAll();

            // Add to history
            if (typeof addToHistory === 'function') {
                addToHistory();
            }

            // Clear selected mask
            this.selectedMask = null;
        },

        // Load available masks
        loadMasks() {
            // Here you would typically load mask items from your database or API
            // This is just a placeholder implementation
            this.maskItems = [
                {id: 'circle', name: 'Circle', src: '/masks/circle.png'},
                {id: 'square', name: 'Square', src: '/masks/square.png'},
                {id: 'heart', name: 'Heart', src: '/masks/heart.png'}
            ];
        }
    }
}
