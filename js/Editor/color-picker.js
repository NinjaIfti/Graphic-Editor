// js/color-picker.js - Alpine.js version
import Alpine from "alpinejs";
import { getRand } from "../Functions/functions.js";

// Setup color picker functionality
document.addEventListener("alpine:init", () => {
  Alpine.data("colorPicker", () => ({
    // Initialize color picker on element
    init() {
      // Skip if already initialized
      if (this.$el.getAttribute("data-launched") === "true") return;

      this.$el.setAttribute("data-launched", "true");

      const id = getRand(20);
      const selector = `.color-picker[data-clr-id="${id}"]`;
      const defaultColor = this.$el.value || "#000";

      this.$el.setAttribute("data-clr-id", id);

      // Initialize Coloris on this element
      Coloris({
        el: selector,
        swatches: [
          "#264653",
          "#2a9d8f",
          "#e9c46a",
          "#f4a261",
          "#e76f51",
          "#d62828",
          "#023e8a",
          "#0077b6",
          "#0096c7",
          "#00b4d8",
        ],
      });

      Coloris.setInstance(selector, {
        theme: "pill",
        themeMode: "light",
        formatToggle: true,
        defaultColor,
      });

      // Setup event listeners for open/close
      this.$el.addEventListener("open", this.handleOpen);
      this.$el.addEventListener("close", this.handleClose);
    },

    // Handle color picker open event
    handleOpen() {
      // Remove active class from any other color pickers
      document.querySelectorAll(".color-picker.active").forEach((el) => {
        el.classList.remove("active");
      });

      // Add active class to this color picker
      this.classList.add("active");
    },

    // Handle color picker close event
    handleClose() {
      document.querySelectorAll(".color-picker.active").forEach((el) => {
        el.classList.remove("active");
      });

      // If canvas cursor is colorpicker, change it back to default
      // if (Alpine.store('editor').canvasCursor === 'colorpicker') {
      //     Alpine.store('editor').changeCanvasCursor('default');
      // }
    },
  }));
});

// Load Coloris library and initialize color pickers
const initColoris = async () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "./js/Libraries/coloris.min.js";
    document.body.appendChild(script);

    script.onload = () => {
      // Initialize all color pickers when the library is loaded
      document
        .querySelectorAll(".color-picker:not([data-launched])")
        .forEach((el) => {
          if (Alpine.bound(el, "colorPicker")) {
            Alpine.initTree(el);
          }
        });
      resolve();
    };
  });
};

// Initialize Coloris when DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
  initColoris();
});

// Export initColoris function in case it needs to be called manually
export { initColoris };
