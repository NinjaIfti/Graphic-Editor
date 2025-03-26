// js/Editor/panels/settings.js
import { AddItemToEditor } from "../Editor.js";
import { canvas } from "../app.js";
import { resizeCanvas } from "../plugins/aspect-ratio.js";
import Alpine from "alpinejs";

// Alpine.js component for settings panel
export function settingsPanel() {
  return {
    isActive: false,
    backgroundColor: "#ffffff",
    customSizeVisible: false,
    customWidth: 1080,
    customHeight: 1920,
    selectedSize: "TikTok (1080x1920)",
    canvasSizes: [
      { name: "TikTok (1080x1920)", value: "1080x1920" },
      { name: "Instagram Post (1080x1080)", value: "1080x1080" },
      { name: "Instagram Story (1080x1920)", value: "1080x1920" },
      { name: "Facebook Post (1200x630)", value: "1200x630" },
      { name: "Twitter Post (1200x675)", value: "1200x675" },
      { name: "YouTube Thumbnail (1280x720)", value: "1280x720" },
      { name: "Custom Size", value: "custom" },
    ],

    init() {
      // Initialize with canvas background color if available
      if (typeof canvas !== "undefined" && canvas.backgroundColor) {
        this.backgroundColor = canvas.backgroundColor;
      }

      // Listen for tool panel changes
      window.addEventListener("change-tool", (event) => {
        this.isActive = event.detail.type === "settings";
      });
    },

    updateBackgroundColor() {
      if (typeof canvas === "undefined") return;

      // Remove existing background image
      const bgImage = canvas._objects.find(
        (obj) => obj.name === "background-image"
      );
      if (bgImage) {
        canvas.remove(bgImage);
      }

      // Set background color
      canvas.backgroundColor = this.backgroundColor;
      canvas.renderAll();
    },

    setBackgroundImage(imageSrc) {
      if (typeof canvas === "undefined") return;

      // Remove existing background color and image
      canvas.backgroundColor = "";
      const bgImage = canvas._objects.find(
        (obj) => obj.name === "background-image"
      );
      if (bgImage) {
        canvas.remove(bgImage);
        canvas.renderAll();
      }

      // Add new background image
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        AddItemToEditor(
          {
            type: "background-image",
            src: imageSrc,
            fileType: "image",
          },
          {
            left: 0,
            top: 0,
            erasable: false,
            name: "background-image",
            lockMovementX: true,
            lockMovementY: true,
            selectable: false,
          },
          {
            selected: false,
            centerObject: false,
          }
        );

        // Resize canvas to match image dimensions
        resizeCanvas({
          width: img.width,
          height: img.height,
        });
      };
    },

    selectSize(size) {
      this.selectedSize = size.name;

      if (size.value === "custom") {
        this.customSizeVisible = true;
      } else {
        this.customSizeVisible = false;
        const dimensions = size.value.split("x").map((s) => parseInt(s));
        resizeCanvas({
          width: dimensions[0],
          height: dimensions[1],
        });
      }
    },

    applyCustomSize() {
      const width = parseInt(this.customWidth);
      const height = parseInt(this.customHeight);

      if (width > 0 && height > 0) {
        resizeCanvas({ width, height });
      }
    },

    filterSizes() {
      this.filteredSizes = this.canvasSizes.filter((size) =>
        size.name.toLowerCase().includes(this.search.toLowerCase())
      );
    },
  };
}
