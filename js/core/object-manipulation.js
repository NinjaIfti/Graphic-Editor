export const objectManipulationComponent = () => ({
  // Align objects on canvas
  align(type) {
    if (!window.canvas) return;

    const activeObject = window.canvas.getActiveObject();
    if (!activeObject) return;

    const canvasWidth = window.canvas.getWidth();
    const canvasHeight = window.canvas.getHeight();

    let coordX, coordY;

    switch (type) {
      case "left":
        coordX = activeObject.getBoundingRect().width / 2;
        activeObject.set({ left: coordX, originX: "center" });
        break;
      case "right":
        coordX = canvasWidth - activeObject.getBoundingRect().width / 2;
        activeObject.set({ left: coordX, originX: "center" });
        break;
      case "centerH":
        window.canvas.centerObjectH(activeObject);
        break;
      case "top":
        coordY = activeObject.getBoundingRect().height / 2;
        activeObject.set({ top: coordY, originY: "center" });
        break;
      case "bottom":
        coordY = canvasHeight - activeObject.getBoundingRect().height / 2;
        activeObject.set({ top: coordY, originY: "center" });
        break;
      case "centerV":
        window.canvas.centerObjectV(activeObject);
        break;
      case "center":
        window.canvas.centerObject(activeObject);
        break;
    }

    window.canvas.renderAll();
  },

  // Group selected objects
  group() {
    if (!window.canvas) return;

    const activeSelection = window.canvas.getActiveObject();

    if (
      activeSelection &&
      activeSelection.type === "activeSelection" &&
      activeSelection.getObjects().length > 1
    ) {
      const group = activeSelection.toGroup();
      window.canvas.setActiveObject(group);
      window.canvas.renderAll();
      return true;
    }

    return false;
  },

  // Ungroup a group of objects
  ungroup() {
    if (!window.canvas) return;

    const activeObject = window.canvas.getActiveObject();

    if (activeObject && activeObject.type === "group") {
      const items = activeObject.getObjects();
      activeObject.destroy();
      window.canvas.remove(activeObject);

      items.forEach((item) => {
        window.canvas.add(item);
      });

      window.canvas.discardActiveObject();
      window.canvas.renderAll();
      return true;
    }

    return false;
  },

  // Bring object forward in stacking order
  bringForward() {
    if (!window.canvas) return;

    const activeObject = window.canvas.getActiveObject();
    if (activeObject) {
      window.canvas.bringForward(activeObject);
      window.canvas.renderAll();
    }
  },

  // Send object backward in stacking order
  sendBackward() {
    if (!window.canvas) return;

    const activeObject = window.canvas.getActiveObject();
    if (activeObject) {
      window.canvas.sendBackwards(activeObject);
      window.canvas.renderAll();
    }
  },

  // Bring object to front
  bringToFront() {
    if (!window.canvas) return;

    const activeObject = window.canvas.getActiveObject();
    if (activeObject) {
      window.canvas.bringToFront(activeObject);
      window.canvas.renderAll();
    }
  },

  // Send object to back
  sendToBack() {
    if (!window.canvas) return;

    const activeObject = window.canvas.getActiveObject();
    if (activeObject) {
      window.canvas.sendToBack(activeObject);
      window.canvas.renderAll();
    }
  },

  // Delete selected object(s)
  delete() {
    if (!window.canvas) return;

    const activeObject = window.canvas.getActiveObject();
    if (activeObject) {
      if (activeObject.type === "activeSelection") {
        // Delete multiple selected objects
        activeObject.getObjects().forEach((obj) => {
          window.canvas.remove(obj);
        });
        window.canvas.discardActiveObject();
      } else {
        // Delete single object
        window.canvas.remove(activeObject);
      }

      window.canvas.renderAll();
    }
  },

  // Clone/duplicate selected object
  clone() {
    if (!window.canvas) return;

    const activeObject = window.canvas.getActiveObject();
    if (!activeObject) return;

    activeObject.clone((cloned) => {
      cloned.set({
        left: activeObject.left + 10,
        top: activeObject.top + 10,
      });

      window.canvas.add(cloned);
      window.canvas.setActiveObject(cloned);
      window.canvas.renderAll();
    });
  },

  // Lock/unlock object position
  toggleLock() {
    if (!window.canvas) return;

    const activeObject = window.canvas.getActiveObject();
    if (!activeObject) return;

    const isLocked = activeObject.lockMovementX && activeObject.lockMovementY;

    activeObject.set({
      lockMovementX: !isLocked,
      lockMovementY: !isLocked,
      lockRotation: !isLocked,
      lockScalingX: !isLocked,
      lockScalingY: !isLocked,
    });

    window.canvas.renderAll();
    return !isLocked;
  },
});
