// Clip Arts panel properties and methods
import { FabricImage } from "fabric";

export default function clipArtsComponent() {
  return {
    // Gallery of available clip art categories and items
    categories: [
      { id: "shapes", name: "Shapes", items: [] },
      { id: "icons", name: "Icons", items: [] },
      { id: "backgrounds", name: "Backgrounds", items: [] },
    ],
    selectedCategory: "shapes",
    searchQuery: "",

    // Add a clip art image to the canvas
    addClipArt(src) {
      // Verify canvas exists
      if (!window.canvas) {
        return;
      }

      // Verify image path
      const img = new Image();
      img.onload = () => {
        this.addImageToCanvas(img, src);
      };

      img.onerror = () => {
        // Try with a direct approach as fallback
        this.addImageToCanvas(null, src);
      };

      img.src = src;
    },

    // Add image to canvas
    addImageToCanvas(preloadedImg, src) {
      try {
        // Directly create a Fabric image
        if (preloadedImg) {
          const fabricImage = new FabricImage(preloadedImg, {
            left: window.canvas.width / 2,
            top: window.canvas.height / 2,
            originX: "center",
            originY: "center",
            name: "Clip Art"
          });

          // Scale the image
          fabricImage.scale(0.5);

          // Add to canvas
          window.canvas.add(fabricImage);
          window.canvas.setActiveObject(fabricImage);
          window.canvas.requestRenderAll();

          // Add to uploads panel
          this.addToUploadsPanel(src, fabricImage);

          // Add to history
          if (window.fabricComponent) {
            window.fabricComponent.addToHistory();
          }
        } else {
          // Try using FabricImage.fromURL
          FabricImage.fromURL(
              src,
              (img) => {
                if (img) {
                  // Scale and position
                  img.scale(0.5).set({
                    left: window.canvas.width / 2,
                    top: window.canvas.height / 2,
                    originX: "center",
                    originY: "center",
                    name: "Clip Art",
                  });

                  // Add to canvas
                  window.canvas.add(img);
                  window.canvas.setActiveObject(img);
                  window.canvas.requestRenderAll();

                  // Add to uploads panel
                  this.addToUploadsPanel(src, img);

                  // Add to history
                  if (window.fabricComponent) {
                    window.fabricComponent.addToHistory();
                  }
                }
              },
              {
                crossOrigin: "anonymous",
              }
          );
        }
      } catch (error) {
        // Silently handle errors
      }
    },

    // Add clip art to uploads panel
    addToUploadsPanel(src, fabricImage) {
      // Make sure fabricComponent and uploads exist
      if (!window.fabricComponent || !window.fabricComponent.uploads) {
        return;
      }

      const uploads = window.fabricComponent.uploads;

      // Create a name for the clip art
      const name = `ClipArt_${Date.now()}`;

      // Add to uploads arrays
      const newFile = {
        url: src,
        name: name,
        src: src,
        type: 'clipart'
      };

      // Important: Make copies of arrays for Alpine.js reactivity
      uploads.files = [...uploads.files, newFile];
      uploads.uploadedItems = [...uploads.uploadedItems, newFile];

      // Force reactivity update
      uploads.filesUpdated = (uploads.filesUpdated || 0) + 1;

      // Ensure the uploads UI is updated
      setTimeout(() => {
        if (typeof uploads.renderUploadedImages === 'function') {
          uploads.renderUploadedImages();

          // Switch to uploads panel
          this.switchToUploadsPanel();
        } else {
          // Manual fallback
          this.manuallyUpdateUploadsUI(newFile);

          // Still try to switch
          this.switchToUploadsPanel();
        }
      }, 50);
    },

    // Switch to uploads panel
    switchToUploadsPanel() {
      if (window.fabricComponent) {
        window.fabricComponent.changeTool("uploads");
      }
    },

    // Manual fallback for updating uploads UI
    manuallyUpdateUploadsUI(fileObj) {
      const container = document.getElementById("file-upload-con");
      if (!container) {
        return;
      }

      // Create an element for the image
      const imgElement = document.createElement("div");
      imgElement.className = "aspect-square border border-gray-200 rounded overflow-hidden relative group";

      // Create the image
      const img = document.createElement("img");
      img.src = fileObj.url;
      img.alt = fileObj.name;
      img.className = "w-full h-full object-cover cursor-pointer";

      // Add click handler to add to canvas
      img.onclick = () => {
        if (window.fabricComponent && window.fabricComponent.uploads) {
          window.fabricComponent.uploads.addImageToCanvas(fileObj.url);
        }
      };

      // Add the image to the container
      imgElement.appendChild(img);
      container.appendChild(imgElement);
    },

    // Load clip art items for a category
    loadCategory(categoryId) {
      this.selectedCategory = categoryId;
    },

    // Search clip art items
    searchClipArt(query) {
      this.searchQuery = query;
    }
  };
}