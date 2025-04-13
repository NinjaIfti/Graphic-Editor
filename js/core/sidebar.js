// src/components/core/sidebar.js
export const sidebarComponent = () => ({
  activeItem: "templates", // Default active tool

  init() {
    // Set the default active tool
    this.$nextTick(() => {
      this.setActiveTool(this.activeItem);
    });
  },

  // Set the active tool and notify other components
  setActiveTool(toolName) {
    console.log("Tool selected:", toolName);
    this.activeItem = toolName;

    // Dispatch custom event to notify other components
    this.$dispatch("change-tool", { type: toolName });

    // Also dispatch the standard event for components that might be listening
    window.dispatchEvent(
      new CustomEvent("tool-changed", {
        detail: { type: toolName },
      })
    );
  },
});
