// src/utils/history-manager.js

// Define variables with module scope
let historyStack = [];
let historyIndex = -1;
const maxHistorySteps = 50;
let _applyingHistory = false;

export function initHistoryManager() {
  if (!window.canvas) return;

  // Save initial state
  addToHistory();

  // Add event listeners for canvas changes
  window.canvas.on("object:added", () => addToHistory());
  window.canvas.on("object:modified", () => addToHistory());
  window.canvas.on("object:removed", () => addToHistory());

  // Setup keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Undo: Ctrl+Z
    if (e.ctrlKey && e.key === "z") {
      e.preventDefault();
      undo();
    }

    // Redo: Ctrl+Y or Ctrl+Shift+Z
    if (
      (e.ctrlKey && e.key === "y") ||
      (e.ctrlKey && e.shiftKey && e.key === "z")
    ) {
      e.preventDefault();
      redo();
    }
  });

  // Expose functions globally if needed
  window.historyManager = {
    undo,
    redo,
    addToHistory,
  };
}

// Function to add current state to history
export function addToHistory() {
  if (!window.canvas) return;

  // Don't save if we're in the middle of applying history
  if (_applyingHistory) return;

  try {
    // Get JSON representation of canvas
    const json = window.canvas.toJSON();

    // Remove any states beyond current index
    if (historyIndex < historyStack.length - 1) {
      historyStack = historyStack.slice(0, historyIndex + 1);
    }

    // Add new state
    historyStack.push(json);

    // Trim history if too long
    if (historyStack.length > maxHistorySteps) {
      historyStack.shift();
    } else {
      historyIndex++;
    }
  } catch (error) {
    console.error("Error saving canvas state:", error);
  }
}

// Function to undo last action
export function undo() {
  if (historyIndex <= 0) return;
  historyIndex--;
  applyCanvasState(historyStack[historyIndex]);
}

// Function to redo previously undone action
export function redo() {
  if (historyIndex >= historyStack.length - 1) return;
  historyIndex++;
  applyCanvasState(historyStack[historyIndex]);
}

// Function to apply a saved canvas state
export function applyCanvasState(state) {
  if (!window.canvas) return;

  try {
    _applyingHistory = true;
    window.canvas.loadFromJSON(state, () => {
      window.canvas.renderAll();
      _applyingHistory = false;
    });
  } catch (error) {
    console.error("Error applying canvas state:", error);
    _applyingHistory = false;
  }
}
