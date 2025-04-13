export const contextMenuComponent = () => ({
  // Context menu properties
  isOpen: false,
  posX: 0,
  posY: 0,
  isLocked: false,
  isGrouped: false,
  canvas: null,
  activeObject: null,

  init() {
    // Initialize fabric canvas reference
    this.initFabricCanvas();

    // Set up event listeners for context menu
    document.addEventListener("contextmenu", (e) => {
      const activeObject = this.canvas?.getActiveObject();
      if (activeObject) {
        e.preventDefault();
        this.activeObject = activeObject;
        this.posX = e.clientX;
        this.posY = e.clientY;
        this.isOpen = true;
        this.isLocked =
          activeObject.lockMovementX && activeObject.lockMovementY;
        this.isGrouped = activeObject.type === "group";
      }
    });

    // Setup keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (!this.canvas) return;

      const activeObject = this.canvas.getActiveObject();
      if (!activeObject) return;

      // Ctrl + [
      if (e.ctrlKey && e.key === "[") {
        this.handleAction("bringForward");
      }

      // Ctrl + ]
      if (e.ctrlKey && e.key === "]") {
        this.handleAction("sendBackwards");
      }

      // Ctrl + L
      if (e.ctrlKey && e.key === "l") {
        this.toggleLock();
      }

      // Ctrl + G
      if (e.ctrlKey && e.key === "g") {
        this.toggleGroup();
      }

      // Delete
      if (e.key === "Delete") {
        this.handleAction("delete");
      }
    });
  },

  initFabricCanvas() {
    // We'll connect to the Fabric.js canvas once it's initialized elsewhere
    window.addEventListener("canvas:initialized", (e) => {
      this.canvas = e.detail.canvas;
    });
  },

  close() {
    this.isOpen = false;
  },

  handleAction(action) {
    if (!this.canvas || !this.activeObject) return;

    switch (action) {
      case "bringForward":
        this.canvas.bringForward(this.activeObject);
        break;
      case "sendBackwards":
        this.canvas.sendBackwards(this.activeObject);
        break;
      case "delete":
        this.canvas.remove(this.activeObject);
        break;
    }

    this.canvas.requestRenderAll();
    this.close();
  },

  toggleLock() {
    if (!this.canvas || !this.activeObject) return;

    this.isLocked = !this.isLocked;
    this.activeObject.set({
      lockMovementX: this.isLocked,
      lockMovementY: this.isLocked,
      lockRotation: this.isLocked,
      lockScalingX: this.isLocked,
      lockScalingY: this.isLocked,
    });

    this.canvas.requestRenderAll();
    this.close();
  },

  toggleGroup() {
    if (!this.canvas) return;

    if (this.isGrouped) {
      // Ungroup
      const items = this.activeObject.getObjects();
      this.activeObject.destroy();
      this.canvas.remove(this.activeObject);
      this.canvas.discardActiveObject();

      items.forEach((item) => {
        this.canvas.add(item);
      });
    } else {
      // Group
      if (
        !this.canvas.getActiveObjects() ||
        this.canvas.getActiveObjects().length < 2
      ) {
        return;
      }

      const selection = new fabric.Group(this.canvas.getActiveObjects(), {
        canvas: this.canvas,
      });

      this.canvas.remove(...this.canvas.getActiveObjects());
      this.canvas.add(selection);
      this.canvas.setActiveObject(selection);
    }

    this.isGrouped = !this.isGrouped;
    this.canvas.requestRenderAll();
    this.close();
  },
});
