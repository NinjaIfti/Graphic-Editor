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

  // Set up event listeners on the canvas to automatically add history states
  setupCanvasEventListeners();

  // Expose functions globally if needed
  window.historyManager = {
    undo,
    redo,
    addToHistory,
  };

  console.log("History manager initialized successfully");
}

// Set up canvas event listeners to automatically track history
function setupCanvasEventListeners() {
  if (!window.canvas) return;

  // Primary events that should trigger history updates
  const historyEvents = [
    'object:modified',  // When an object is modified (moved, resized, etc.)
    'object:added',     // When a new object is added to the canvas
    'object:removed',   // When an object is removed from the canvas
    'path:created'      // When a drawing path is completed
  ];

  // Remove any existing event listeners first to avoid duplicates
  historyEvents.forEach(eventName => {
    window.canvas.off(eventName, handleHistoryEvent);
  });

  // Add event listeners for all history events
  historyEvents.forEach(eventName => {
    window.canvas.on(eventName, handleHistoryEvent);
  });
}

// Event handler for canvas events that should trigger history updates
function handleHistoryEvent(e) {
  // Don't add history state if we're in the middle of applying history
  if (_applyingHistory) return;

  // Debounce history changes to prevent too many states from being saved
  if (window._historySaveTimeout) clearTimeout(window._historySaveTimeout);
  window._historySaveTimeout = setTimeout(() => {
    addToHistory();
    window._historySaveTimeout = null;
  }, 300);
}

// Function to add current state to history (can still be called manually if needed)
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
    // Save the current canvas state
    const saveState = () => {
      try {
        // Get JSON representation of canvas
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

        console.log(`History state saved (${historyIndex}/${historyStack.length - 1})`);
        return true;
      } catch (err) {
        console.warn("Could not save canvas state:", err);
        return false;
      }
    };

    saveState();
  } catch (error) {
    console.error("Error saving canvas state:", error);
  }
}


// Function to undo last action
export function undo() {
  console.log(`Undo requested: current index ${historyIndex}, stack size ${historyStack.length}`);
  if (historyIndex <= 0) {
    console.log("Cannot undo: at beginning of history");
    return;
  }

  historyIndex--;
  console.log(`Undoing to state ${historyIndex}`);
  applyCanvasState(historyStack[historyIndex]);

  // Dispatch event that history has changed (for UI updates)
  window.dispatchEvent(new CustomEvent('history:changed', {
    detail: { canUndo: historyIndex > 0, canRedo: historyIndex < historyStack.length - 1 }
  }));
}

// Function to redo previously undone action
export function redo() {
  console.log(`Redo requested: current index ${historyIndex}, stack size ${historyStack.length}`);
  if (historyIndex >= historyStack.length - 1) {
    console.log("Cannot redo: at end of history");
    return;
  }

  historyIndex++;
  console.log(`Redoing to state ${historyIndex}`);
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
// Update the applyCanvasState function in history-manager.js
export function applyCanvasState(state) {
  if (!window.canvas) return;

  try {
    _applyingHistory = true;
    console.log("Applying canvas state");

    // Store the current zoom and panning state if needed
    const currentZoom = window.canvas.getZoom();
    const currentViewportTransform = [...window.canvas.viewportTransform];

    // Clear current canvas
    window.canvas.clear();

    // Load from JSON with error handling for unknown object types
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

      // Restore zoom and panning if needed
      if (currentZoom !== 1) {
        window.canvas.setZoom(currentZoom);
      }
      if (currentViewportTransform) {
        window.canvas.setViewportTransform(currentViewportTransform);
      }

      // Force a complete render
      window.canvas.requestRenderAll();

      // Dispatch an event that objects have changed
      window.dispatchEvent(new CustomEvent('objects:changed'));

      // Small delay before turning off applying flag to avoid race conditions
      setTimeout(() => {
        _applyingHistory = false;
        console.log("Canvas state applied successfully");
      }, 50);
    }, (err, obj) => {
      // This is a custom reviver that runs when an object can't be properly deserialized
      console.warn(`Error loading object of type ${obj.type}:`, err);

      // For curved-text objects, convert them to regular textbox objects
      if (obj.type === 'curved-text') {
        return new window.fabric.Textbox(obj.text || '', {
          left: obj.left || 0,
          top: obj.top || 0,
          width: obj.width || 200,
          fontSize: obj.fontSize || 20,
          fontFamily: obj.fontFamily || 'Arial',
          fill: obj.fill || '#000000',
          textAlign: obj.textAlign || 'left',
          // Other properties you want to preserve
        });
      }

      // Return null for other unknown object types
      return null;
    });
  } catch (error) {
    console.error("Error applying canvas state:", error);
    _applyingHistory = false;
  }
}