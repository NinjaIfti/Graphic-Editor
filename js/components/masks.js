// src/components/masks.js - Improved version
import { FabricImage } from "fabric";

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
      if (!targetObject || targetObject.type !== "image") return;

      // Clear existing clipPath directly before loading the new mask
      targetObject.clipPath = null;
      window.canvas.requestRenderAll();

      // Create an image element to load the mask
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          // Create a Fabric image from the loaded image
          const mask = new FabricImage(img);

          // Get target object dimensions
          const imageWidth = targetObject.getScaledWidth();
          const imageHeight = targetObject.getScaledHeight();

          // Calculate the width and height ratios
          const widthRatio = imageWidth / mask.width;
          const heightRatio = imageHeight / mask.height;

          // Determine which dimension needs adjustment
          // If widthRatio is smaller than heightRatio, the mask is wider relative to the image
          // If heightRatio is smaller than widthRatio, the mask is taller relative to the image
          let scaleX, scaleY;

          if (widthRatio < heightRatio) {
            // Mask is wider relative to image, so adjust based on width
            scaleX = widthRatio;
            scaleY = widthRatio; // Maintain aspect ratio
          } else {
            // Mask is taller relative to image, so adjust based on height
            scaleX = heightRatio;
            scaleY = heightRatio; // Maintain aspect ratio
          }

          // Scale the mask uniformly
          mask.scaleX = scaleX;
          mask.scaleY = scaleY;

          // Center the mask on the image
          mask.set({
            originX: "center",
            originY: "center",
            left: 0,
            top: 0,
            absolutePositioned: false,
            inverted: false,
          });

          // Apply the new clipPath
          targetObject.clipPath = mask;

          // Update canvas and save state
          window.canvas.requestRenderAll();
          window.fabricComponent.addToHistory();
          this.selectedMask = maskSrc;
        } catch (error) {
          console.error("Error applying mask:", error);
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
        { id: "mask1", name: "Mask 1", src: "./images/mask/1.svg" },
        { id: "mask2", name: "Mask 2", src: "./images/mask/2.svg" },
        { id: "mask3", name: "Mask 3", src: "./images/mask/3.svg" },
        { id: "mask5", name: "Mask 5", src: "./images/mask/5.svg" },
      ];
    },
  };
}
