export const templatesPanelComponent = () => ({
  isActive: false,
  templates: [], // This would be populated with template data from your backend

  init() {
    // Listen for tool changes
    window.addEventListener("tool-changed", (e) => {
      this.isActive = e.detail.type === "templates";

      // If becoming active, fetch templates if needed
      if (this.isActive && this.templates.length === 0) {
        this.fetchTemplates();
      }
    });
  },

  // Fetch templates from server (mock implementation)
  fetchTemplates() {
    // In a real implementation, you would fetch from your server
    // This is just a placeholder
    console.log("Fetching templates...");

    // For now, let's leave it empty to show "No templates found!" message
    this.templates = [];
  },

  // Apply a template to the canvas
  applyTemplate(template) {
    if (!window.canvas) return;

    // Clear current canvas
    window.canvas.clear();

    // Load the template (would be a JSON representation of canvas state)
    window.canvas.loadFromJSON(template.data, () => {
      window.canvas.renderAll();
    });
  },
});
