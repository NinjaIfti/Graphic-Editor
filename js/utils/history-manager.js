// src/utils/history-manager.js

// Define variables with module scope
let historyStack = [];
let historyIndex = -1;
const maxHistorySteps = 50;
let _applyingHistory = false;
let _ignoreNextChange = false;

export function initHistoryManager() {
  if (!window.canvas) return;

  // Clear previous history
  historyStack = [];
  historyIndex = -1;

  // Save initial state
  addToHistory();

  // We don't need to add listeners here since we're using manual history management
  // The components will call addToHistory when needed

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

  // Handle the flag to ignore a change (used when we know an operation will trigger multiple changes)
  if (_ignoreNextChange) {
    _ignoreNextChange = false;
    return;
  }

  try {
    // Create a special saveState that handles shadow objects properly
    const saveState = () => {
      try {
        // Get JSON representation of canvas with reviver function to handle shadows
        const json = window.canvas.toJSON(['shadow']);

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

        return true;
      } catch (err) {
        console.warn("Could not save canvas state:", err);
        return false;
      }
    };

    // Throttle/debounce the save state to avoid saving too many states
    if (window._historySaveTimeout) clearTimeout(window._historySaveTimeout);
    window._historySaveTimeout = setTimeout(() => {
      saveState();
      window._historySaveTimeout = null;
    }, 300);
  } catch (error) {
    console.error("Error saving canvas state:", error);
  }
}

// Function to undo last action
export function undo() {
  if (historyIndex <= 0) return;
  historyIndex--;
  applyCanvasState(historyStack[historyIndex]);

  // Dispatch event that history has changed (for UI updates)
  window.dispatchEvent(new CustomEvent('history:changed', {
    detail: { canUndo: historyIndex > 0, canRedo: historyIndex < historyStack.length - 1 }
  }));
}

// Function to redo previously undone action
export function redo() {
  if (historyIndex >= historyStack.length - 1) return;
  historyIndex++;
  applyCanvasState(historyStack[historyIndex]);

  // Dispatch event that history has changed (for UI updates)
  window.dispatchEvent(new CustomEvent('history:changed', {
    detail: { canUndo: historyIndex > 0, canRedo: historyIndex < historyStack.length - 1 }
  }));
}

// Set this to ignore the next change (useful for operations that trigger multiple changes)
export function ignoreNextHistoryChange() {
  _ignoreNextChange = true;
}

// Function to apply a saved canvas state
export function applyCanvasState(state) {
  if (!window.canvas) return;

  try {
    _applyingHistory = true;

    // Clear current canvas
    window.canvas.clear();

    // Load from JSON with special handling for shadows
    window.canvas.loadFromJSON(state, () => {
      // Ensure all objects are properly rendered
      window.canvas.getObjects().forEach(obj => {
        // Ensure text objects have correct dimensions
        if (obj.type && obj.type.includes('text')) {
          if (obj.width <= 0) obj.width = 200;
          if (obj.height <= 0) obj.height = 30;

          // Fix any shadow issues
          if (obj.shadow && typeof obj.shadow === 'object') {
            // Make sure shadow has all required properties
            obj.shadow = {
              color: obj.shadow.color || '#000000',
              blur: parseFloat(obj.shadow.blur) || 5,
              offsetX: parseFloat(obj.shadow.offsetX) || 5,
              offsetY: parseFloat(obj.shadow.offsetY) || 5
            };
          }

          // Force text update
          obj.dirty = true;
          obj.setCoords();
        }
      });

      window.canvas.renderAll();

      // Dispatch an event that objects have changed
      window.dispatchEvent(new CustomEvent('objects:changed'));

      // Small delay before turning off applying flag to avoid race conditions
      setTimeout(() => {
        _applyingHistory = false;
      }, 50);
    });
  } catch (error) {
    console.error("Error applying canvas state:", error);
    _applyingHistory = false;
  }
}