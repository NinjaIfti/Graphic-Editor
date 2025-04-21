<<<<<<< HEAD
// src/components/masks.js - SVG Overlay Approach
import { FabricImage } from "fabric";
=======
// src/components/masks.js - Improved version with better scaling and debug logs
import { FabricImage } from 'fabric';
>>>>>>> 6a6a3e681486f79407f03727bc449fd42ddd3760

export default function masksComponent() {
  return {
    // Gallery of available masks
    maskItems: [],
    selectedMask: null,
    cachedImageObject: null, // Cache the selected image
    svgMaskTemplates: {
      // Basic circle mask
      mask1: '<circle cx="50%" cy="50%" r="50%" fill="black" />',
      // Arrow mask
      mask2:
        '<polygon points="50,0 100,50 75,50 75,100 25,100 25,50 0,50" fill="black" />',
      // Triangle mask
      mask3: '<polygon points="50,0 100,100 0,100" fill="black" />',
      // Square mask with rounded corners
      mask5:
        '<rect x="0" y="0" width="100%" height="100%" rx="10" ry="10" fill="black" />',
    },

<<<<<<< HEAD
    init() {
      this.loadMasks();

      // Listen for selection events directly in this component
      if (window.canvas) {
        window.canvas.on("selection:created", (e) => {
          if (e.selected && e.selected[0] && e.selected[0].type === "image") {
            this.cachedImageObject = e.selected[0];
          }
        });

        window.canvas.on("selection:updated", (e) => {
          if (e.selected && e.selected[0] && e.selected[0].type === "image") {
            this.cachedImageObject = e.selected[0];
          } else {
            // If selection changed to non-image, clear our cache
            this.cachedImageObject = null;
          }
        });

        window.canvas.on("selection:cleared", () => {
          // Clear our cached object when selection is cleared
          this.cachedImageObject = null;
        });
      }
    },

    applyMask(maskSrc) {
      if (!window.canvas) {
        console.log("Canvas not available");
        return;
      }
=======
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
>>>>>>> 6a6a3e681486f79407f03727bc449fd42ddd3760

      // Try to get the active object, fall back to our cached image if needed
      let targetObject = window.canvas.getActiveObject();
      console.log("Initial target object:", targetObject);

<<<<<<< HEAD
      // If no active object, use our cached image
      if (!targetObject && this.cachedImageObject) {
        targetObject = this.cachedImageObject;
        // Reselect it to make it the active object
        window.canvas.setActiveObject(targetObject);
        console.log("Using cached image object:", this.cachedImageObject);
      }

      // Final check if we have a valid image
      if (!targetObject || targetObject.type !== "image") {
        console.log("No valid image target found");
        return;
      }
=======
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
>>>>>>> 6a6a3e681486f79407f03727bc449fd42ddd3760

      console.log("Target object found:", targetObject);

      // Extract the mask ID from the path
      // The paths are like './images/mask/1.svg', './images/mask/2.svg', etc.
      const filename = maskSrc.split("/").pop();
      const maskId = "mask" + filename.split(".")[0];

<<<<<<< HEAD
      console.log("Looking for mask template with ID:", maskId);
      const maskTemplate = this.svgMaskTemplates[maskId];

      if (!maskTemplate) {
        console.error("No SVG template found for mask ID:", maskId);
        return;
      }

      // Remove any existing mask
      this.removeMask();

      // Get the image dimensions and position
      const imageWidth = targetObject.getScaledWidth();
      const imageHeight = targetObject.getScaledHeight();
      const imageLeft = targetObject.left;
      const imageTop = targetObject.top;
      const imageAngle = targetObject.angle || 0;

      console.log("Image dimensions:", imageWidth, "x", imageHeight);
      console.log("Image position:", imageLeft, imageTop);

      // Create the SVG with proper dimensions
      const svgString = `
                <svg xmlns="http://www.w3.org/2000/svg" 
                     width="${imageWidth}" 
                     height="${imageHeight}" 
                     viewBox="0 0 ${imageWidth} ${imageHeight}">
                    ${maskTemplate}
                </svg>
            `;
=======
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

                    // Scale the mask properly to cover the entire image area
                    // Making sure the mask fully covers the image in both dimensions
                    const scaleX = imageWidth / mask.width;
                    const scaleY = imageHeight / mask.height;

                    // Use the larger scale to ensure full coverage
                    const scaleFactor = Math.max(scaleX, scaleY);

                    console.log('[MASK] Calculated scale factors:', {
                        scaleX,
                        scaleY,
                        finalScale: scaleFactor
                    });

                    // Apply scaling to mask (using scaleX and scaleY separately for clarity)
                    mask.scaleX = scaleFactor;
                    mask.scaleY = scaleFactor;
>>>>>>> 6a6a3e681486f79407f03727bc449fd42ddd3760

      console.log("Generated SVG:", svgString);

<<<<<<< HEAD
      // Create a fabric.js SVG object
      fabric.loadSVGFromString(svgString, (objects, options) => {
        if (!objects || objects.length === 0) {
          console.error("Failed to load SVG from string");
          return;
=======
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
>>>>>>> 6a6a3e681486f79407f03727bc449fd42ddd3760
        }

        // Group SVG objects if there are multiple elements
        const svgGroup =
          objects.length > 1 ? new fabric.Group(objects) : objects[0];

        // Size and position the SVG exactly over the image
        svgGroup.set({
          left: imageLeft,
          top: imageTop,
          width: imageWidth,
          height: imageHeight,
          angle: imageAngle,
          originX: "center",
          originY: "center",
          clipPath: targetObject, // Use the image as a clip path for the SVG
        });

        console.log("SVG group created with properties:", svgGroup);

        // Add the SVG to the canvas
        window.canvas.add(svgGroup);

        // Store the SVG for later removal
        targetObject.maskOverlay = svgGroup;

        // Update canvas
        window.canvas.requestRenderAll();

        // Save state if history function is available
        if (
          window.fabricComponent &&
          typeof window.fabricComponent.addToHistory === "function"
        ) {
          window.fabricComponent.addToHistory();
        }

        // Update selected mask reference
        this.selectedMask = maskSrc;
        console.log("Mask application complete");
      });
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

      if (!targetObject) {
        console.log("No object found to remove mask from");
        return;
      }

      // Remove any existing mask overlay
      if (targetObject.maskOverlay) {
        window.canvas.remove(targetObject.maskOverlay);
        targetObject.maskOverlay = null;
        console.log("Mask overlay removed");
      }

      // Update canvas
      window.canvas.requestRenderAll();

      // Save state if history function is available
      if (
        window.fabricComponent &&
        typeof window.fabricComponent.addToHistory === "function"
      ) {
        window.fabricComponent.addToHistory();
      }

      this.selectedMask = null;
    },

    loadMasks() {
      this.maskItems = [
        { id: "mask1", name: "Mask 1", src: "./images/mask/1.svg" },
        { id: "mask2", name: "Mask 2", src: "./images/mask/2.svg" },
        { id: "mask3", name: "Mask 3", src: "./images/mask/3.svg" },
        { id: "mask5", name: "Mask 5", src: "./images/mask/5.svg" },
      ];
    },
  };
}
