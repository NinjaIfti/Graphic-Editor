export const panelManagerComponent = () => ({
  activePanelId: "templates",

  init() {
    // Listen for tool change events
    window.addEventListener("tool-changed", (e) => {
      console.log("tool-changed event received:", e.detail.type);
      this.activePanelId = e.detail.type;
      console.log("isActive set to:", this.isActive);
    });
  },

  isPanelActive(panelId) {
    return this.activePanelId === panelId;
  },
});
