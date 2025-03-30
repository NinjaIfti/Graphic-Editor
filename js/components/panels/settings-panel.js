export const settingsPanelComponent = () => ({
  isActive: false,
  customSizeVisible: false,
  backgroundColor: "#ffffff",
  customWidth: 1080,
  customHeight: 1920,
  open: false,

  // Predefined canvas sizes
  canvasSizes: [
    { name: "TikTok (1080x1920)", value: "1080x1920", key: "tiktok" },
    { name: "YouTube (1280x720)", value: "1280x720", key: "youtube" },
    { name: "Facebook Post (1200x630)", value: "1200x630", key: "fb-post" },
    {
      name: "Instagram Post (1080x1080)",
      value: "1080x1080",
      key: "ig-post",
    },
    {
      name: "Instagram Story (1080x1920)",
      value: "1080x1920",
      key: "ig-story",
    },
    { name: "Facebook Cover (820x312)", value: "820x312", key: "fb-cover" },
    { name: "LinkedIn Post (1200x1200)", value: "1200x1200", key: "li-post" },
    { name: "LinkedIn Cover (1584x396)", value: "1584x396", key: "li-cover" },
    { name: "Twitter Header (1500x500)", value: "1500x500", key: "twitter" },
    {
      name: "Snapchat Story (1080x1920)",
      value: "1080x1920",
      key: "snapchat",
    },
    {
      name: "YouTube Channel Art (2560x1440)",
      value: "2560x1440",
      key: "yt-art",
    },
    { name: "Pinterest Pin (1600x900)", value: "1600x900", key: "pinterest" },
    { name: "Custom", value: "custom", key: "custom" },
  ],
  filteredSizes: [],
  search: "",
  selectedSize: "TikTok (1080x1920)",
  selectedValue: "1080x1920",

  init() {
    // Initialize filteredSizes with all sizes
    this.filteredSizes = [...this.canvasSizes];

    // Listen for tool changes
    window.addEventListener("tool-changed", (e) => {
      this.isActive = e.detail.type === "settings";

      // Initialize with current canvas settings if available
      if (this.isActive && window.canvas) {
        this.backgroundColor = window.canvas.backgroundColor || "#ffffff";
      }
    });
  },

  // Filter sizes based on search
  filterSizes() {
    if (!this.search) {
      this.filteredSizes = this.canvasSizes;
      return;
    }

    this.filteredSizes = this.canvasSizes.filter((size) =>
      size.name.toLowerCase().includes(this.search.toLowerCase())
    );
  },

  // Select a size from the dropdown
  selectSize(size) {
    this.selectedSize = size.name;
    this.selectedValue = size.value;

    if (size.value === "custom") {
      this.customSizeVisible = true;
      return;
    }

    this.customSizeVisible = false;

    // Parse dimensions from the value (format: "WidthxHeight")
    const [width, height] = size.value.split("x").map(Number);

    // Apply size to canvas
    this.resizeCanvas(width, height);
  },

  // Apply custom size
  applyCustomSize() {
    if (!this.customWidth || !this.customHeight) return;

    this.resizeCanvas(this.customWidth, this.customHeight);
  },

  // Resize the canvas to specified dimensions
  resizeCanvas(width, height) {
    if (!window.canvas) return;

    // Get current objects and canvas state
    const objects = window.canvas.getObjects();
    const currentWidth = window.canvas.width;
    const currentHeight = window.canvas.height;

    // Set new canvas dimensions
    window.canvas.setWidth(width);
    window.canvas.setHeight(height);

    // Adjust objects if needed (scale or reposition)
    if (objects.length > 0) {
      // Simple approach: center all content
      const selection = new fabric.ActiveSelection(objects, {
        canvas: window.canvas,
      });

      // Center the selection properly
      selection.centerH();
      selection.centerV();

      window.canvas.discardActiveObject();
    }

    // Trigger a canvas resize event
    window.dispatchEvent(
      new CustomEvent("canvas:resized", {
        detail: { width, height },
      })
    );

    window.canvas.renderAll();
  },

  // Update background color
  updateBackgroundColor() {
    if (!window.canvas) return;

    // Use the standard Fabric.js way to set background color
    window.canvas.backgroundColor = this.backgroundColor;
    window.canvas.renderAll();
  },
});
