// src/utils/canvas-utils.js

// Export these functions to be used across components
export function centerAll() {
  if (!window.canvas) return;

  const objects = window.canvas.getObjects();
  if (objects.length === 0) return;

  // Create a selection of all objects
  const selection = new fabric.ActiveSelection(objects, {
    canvas: window.canvas,
  });

  // Center the selection
  window.canvas.centerObject(selection);

  // Discard the selection
  window.canvas.discardActiveObject();
  window.canvas.renderAll();
}

export function fitToCanvas() {
  if (!window.canvas) return;

  const objects = window.canvas.getObjects();
  if (objects.length === 0) return;

  // Create a selection of all objects
  const selection = new fabric.ActiveSelection(objects, {
    canvas: window.canvas,
  });

  // Get canvas dimensions with some padding
  const padding = 20;
  const canvasWidth = window.canvas.width - padding * 2;
  const canvasHeight = window.canvas.height - padding * 2;

  // Calculate scaling needed to fit
  const selectionWidth = selection.width * selection.scaleX;
  const selectionHeight = selection.height * selection.scaleY;

  if (selectionWidth > canvasWidth || selectionHeight > canvasHeight) {
    const scaleX = canvasWidth / selectionWidth;
    const scaleY = canvasHeight / selectionHeight;
    const scale = Math.min(scaleX, scaleY);

    // Apply scaling to all objects
    objects.forEach((obj) => {
      obj.scaleX *= scale;
      obj.scaleY *= scale;
      obj.left *= scale;
      obj.top *= scale;
    });
  }

  // Center everything
  centerAll();
}

export function clearCanvas() {
  if (!window.canvas) return;

  if (
    confirm(
      "Are you sure you want to clear the canvas? This action cannot be undone."
    )
  ) {
    window.canvas.clear();
    window.canvas.setBackgroundColor("#ffffff", () => {
      window.canvas.renderAll();
    });
  }
}

// Object manipulation utilities
export function align(type) {
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
}

export function group() {
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
}

export function ungroup() {
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
}

// Bring object forward in stacking order
export function bringForward() {
  if (!window.canvas) return;

  const activeObject = window.canvas.getActiveObject();
  if (activeObject) {
    window.canvas.bringForward(activeObject);
    window.canvas.renderAll();
  }
}

// Send object backward in stacking order
export function sendBackward() {
  if (!window.canvas) return;

  const activeObject = window.canvas.getActiveObject();
  if (activeObject) {
    window.canvas.sendBackwards(activeObject);
    window.canvas.renderAll();
  }
}

// Bring object to front
export function bringToFront() {
  if (!window.canvas) return;

  const activeObject = window.canvas.getActiveObject();
  if (activeObject) {
    window.canvas.bringToFront(activeObject);
    window.canvas.renderAll();
  }
}

// Send object to back
export function sendToBack() {
  if (!window.canvas) return;

  const activeObject = window.canvas.getActiveObject();
  if (activeObject) {
    window.canvas.sendToBack(activeObject);
    window.canvas.renderAll();
  }
}

// Delete selected object(s)
export function deleteObject() {
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
}

// Clone/duplicate selected object
export function cloneObject() {
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
}

// Lock/unlock object position
export function toggleLock() {
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
}

// Add the other object manipulation functions here (bringForward, sendBackward, etc.)
