// src/components/masks.js - Improved version with better scaling and debug logs
import { FabricImage } from 'fabric';

export default function masksComponent() {
    return {
        // Gallery of available masks
        maskItems: [],
        selectedMask: null,
        cachedImageObject: null, // Cache the selected image

        init() {
            this.loadMasks();
            console.log('[MASK] Component initialized');

            // Listen for selection events directly in this component
            if (window.canvas) {
                window.canvas.on('selection:created', (e) => {
                    if (e.selected && e.selected[0] && e.selected[0].type === 'image') {
                        this.cachedImageObject = e.selected[0];
                        console.log('[MASK] Image selected:', {
                            width: e.selected[0].width,
                            height: e.selected[0].height,
                            scaleX: e.selected[0].scaleX,
                            scaleY: e.selected[0].scaleY,
                            scaledWidth: e.selected[0].getScaledWidth(),
                            scaledHeight: e.selected[0].getScaledHeight()
                        });
                    }
                });

                window.canvas.on('selection:updated', (e) => {
                    if (e.selected && e.selected[0] && e.selected[0].type === 'image') {
                        this.cachedImageObject = e.selected[0];
                        console.log('[MASK] Image selection updated:', {
                            width: e.selected[0].width,
                            height: e.selected[0].height,
                            scaleX: e.selected[0].scaleX,
                            scaleY: e.selected[0].scaleY,
                            scaledWidth: e.selected[0].getScaledWidth(),
                            scaledHeight: e.selected[0].getScaledHeight()
                        });
                    } else {
                        // If selection changed to non-image, clear our cache
                        this.cachedImageObject = null;
                        console.log('[MASK] Selection changed to non-image, clearing cache');
                    }
                });

                window.canvas.on('selection:cleared', () => {
                    // Clear our cached object when selection is cleared
                    this.cachedImageObject = null;
                    console.log('[MASK] Selection cleared, cache reset');
                });
            } else {
                console.warn('[MASK] Canvas not initialized yet');
            }
        },

        applyMask(maskSrc) {
            if (!window.canvas) {
                console.error('[MASK] Canvas not available');
                return;
            }

            console.log('[MASK] Applying mask:', maskSrc);

            // Try to get the active object, fall back to our cached image if needed
            let targetObject = window.canvas.getActiveObject();

            // If no active object, use our cached image
            if (!targetObject && this.cachedImageObject) {
                targetObject = this.cachedImageObject;
                // Reselect it to make it the active object
                window.canvas.setActiveObject(targetObject);
                console.log('[MASK] Using cached image object');
            }

            // Final check if we have a valid image
            if (!targetObject || targetObject.type !== 'image') {
                console.error('[MASK] No valid image selected');
                return;
            }

            console.log('[MASK] Target image dimensions:', {
                original: { width: targetObject.width, height: targetObject.height },
                scale: { x: targetObject.scaleX, y: targetObject.scaleY },
                scaled: { width: targetObject.getScaledWidth(), height: targetObject.getScaledHeight() },
                display: { width: targetObject.width * targetObject.scaleX, height: targetObject.height * targetObject.scaleY }
            });

            // Clear existing clipPath directly before loading the new mask
            targetObject.clipPath = null;
            window.canvas.requestRenderAll();

            // Create an image element to load the mask
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                try {
                    console.log('[MASK] Mask loaded:', {
                        width: img.width,
                        height: img.height,
                        src: maskSrc
                    });

                    // Create a Fabric image from the loaded image
                    const mask = new FabricImage(img);

                    // IMPORTANT: Always use the original dimensions (not scaled)
                    // This ensures consistent behavior across different image sizes
                    const imageWidth = targetObject.width;
                    const imageHeight = targetObject.height;

                    console.log('[MASK] Working with original dimensions:', {
                        imageWidth,
                        imageHeight,
                        maskWidth: mask.width,
                        maskHeight: mask.height
                    });

                    // Calculate the scale factors
                    const scaleX = imageWidth / mask.width;
                    const scaleY = imageHeight / mask.height;

                    // Use the larger scale to ensure full coverage
                    const scaleFactor = Math.max(scaleX, scaleY);

                    console.log('[MASK] Calculated scale factors:', {
                        scaleX,
                        scaleY,
                    });

                    // Apply scaling to mask - use the exact dimensions, not the max
                    mask.scaleX = scaleX;
                    mask.scaleY = scaleY;
                    // Center the mask on the image
                    mask.set({
                        originX: 'center',
                        originY: 'center',
                        left: 0,
                        top: 0,
                        absolutePositioned: false,
                        inverted: false
                    });

                    console.log('[MASK] Final mask properties:', {
                        scaleX: mask.scaleX,
                        scaleY: mask.scaleY,
                        width: mask.width * mask.scaleX,
                        height: mask.height * mask.scaleY,
                        left: mask.left,
                        top: mask.top
                    });

                    // Apply the new clipPath
                    targetObject.clipPath = mask;

                    // Update canvas and save state
                    window.canvas.requestRenderAll();
                    window.fabricComponent.addToHistory();
                    this.selectedMask = maskSrc;

                    console.log('[MASK] Mask applied successfully');
                } catch (error) {
                    console.error('[MASK] Error applying mask:', error);
                }
            };

            img.onerror = (err) => {
                console.error('[MASK] Failed to load mask image:', err);
            };

            // Start loading the image
            img.src = maskSrc;
        },

        removeMask() {
            if (!window.canvas) {
                console.error('[MASK] Canvas not available');
                return;
            }

            console.log('[MASK] Removing mask');

            // Try to get the active object, fall back to our cached image if needed
            let targetObject = window.canvas.getActiveObject();

            // If no active object, use our cached image
            if (!targetObject && this.cachedImageObject) {
                targetObject = this.cachedImageObject;
                // Reselect it to make it the active object
                window.canvas.setActiveObject(targetObject);
                console.log('[MASK] Using cached image for mask removal');
            }

            if (!targetObject) {
                console.error('[MASK] No target object found for mask removal');
                return;
            }

            // Remove clipPath
            targetObject.clipPath = null;

            // Update canvas and save state
            window.canvas.requestRenderAll();
            window.fabricComponent.addToHistory();
            this.selectedMask = null;
            console.log('[MASK] Mask removed successfully');
        },

        loadMasks() {
            this.maskItems = [
                {id: 'mask1', name: 'Mask 1', src: './images/mask/1.svg'},
                {id: 'mask2', name: 'Mask 2', src: './images/mask/2.svg'},
                {id: 'mask3', name: 'Mask 3', src: './images/mask/3.svg'},
                {id: 'mask5', name: 'Mask 5', src: './images/mask/5.svg'}
            ];
            console.log('[MASK] Mask items loaded:', this.maskItems.length);
        }
    };
}