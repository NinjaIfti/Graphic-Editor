// src/components/masks.js - Clean version
import { FabricImage } from 'fabric';

export default function masksComponent() {
    return {
        // Gallery of available masks
        maskItems: [],
        selectedMask: null,
        cachedImageObject: null, // Cache the selected image

        init() {
            this.loadMasks();

            // Listen for selection events directly in this component
            if (window.canvas) {
                window.canvas.on('selection:created', (e) => {
                    if (e.selected && e.selected[0] && e.selected[0].type === 'image') {
                        this.cachedImageObject = e.selected[0];
                    }
                });

                window.canvas.on('selection:updated', (e) => {
                    if (e.selected && e.selected[0] && e.selected[0].type === 'image') {
                        this.cachedImageObject = e.selected[0];
                    } else {
                        // If selection changed to non-image, clear our cache
                        this.cachedImageObject = null;
                    }
                });

                window.canvas.on('selection:cleared', () => {
                    // Clear our cached object when selection is cleared
                    this.cachedImageObject = null;
                });
            }
        },

        applyMask(maskSrc) {
            if (!window.canvas) return;

            // Try to get the active object, fall back to our cached image if needed
            let targetObject = window.canvas.getActiveObject();

            // If no active object, use our cached image
            if (!targetObject && this.cachedImageObject) {
                targetObject = this.cachedImageObject;
                // Reselect it to make it the active object
                window.canvas.setActiveObject(targetObject);
            }

            // Final check if we have a valid image
            if (!targetObject || targetObject.type !== 'image') return;

            // Clear existing clipPath directly before loading the new mask
            targetObject.clipPath = null;
            window.canvas.requestRenderAll();

            // Create an image element to load the mask
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                try {
                    // Create a Fabric image from the loaded image
                    const mask = new FabricImage(img);

                    // Get image dimensions - use width and height, not scaled values
                    // This ensures we work with the actual image dimensions
                    const width = targetObject.getScaledWidth();
                    const height = targetObject.getScaledHeight();

                    // Determine which dimension to match (width or height)
                    // Based on which would preserve the mask's aspect ratio best
                    const maskAspectRatio = mask.width / mask.height;
                    const imageAspectRatio = width / height;

                    let scaleToUse;

                    if (maskAspectRatio > imageAspectRatio) {
                        // If mask is wider than image (proportionally), scale to height
                        scaleToUse = height / mask.height;
                    } else {
                        // If mask is taller than image (proportionally), scale to width
                        scaleToUse = width / mask.width;
                    }

                    // Apply the calculated scale uniformly
                    mask.scale(scaleToUse);

                    // Center the mask on the image
                    mask.set({
                        originX: 'center',
                        originY: 'center',
                        left: 0,
                        top: 0,
                        absolutePositioned: false,
                        inverted: false
                    });

                    // Apply the new clipPath
                    targetObject.clipPath = mask;

                    // Update canvas and save state
                    window.canvas.requestRenderAll();
                    window.fabricComponent.addToHistory();
                    this.selectedMask = maskSrc;
                } catch (error) {
                    // Silent error handling
                }
            };

            // Start loading the image
            img.src = maskSrc;
        },

        removeMask() {
            if (!window.canvas) return;

            // Try to get the active object, fall back to our cached image if needed
            let targetObject = window.canvas.getActiveObject();

            // If no active object, use our cached image
            if (!targetObject && this.cachedImageObject) {
                targetObject = this.cachedImageObject;
                // Reselect it to make it the active object
                window.canvas.setActiveObject(targetObject);
            }

            if (!targetObject) return;

            // Remove clipPath
            targetObject.clipPath = null;

            // Update canvas and save state
            window.canvas.requestRenderAll();
            window.fabricComponent.addToHistory();
            this.selectedMask = null;
        },

        loadMasks() {
            this.maskItems = [
                {id: 'mask1', name: 'Mask 1', src: './images/mask/1.svg'},
                {id: 'mask2', name: 'Mask 2', src: './images/mask/2.svg'},
                {id: 'mask3', name: 'Mask 3', src: './images/mask/3.svg'},
                {id: 'mask5', name: 'Mask 5', src: './images/mask/5.svg'}
            ];
        }
    };
}