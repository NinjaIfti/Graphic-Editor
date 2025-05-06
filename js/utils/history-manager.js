// src/utils/history-manager.js

/**
 * A class-based history manager for Fabric.js v6
 * Handles undo/redo operations with proper filter support
 */
class CanvasHistory {
  constructor(canvas) {
    this.canvas = canvas;
    this.history = [];
    this.redoHistory = [];
    this._isClearingCanvas = false; // Flag to avoid tracking during canvas clearing
    this._isApplyingState = false;  // Flag to prevent recursion during state application
    this._lastFilteredImage = null; // Track which image had filters applied
    this._debounceTimeout = null;   // For debouncing state saves

    // Properties to include when saving state
    this.propertiesToInclude = [
      // Basic object properties
      "lockMovementX", "lockMovementY", "lockRotation", "lockScalingX", "lockScalingY",
      "selectable", "hasControls", "hasBorders", "opacity", "fill", "stroke",
      "strokeWidth", "backgroundColor", "left", "top", "width", "height",
      "scaleX", "scaleY", "flipX", "flipY", "angle", "skewX", "skewY",
      "originX", "originY", "cropX", "cropY", "src", "crossOrigin",
      "filters", "clipPath", "id", "_savedState", "_naturalWidth", "_naturalHeight",
      "alignX", "alignY", "meetOrSlice", "transformMatrix",
      // Text-specific properties
      "text", "fontFamily", "fontSize", "fontWeight", "fontStyle", "underline",
      "overline", "linethrough", "textAlign", "charSpacing", "lineHeight", "direction",
      "textBackgroundColor", "path", "pathStartOffset", "pathSide", "pathAlign",
      // Drawing properties
      "strokeLineCap", "strokeLineJoin", "strokeMiterLimit", "strokeDashArray",
      "strokeDashOffset", "inverted", "absolutePositioned", "erasable"
    ];

    this.init();
  }

  /**
   * Initialize the history manager
   */
  init() {
    if (!this.canvas) {
      console.error("Canvas not available for history manager");
      return;
    }

    // Save initial state
    this._saveCanvasState();

    // Set up event listeners
    this._setupEventListeners();

    console.log("Canvas history manager initialized");
  }

  /**
   * Set up all event listeners for tracking canvas changes
   * @private
   */
  _setupEventListeners() {
    if (!this.canvas) return;

    // Remove any existing listeners first
    this._removeEventListeners();

    // Add listeners for all state-changing events
    this.canvas.on("object:added", () => {
      if (!this._isApplyingState) this._debouncedSaveState();
    });

    this.canvas.on("object:modified", () => {
      if (!this._isApplyingState) this._debouncedSaveState();
    });

    this.canvas.on("object:removed", () => {
      if (!this._isApplyingState && !this._isClearingCanvas) this._debouncedSaveState();
    });

    // Special events
    this.canvas.on("path:created", () => {
      if (!this._isApplyingState) this._debouncedSaveState();
    });

    this.canvas.on("text:changed", () => {
      if (!this._isApplyingState) this._debouncedSaveState();
    });

    // Handle filter changes
    this._pendingFilterSave = false;
    this.canvas.on("after:render", () => {
      if (this._pendingFilterSave) {
        this._pendingFilterSave = false;
        this._debouncedSaveState();
      }
    });
  }

  /**
   * Debounced version of saveCanvasState to avoid unnecessary saves
   * @private
   */
  _debouncedSaveState() {
    clearTimeout(this._debounceTimeout);
    this._debounceTimeout = setTimeout(() => {
      this._saveCanvasState();
    }, 200); // 200ms debounce time
  }

  /**
   * Remove event listeners
   * @private
   */
  _removeEventListeners() {
    if (!this.canvas) return;

    this.canvas.off("object:added");
    this.canvas.off("object:modified");
    this.canvas.off("object:removed");
    this.canvas.off("path:created");
    this.canvas.off("text:changed");
    this.canvas.off("after:render");
  }

  /**
   * Enhanced _saveCanvasState with better image handling
   * @private
   */
  _saveCanvasState() {
    if (!this.canvas || this._isApplyingState) return;

    try {
      console.log("Saving canvas state");

      // Ensure all image objects are properly prepared before saving state
      const allObjects = this.canvas.getObjects();
      allObjects.forEach(obj => {
        if (obj.type === 'image') {
          // Ensure image has proper ID if missing
          if (!obj.id) {
            obj.id = this._generateUniqueId();
          }

          // Store current scale and position information explicitly
          obj._savedState = {
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            width: obj.width,
            height: obj.height,
            left: obj.left,
            top: obj.top
          };

          // Ensure source URL is accessible for restoration
          if (obj._element && obj._element.src && !obj.src) {
            obj.src = obj._element.src;
          }
        }
      });

      // Get the complete canvas state with all important properties
      const jsonState = this.canvas.toJSON(this.propertiesToInclude);

      // Process filters for better serialization
      this._processFilters(jsonState);

      // Clear redo history when a new action is performed
      this.redoHistory = [];

      // Add new state to history
      this.history.push(jsonState);

      // Limit history size (optional)
      if (this.history.length > 50) {
        this.history.shift();
      }

      console.log(`History state saved (${this.history.length} states)`);

      // Reset pending filter save flag
      this._pendingFilterSave = false;
      this._lastFilteredImage = null;
    } catch (error) {
      console.error("Error saving canvas state:", error);
    }
  }

  /**
   * Process filters to ensure proper serialization
   * @param {Object} jsonState - Canvas state with objects
   * @private
   */
  _processFilters(jsonState) {
    if (!jsonState || !jsonState.objects) return;

    jsonState.objects.forEach(obj => {
      if (obj.type === 'image' && obj.filters && obj.filters.length > 0) {
        console.log(`Processing ${obj.filters.length} filters for image object`);

        // Store additional properties to help with filter restoration
        // This helps prevent disappearing images with multiple filters
        if (!obj._filterBackup) {
          obj._filterBackup = {
            count: obj.filters.length,
            width: obj.width,
            height: obj.height,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            left: obj.left,
            top: obj.top,
            angle: obj.angle || 0,
            flipX: obj.flipX || false,
            flipY: obj.flipY || false,
            originX: obj.originX || 'center',
            originY: obj.originY || 'center'
          };
        }

        // Store the image source for recovery
        if (obj.src) {
          obj._originalSrc = obj.src;
        }

        // Create reliable serializable filter representations
        obj.filters = obj.filters.map((filter, index) => {
          if (!filter) return null;

          // Get filter type
          const filterType = this._getFilterType(filter);
          console.log(`  Filter ${index}: ${filterType}`);

          // Create a serialized representation with ALL properties
          const serializedFilter = {
            type: filterType,
            index: index, // Store index for proper order restoration
            _version: 2    // Add version to identify enhanced serialization
          };

          // Handle different filter types with their specific properties
          switch(filterType) {
            case 'Grayscale':
              // No extra properties needed
              break;
            case 'Sepia':
              // No extra properties needed
              break;
            case 'Invert':
              // No extra properties needed
              break;
            case 'Blur':
              serializedFilter.blur = filter.blur || 0.5;
              break;
            case 'Brightness':
              serializedFilter.brightness = filter.brightness || 0.1;
              break;
            case 'Contrast':
              serializedFilter.contrast = filter.contrast || 0.25;
              break;
            case 'Saturation':
              serializedFilter.saturation = filter.saturation || 0.3;
              break;
            case 'Noise':
              serializedFilter.noise = filter.noise || 100;
              break;
            case 'Pixelate':
              serializedFilter.blocksize = filter.blocksize || 10;
              break;
            case 'ColorMatrix':
              // For ColorMatrix, store the actual matrix values
              if (filter.matrix) {
                serializedFilter.matrix = [...filter.matrix];
              }
              break;
            case 'Convolute':
              // For Convolute, store the matrix
              if (filter.matrix) {
                serializedFilter.matrix = [...filter.matrix];
              }
              break;
            default:
              // For unknown filters, copy all non-function properties
              Object.keys(filter).forEach(key => {
                if (typeof filter[key] !== 'function' &&
                    !['canvas', 'webgl', '_webgl', 'programSource', 'resources'].includes(key)) {
                  serializedFilter[key] = filter[key];
                }
              });
          }

          return serializedFilter;
        });

        // Filter out any null entries
        obj.filters = obj.filters.filter(f => f !== null);

        // Sort filters by index to maintain correct order
        obj.filters.sort((a, b) => (a.index || 0) - (b.index || 0));
      }

      // Handle nested objects (recursive)
      if ((obj.type === 'group' || obj.type === 'activeSelection') && obj.objects) {
        this._processFilters({ objects: obj.objects });
      }
    });
  }

  /**
   * Get the filter type name
   * @param {Object} filter - Fabric.js filter object
   * @returns {string} Filter type name
   * @private
   */
  _getFilterType(filter) {
    if (!filter) return 'Unknown';

    // Try to get the type directly from the filter object
    if (filter.type) {
      return filter.type;
    }

    // Try to get the type from constructor name
    if (filter.constructor && filter.constructor.name) {
      return filter.constructor.name;
    }

    // Check for specific properties to determine filter type
    if (filter.brightness !== undefined) return 'Brightness';
    if (filter.contrast !== undefined) return 'Contrast';
    if (filter.blur !== undefined) return 'Blur';
    if (filter.saturation !== undefined) return 'Saturation';
    if (filter.noise !== undefined) return 'Noise';
    if (filter.blocksize !== undefined) return 'Pixelate';
    if (filter.matrix) {
      // Discriminate between ColorMatrix and Convolute
      if (filter.matrix.length === 16 || filter.matrix.length === 20) {
        return 'ColorMatrix';
      } else if (filter.matrix.length === 9) {
        return 'Convolute';
      }
    }

    // Fallback for filters without distinctive properties
    if (filter.invert) return 'Invert';
    if (filter.gray) return 'Grayscale';
    if (filter.sepia) return 'Sepia';

    // Fallback to checking against known filters using toString
    const filterNames = [
      'Grayscale', 'Sepia', 'Invert', 'Blur', 'Brightness',
      'Contrast', 'Saturation', 'Noise', 'Pixelate', 'ColorMatrix', 'Convolute'
    ];

    for (const name of filterNames) {
      if (Object.prototype.toString.call(filter).includes(name)) {
        return name;
      }
    }

    // Last resort: check if the filter has certain methods that are typical
    if (typeof filter.applyTo === 'function') {
      if (typeof filter.getFragmentSource === 'function') {
        return 'WebGLFilter'; // Generic WebGL filter
      }
      return 'Filter'; // Generic filter
    }

    return 'Unknown';
  }

  /**
   * Create a proper filter object from serialized data
   * @param {Object} filterDataArray - Serialized filter data
   * @returns {Object} Fabric.js filter instance
   * @private
   */
  _createFiltersFromData(filterDataArray) {
    if (!filterDataArray || !Array.isArray(filterDataArray) || filterDataArray.length === 0) {
      return [];
    }

    const { fabric } = window;
    if (!fabric || !fabric.Image || !fabric.Image.filters) {
      console.error("Fabric filters not available");
      return [];
    }

    const filters = fabric.Image.filters;
    const result = [];

    // Sort by index first to maintain correct order
    const sortedFilters = [...filterDataArray].sort((a, b) => (a.index || 0) - (b.index || 0));

    for (const filterData of sortedFilters) {
      if (!filterData) continue;

      let filter = null;
      
      try {
        switch(filterData.type) {
          case 'Grayscale':
            filter = new filters.Grayscale();
            break;
          case 'Sepia':
            filter = new filters.Sepia();
            break;
          case 'Invert':
            filter = new filters.Invert();
            break;
          case 'Blur':
            filter = new filters.Blur({
              blur: filterData.blur || 0.5
            });
            break;
          case 'Brightness':
            filter = new filters.Brightness({
              brightness: filterData.brightness || 0.1
            });
            break;
          case 'Contrast':
            filter = new filters.Contrast({
              contrast: filterData.contrast || 0.25
            });
            break;
          case 'Saturation':
            filter = new filters.Saturation({
              saturation: filterData.saturation || 0.3
            });
            break;
          case 'Noise':
            filter = new filters.Noise({
              noise: filterData.noise || 100
            });
            break;
          case 'Pixelate':
            filter = new filters.Pixelate({
              blocksize: filterData.blocksize || 10
            });
            break;
          case 'ColorMatrix':
            if (filterData.matrix && Array.isArray(filterData.matrix)) {
              filter = new filters.ColorMatrix({
                matrix: filterData.matrix
              });
            }
            break;
          case 'Convolute':
            if (filterData.matrix && Array.isArray(filterData.matrix)) {
              filter = new filters.Convolute({
                matrix: filterData.matrix
              });
            }
            break;
          default:
            console.warn(`Unknown filter type: ${filterData.type}`);
            continue;
        }

        // Copy any additional properties
        if (filter) {
          for (const key in filterData) {
            if (key !== 'type' && key !== 'index' && key !== '_version' && 
                filterData.hasOwnProperty(key) &&
                typeof filterData[key] !== 'function') {
              filter[key] = filterData[key];
            }
          }
          
          result.push(filter);
        }
      } catch (error) {
        console.error(`Error creating filter ${filterData.type}:`, error);
      }
    }

    return result;
  }

  /**
   * Clear canvas without triggering history saves
   * @private
   */
  _clearCanvas() {
    if (!this.canvas) return;

    this._isClearingCanvas = true;
    const objects = this.canvas.getObjects().slice();
    objects.forEach(obj => this.canvas.remove(obj));
    this._isClearingCanvas = false;
  }
  /**
   * Enhanced method for restoring image objects with their filters
   * This is the core of fixing the multiple filter disappearing issue
   */
  async _restoreImageWithFilters(imageObj) {
    if (!imageObj || imageObj.type !== 'image') return false;

    try {
      console.log(`Restoring image with ${imageObj.filters?.length || 0} filters`);

      // Store original image source URL to prevent disappearance
      const originalSrc = imageObj.src || 
                          imageObj._originalSrc || 
                          (imageObj._element && imageObj._element.src) ||
                          (imageObj._filterBackup && imageObj._filterBackup.src);
      
      // Comprehensive backup of the image properties before filter application
      // This is critical to prevent image disappearance after multiple filters
      const imageBackup = {
        scaleX: imageObj.scaleX,
        scaleY: imageObj.scaleY,
        width: imageObj.width,
        height: imageObj.height,
        left: imageObj.left,
        top: imageObj.top,
        angle: imageObj.angle || 0,
        flipX: imageObj.flipX || false,
        flipY: imageObj.flipY || false,
        opacity: imageObj.opacity || 1,
        originX: imageObj.originX || 'center',
        originY: imageObj.originY || 'center',
        src: originalSrc
      };
      
      // Check if we need to fully recreate the image from source
      const needsRecreation = !imageObj._element || !imageObj._element.complete;

      if (needsRecreation && originalSrc) {
        console.log("Image needs full recreation from source");
        
        // Create a new image element from scratch
        return new Promise((resolve) => {
          fabric.Image.fromURL(originalSrc, (newImg) => {
            if (!newImg) {
              console.error("Failed to recreate image from source");
              resolve(false);
              return;
            }
            
            // Apply all the original properties
            newImg.set({
              left: imageBackup.left,
              top: imageBackup.top,
              scaleX: imageBackup.scaleX,
              scaleY: imageBackup.scaleY,
              angle: imageBackup.angle,
              flipX: imageBackup.flipX,
              flipY: imageBackup.flipY,
              opacity: imageBackup.opacity,
              originX: imageBackup.originX,
              originY: imageBackup.originY
            });
            
            // Apply filters if needed
            if (imageObj.filters && imageObj.filters.length > 0) {
              try {
                // Recreate the filters
                const recreatedFilters = this._createFiltersFromData(imageObj.filters);
                if (recreatedFilters.length > 0) {
                  newImg.filters = recreatedFilters;
                  newImg.applyFilters();
                }
              } catch (filterError) {
                console.error("Error applying filters to recreated image:", filterError);
              }
            }
            
            // Replace the old image with the new one
            if (this.canvas) {
              this.canvas.remove(imageObj);
              this.canvas.add(newImg);
              
              // Set as active object if needed
              if (this.canvas.getActiveObject() === imageObj) {
                this.canvas.setActiveObject(newImg);
              }
              
              this.canvas.requestRenderAll();
              console.log("Image successfully recreated from source");
            }
            
            resolve(true);
          }, { crossOrigin: 'anonymous' });
        });
      }

      // Ensure element is loaded for filter application with standard approach
      if (imageObj._element && !imageObj._element.complete) {
        console.log("Waiting for image element to load");
        await new Promise((resolve) => {
          try {
            const onLoad = () => {
              if (imageObj._element) {
                imageObj._element.removeEventListener('load', onLoad);
              }
              resolve();
            };

            imageObj._element.addEventListener('load', onLoad);
            
            // Add a timeout to avoid hanging
            setTimeout(resolve, 2000);
          } catch (error) {
            console.error("Error while waiting for image to load:", error);
            resolve(); // Resolve anyway to prevent hanging
          }
        });
      }

      // If the image doesn't have an element or the element got lost, recreate it
      if (!imageObj._element && originalSrc) {
        console.log("Image element missing, trying to recreate it");
        
        // Try to recreate the image element from src
        await new Promise((resolve) => {
          fabric.Image.fromURL(originalSrc, (img) => {
            if (img && img._element) {
              imageObj._element = img._element;
              console.log("Successfully recreated image element");
            }
            resolve();
          }, { crossOrigin: 'anonymous' });
        });
      }

      // If the image has filters, properly recreate and apply them
      if (imageObj.filters && imageObj.filters.length > 0) {
        try {
          console.log(`Processing ${imageObj.filters.length} filters`);
          
          // Create proper filter instances from the serialized data
          const properFilters = this._createFiltersFromData(imageObj.filters);
          
          // Replace the serialized filters with proper instances
          imageObj.filters = properFilters;
          
          console.log(`Recreated ${properFilters.length} filters for image`);
          
          // Apply filters with error handling
          if (typeof imageObj.applyFilters === 'function') {
            try {
              // Apply filters and give it time to complete
              imageObj.applyFilters();
              
              // Allow a small delay for the rendering to complete
              await new Promise(resolve => setTimeout(resolve, 100));
              
              console.log("Filters applied successfully");
            } catch (filterError) {
              console.error("Error applying filters:", filterError);
              
              // If filter application fails, try a more cautious approach
              try {
                // Apply filters one by one for better error isolation
                properFilters.forEach((filter, index) => {
                  try {
                    imageObj.filters = [filter];
                    imageObj.applyFilters();
                    console.log(`Applied filter ${index} individually`);
                  } catch (e) {
                    console.error(`Error applying filter ${index}:`, e);
                  }
                });
                
                // Restore the full filter array
                imageObj.filters = properFilters;
              } catch (e) {
                console.error("Failed to apply filters individually:", e);
              }
            }
          }
        } catch (filterProcessError) {
          console.error("Error processing filters:", filterProcessError);
        }
      }

      // Restore saved state and dimensions to prevent image disappearance
      if (imageObj._filterBackup) {
        // Use comprehensive filter backup if available
        if (imageObj._filterBackup.width && imageObj._filterBackup.height) {
          // Don't directly replace dimensions to avoid precision issues
          const scaleXDiff = Math.abs(imageObj.scaleX - imageObj._filterBackup.scaleX);
          const scaleYDiff = Math.abs(imageObj.scaleY - imageObj._filterBackup.scaleY);
          
          if (scaleXDiff > 0.001) imageObj.scaleX = imageObj._filterBackup.scaleX;
          if (scaleYDiff > 0.001) imageObj.scaleY = imageObj._filterBackup.scaleY;
          
          // Only restore position if it seems like it changed significantly
          const leftDiff = Math.abs(imageObj.left - imageObj._filterBackup.left);
          const topDiff = Math.abs(imageObj.top - imageObj._filterBackup.top);
          
          if (leftDiff > 1) imageObj.left = imageObj._filterBackup.left;
          if (topDiff > 1) imageObj.top = imageObj._filterBackup.top;
          
          // Restore angle and flip states if they were saved
          if (imageObj._filterBackup.angle !== undefined) {
            imageObj.angle = imageObj._filterBackup.angle;
          }
          
          if (imageObj._filterBackup.flipX !== undefined) {
            imageObj.flipX = imageObj._filterBackup.flipX;
          }
          
          if (imageObj._filterBackup.flipY !== undefined) {
            imageObj.flipY = imageObj._filterBackup.flipY;
          }
        }
      } else {
        // Use our backup values if no filter backup exists
        imageObj.set(imageBackup);
      }

      // Force the image to update its visual properties
      imageObj._renderDirty = true;
      imageObj.dirty = true;

      // Ensure coordinates are updated
      imageObj.setCoords();

      return true;
    } catch (error) {
      console.error("Error restoring image with filters:", error);
      
      // Recovery attempt for disappeared image
      try {
        if (imageObj && originalSrc) {
          console.log("Attempting recovery of disappeared image");
          
          // Try to completely recreate the image from source
          return new Promise((resolve) => {
            fabric.Image.fromURL(originalSrc, (newImg) => {
              if (newImg) {
                // Copy important properties
                newImg.set({
                  left: imageObj.left,
                  top: imageObj.top,
                  scaleX: imageObj.scaleX,
                  scaleY: imageObj.scaleY,
                  angle: imageObj.angle,
                  flipX: imageObj.flipX,
                  flipY: imageObj.flipY,
                  opacity: imageObj.opacity,
                  originX: imageObj.originX || 'center',
                  originY: imageObj.originY || 'center'
                });
                
                // Replace the broken image with the new one
                if (this.canvas) {
                  this.canvas.remove(imageObj);
                  this.canvas.add(newImg);
                  
                  // Try to reselect the image if it was selected
                  if (this.canvas.getActiveObject() === imageObj) {
                    this.canvas.setActiveObject(newImg);
                  }
                  
                  this.canvas.requestRenderAll();
                  console.log("Image recovered successfully");
                  resolve(true);
                } else {
                  resolve(false);
                }
              } else {
                resolve(false);
              }
            }, { crossOrigin: 'anonymous' });
          });
        }
      } catch (recoveryError) {
        console.error("Recovery attempt failed:", recoveryError);
      }
      
      return false;
    }
  }
  /**
   * Get IDs of currently selected objects
   * @returns {Array} Array of object IDs
   * @private
   */
  _getSelectedObjectIds() {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject) return [];

    const ids = [];

    if (activeObject.type === 'activeSelection') {
      // For multiple selections, get all object IDs
      activeObject.getObjects().forEach(obj => {
        ids.push(obj.id || obj.cacheKey);
      });
    } else {
      // Single object
      ids.push(activeObject.id || activeObject.cacheKey);
    }

    return ids;
  }

  /**
   * Generate a unique ID for objects
   * @returns {string} Unique ID
   * @private
   */
  _generateUniqueId() {
    return `obj_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }

  /**
   * Apply a saved state to the canvas
   * @param {Object} state - Saved canvas state to restore
   * @returns {Promise} Promise that resolves when state is applied
   * @private
   */
  async _applyCanvasState(state) {
    if (!this.canvas || !state) {
      console.error("Cannot apply state: Canvas or state is missing");
      return;
    }

    // Prevent recursive application
    if (this._isApplyingState) {
      console.warn("Already applying state, waiting...");
      
      // Wait a moment and try again, rather than aborting
      return new Promise((resolve) => {
        setTimeout(async () => {
          // Check again after delay
          if (this._isApplyingState) {
            console.error("Still applying previous state, aborting");
            resolve();
            return;
          }
          
          try {
            await this._applyCanvasState(state);
            resolve();
          } catch (error) {
            console.error("Error applying state on retry:", error);
            resolve();
          }
        }, 300);
      });
    }

    // Get current active objects for possible restoration after load
    const activeObjectIds = this._getSelectedObjectIds();
    
    // Store current activeTool state for restoration
    const currentActiveTool = window.fabricComponent ? window.fabricComponent.activeTool : null;
    console.log(`Preserving activeTool: ${currentActiveTool}`);
    
    // Check if we need to preserve image selection (for uploads panel)
    const wasUploadsActive = currentActiveTool === 'uploads';
    const hadImageSelected = wasUploadsActive && 
                            window.fabricComponent?.uploads?.selectedImage !== null;
    
    // Remember currently selected image for re-selection
    const currentSelectedImageId = hadImageSelected ? 
                                  (window.fabricComponent.uploads.selectedImage.id || null) : null;
    
    // Remember object type for smarter re-selection
    const currentSelectedObjectType = hadImageSelected ? 
                                     window.fabricComponent.uploads.selectedImage.type : null;

    // Set the flag to prevent registering new history states during load
    this._isApplyingState = true;

    // Log number of objects about to be loaded
    const objCount = state.objects ? state.objects.length : 0;
    console.log(`Loading state with ${objCount} objects...`);

    // Return a promise that resolves when the canvas is fully loaded and processed
    return new Promise((resolve, reject) => {
      try {
        // First clear the canvas completely
        this._clearCanvas();

        // Load the state JSON with a callback
        this.canvas.loadFromJSON(state, async () => {
          try {
            console.log("State JSON loaded, post-processing objects...");

            // Identify all image objects that need filter restoration
            const allObjects = this.canvas.getObjects();
            const imageObjects = allObjects.filter(obj => obj.type === 'image');
            const textObjects = allObjects.filter(obj => obj.type && obj.type.includes('text'));
            const pathObjects = allObjects.filter(obj => obj.type === 'path');

            console.log(`Found ${imageObjects.length} image objects, ${textObjects.length} text objects, and ${pathObjects.length} path objects to restore`);

            // Process each image object separately for better control
            const imageRestorePromises = [];
            for (const imageObj of imageObjects) {
              imageRestorePromises.push(this._restoreImageWithFilters(imageObj));
            }

            // Wait for all image restorations to complete
            await Promise.all(imageRestorePromises);

            // Process text objects with special handling
            for (const textObj of textObjects) {
              // Handle curved text specifically
              if (textObj.type === 'curved-text') {
                // Ensure the curved text is properly initialized
                if (typeof textObj._initializeCanvas === 'function') {
                  try {
                    textObj._initializeCanvas();
                    textObj.refreshCtx(true);
                  } catch (e) {
                    console.error("Error initializing curved text canvas:", e);
                  }
                }
              }

              // Fix text objects with proper dimensions
              if (textObj.width <= 0) textObj.width = 200;
              if (textObj.height <= 0) textObj.height = 30;
              
              // Ensure text is properly rendered
              textObj.dirty = true;
            }
            
            // Process path objects from drawings
            for (const pathObj of pathObjects) {
              // Ensure path objects are properly configured
              pathObj.set({
                erasable: true, // Make sure they can be erased
                dirty: true     // Force re-render
              });
            }

            // Wait for final post-processing
            await this._postProcessObjects(activeObjectIds);

            // Restore activeTool if it was changed
            if (currentActiveTool && window.fabricComponent) {
              window.fabricComponent.activeTool = currentActiveTool;
              console.log(`Restored activeTool to: ${currentActiveTool}`);
              
              // If we're in drawing mode, reactivate the drawing tool
              if (currentActiveTool === 'drawing' && 
                  window.fabricComponent.drawing &&
                  typeof window.fabricComponent.drawing.updateDrawingMode === 'function') {
                  
                // Wait a bit before reactivating drawing mode
                setTimeout(() => {
                  // Make sure drawing mode is properly reactivated
                  if (window.fabricComponent.drawing.activeTab) {
                    window.fabricComponent.drawing.updateDrawingMode(
                      window.fabricComponent.drawing.activeTab
                    );
                    console.log(`Reactivated drawing mode: ${window.fabricComponent.drawing.activeTab}`);
                  }
                }, 100);
              }
            }
            
            // Special handling for uploads panel - try to select an image if one was selected before
            if (wasUploadsActive && imageObjects.length > 0) {
              console.log(`Trying to restore image selection for uploads panel`);
              
              let imageToSelect = null;
              
              // First try to find the exact same image by ID
              if (currentSelectedImageId) {
                imageToSelect = imageObjects.find(img => img.id === currentSelectedImageId);
              }
              
              // If we couldn't find the exact same image, just select the first image
              if (!imageToSelect && imageObjects.length > 0) {
                imageToSelect = imageObjects[0];
              }
              
              // If we found an image to select, select it
              if (imageToSelect) {
                console.log(`Re-selecting image for uploads panel`);
                this.canvas.setActiveObject(imageToSelect);
                
                // Update uploads component selection
                if (window.fabricComponent?.uploads) {
                  window.fabricComponent.uploads.selectedObject = imageToSelect;
                  window.fabricComponent.uploads.selectedImage = imageToSelect;
                  if (typeof window.fabricComponent.uploads.syncObjectProperties === 'function') {
                    window.fabricComponent.uploads.syncObjectProperties();
                  }
                }
              }
            }

            // Re-render the canvas
            this.canvas.requestRenderAll();

            // Clear the flag when complete
            this._isApplyingState = false;

            // Resolve the promise
            resolve();
          } catch (error) {
            console.error("Error in post-processing during state application:", error);
            this._isApplyingState = false;
            reject(error);
          }
        });
      } catch (error) {
        console.error("Error applying canvas state:", error);
        this._isApplyingState = false;
        reject(error);
      }
    });
  }

  /**
   * Post-process objects after state restoration
   * @param {Array} activeObjectIds - IDs of objects that were previously selected
   * @returns {Promise} Promise that resolves when post-processing is complete
   * @private
   */
  async _postProcessObjects(activeObjectIds = []) {
    try {
      console.log(`Post-processing with ${activeObjectIds.length} previously selected objects`);

      // Collect objects to select
      const objectsToSelect = [];
      
      // Track if any image with filters was found
      let foundFilteredImage = false;
      let foundTextObject = false;

      // Process all objects
      const allObjects = this.canvas.getObjects();
      
      allObjects.forEach(obj => {
        // Check if this object was previously selected
        const wasSelected = activeObjectIds.includes(obj.id || obj.cacheKey);
        
        // Extra handling for images with filters
        if (obj.type === 'image') {
          // If the image has filters, make sure they're properly applied
          if (obj.filters && obj.filters.length > 0) {
            foundFilteredImage = true;
            
            try {
              // Double-check filters are properly initialized
              const properFilters = this._createFiltersFromData(obj.filters);
              if (properFilters.length > 0 && 
                  JSON.stringify(properFilters) !== JSON.stringify(obj.filters)) {
                console.log(`Reapplying ${properFilters.length} filters to ensure consistency`);
                obj.filters = properFilters;
                obj.applyFilters();
              }
            } catch (filterError) {
              console.error("Error checking image filters during post-processing:", filterError);
            }
          }
        }
        // Special handling for text objects, especially curved text
        else if (obj.type && obj.type.includes('text')) {
          foundTextObject = true;
          
          // Special handling for curved text
          if (obj.type === 'curved-text') {
            try {
              // Make sure curved text is properly initialized
              if (typeof obj._initializeCanvas === 'function') {
                obj._initializeCanvas();
                obj.refreshCtx(true);
              }
            } catch (textError) {
              console.error("Error initializing curved text during post-processing:", textError);
            }
          }
        }
        
        // Add to selection if it was previously selected
        if (wasSelected) {
          objectsToSelect.push(obj);
        }
      });

      // Check for uploads panel state and handle special cases
      const fabricComponent = window.fabricComponent;
      const isUploadsActive = fabricComponent && fabricComponent.activeTool === 'uploads';
      const isTextActive = fabricComponent && fabricComponent.activeTool === 'text';
      
      if (isUploadsActive && !objectsToSelect.length && fabricComponent.uploads) {
        // In uploads panel but no selection - try to select an image
        const imageObjects = allObjects.filter(obj => obj.type === 'image');
        
        if (imageObjects.length > 0) {
          console.log("Uploads panel active but no selection, selecting first image");
          objectsToSelect.push(imageObjects[0]);
          
          // Update uploads component
          fabricComponent.uploads.selectedObject = imageObjects[0];
          fabricComponent.uploads.selectedImage = imageObjects[0];
          if (typeof fabricComponent.uploads.syncObjectProperties === 'function') {
            fabricComponent.uploads.syncObjectProperties();
          }
        }
      }
      // Similar handling for text panel
      else if (isTextActive && !objectsToSelect.length && window.textComponent) {
        // In text panel but no selection - try to select a text object
        const textObjects = allObjects.filter(obj => obj.type && obj.type.includes('text'));
        
        if (textObjects.length > 0) {
          console.log("Text panel active but no selection, selecting first text object");
          objectsToSelect.push(textObjects[0]);
          
          // Update text component
          window.textComponent.selectedObject = textObjects[0];
          if (typeof window.textComponent.syncTextProperties === 'function') {
            window.textComponent.syncTextProperties(textObjects[0]);
          }
        }
      }

      // Restore selection if needed
      if (objectsToSelect.length > 0) {
        console.log(`Restoring selection for ${objectsToSelect.length} objects`);

        if (objectsToSelect.length === 1) {
          // Single object selection
          this.canvas.setActiveObject(objectsToSelect[0]);
        } else if (objectsToSelect.length > 1) {
          // Multi-object selection
          try {
            const { ActiveSelection } = window.fabric;
            const activeSelection = new ActiveSelection(objectsToSelect, {
              canvas: this.canvas
            });
            this.canvas.setActiveObject(activeSelection);
          } catch (selectionError) {
            console.error("Error creating multi-selection:", selectionError);
            
            // Fallback to selecting just the first object
            this.canvas.setActiveObject(objectsToSelect[0]);
          }
        }
      }

      // Give the canvas time to update selections
      return new Promise(resolve => {
        // Force one more render to make sure everything is displayed correctly
        this.canvas.requestRenderAll();
        setTimeout(resolve, 100);
      });
    } catch (error) {
      console.error("Error in post-processing objects:", error);
      return Promise.resolve(); // Resolve anyway to prevent hanging
    }
  }

  /**
   * Enhanced filterApplied method
   * Properly handles filter application tracking
   * @param {Object} imageObject - The image object that had filters applied
   */
  filterApplied(imageObject = null) {
    // Set flag to trigger state save after render
    this._pendingFilterSave = true;

    // Store reference to the modified image
    if (imageObject) {
      this._lastFilteredImage = imageObject;

      // Ensure we have the source for recovery
      const imgSrc = imageObject.src || 
                    (imageObject._element && imageObject._element.src) || 
                    (imageObject._originalSrc);
      
      if (imgSrc && !imageObject._originalSrc) {
        imageObject._originalSrc = imgSrc;
      }

      // Backup filter count and image state
      if (imageObject.filters) {
        // Create a comprehensive backup of the image state
        imageObject._filterBackup = {
          count: imageObject.filters.length,
          width: imageObject.width,
          height: imageObject.height,
          scaleX: imageObject.scaleX,
          scaleY: imageObject.scaleY,
          left: imageObject.left,
          top: imageObject.top,
          angle: imageObject.angle || 0,
          flipX: imageObject.flipX || false,
          flipY: imageObject.flipY || false,
          originX: imageObject.originX || 'center',
          originY: imageObject.originY || 'center',
          src: imgSrc,
          timestamp: Date.now() // Add timestamp for tracking order of operations
        };
      }
      
      // Make sure image has an ID for reliable tracking
      if (!imageObject.id) {
        imageObject.id = this._generateUniqueId();
      }
    }

    // Force an immediate save state rather than waiting for debounce
    // This is critical for multiple filter operations
    clearTimeout(this._debounceTimeout);
    
    // This will save a complete snapshot of the canvas state including all filter information
    this._saveCanvasState();
    
    // Debug log
    console.log("Filter application registered and state saved");
  }

  /**
   * Helper to sync UI state with current text object when undo/redo is performed
   * @returns {Object|null} Text data if active object is text, null otherwise
   * @private
   */
  _getActiveTextData() {
    if (!this.canvas || !this.canvas.getActiveObject()) return null;
    
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject.type || !activeObject.type.includes('text')) return null;
    
    // Create a map of text properties for UI synchronization
    const textData = {
      type: activeObject.type,
      fontFamily: activeObject.fontFamily,
      fontSize: activeObject.fontSize,
      fontWeight: activeObject.fontWeight,
      fontStyle: activeObject.fontStyle,
      underline: activeObject.underline,
      fill: activeObject.fill,
      stroke: activeObject.stroke,
      strokeWidth: activeObject.strokeWidth,
      charSpacing: activeObject.charSpacing,
      lineHeight: activeObject.lineHeight,
      textAlign: activeObject.textAlign,
      opacity: activeObject.opacity,
      angle: activeObject.angle,
      scaleX: activeObject.scaleX,
      scaleY: activeObject.scaleY,
      skewX: activeObject.skewX,
      skewY: activeObject.skewY
    };
    
    // Add shadow data if present
    if (activeObject.shadow) {
      textData.shadow = {
        color: activeObject.shadow.color,
        blur: activeObject.shadow.blur,
        offsetX: activeObject.shadow.offsetX,
        offsetY: activeObject.shadow.offsetY
      };
    }
    
    // Add curved text data if it's a curved text object
    if (activeObject.type === 'curved-text') {
      textData.curved = {
        diameter: activeObject.diameter,
        flipped: activeObject.flipped,
        percentage: activeObject.percentage,
        rotateAngle: activeObject.rotateAngle
      };
    }
    
    return {
      objectId: activeObject.id,
      textData: textData
    };
  }

  /**
   * Undo the last action
   * @returns {Promise} Promise that resolves when undo is complete
   */
  async undo() {
    if (this.history.length <= 1) {
      console.log("No more undo states available");
      return;
    }

    try {
      // Track if we had a text object selected before undo
      let wasTextObjectSelected = false;
      let selectedTextData = null;

      // Store selection data
      if (this.canvas.getActiveObject()) {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject && activeObject.type && activeObject.type.includes('text')) {
          wasTextObjectSelected = true;
          selectedTextData = {
            id: activeObject.id || null,
            text: activeObject.text || "",
            type: activeObject.type,
            left: activeObject.left,
            top: activeObject.top
          };
          console.log("Text object selected before undo:", selectedTextData);
        }
      }

      // Move current state to redo history
      const currentState = this.history.pop();
      this.redoHistory.push(currentState);

      // Get the previous state
      const previousState = this.history[this.history.length - 1];

      // Apply the previous state
      await this._applyCanvasState(previousState);

      // Attempt to reselect the text object
      if (wasTextObjectSelected) {
        // Find matching text object by ID first
        let foundObject = null;
        
        if (selectedTextData.id) {
          foundObject = this.canvas.getObjects().find(obj => 
            obj.id === selectedTextData.id && obj.type && obj.type.includes('text')
          );
        }
        
        // If not found by ID, try to find by position and content
        if (!foundObject) {
          foundObject = this.canvas.getObjects().find(obj => 
            obj.type && obj.type.includes('text') && 
            Math.abs(obj.left - selectedTextData.left) < 10 &&
            Math.abs(obj.top - selectedTextData.top) < 10
          );
        }
        
        // Last resort - find any text object with similar content
        if (!foundObject && selectedTextData.text) {
          foundObject = this.canvas.getObjects().find(obj => 
            obj.type && obj.type.includes('text') && 
            obj.text && obj.text.includes(selectedTextData.text.substring(0, 10))
          );
        }
        
        // If we found a matching text object, select it
        if (foundObject) {
          console.log("Reselecting text object after undo");
          this.canvas.setActiveObject(foundObject);
          this.canvas.requestRenderAll();
          
          // Dispatch a custom event to notify components that selection was restored
          const event = new CustomEvent('history:selection:restored', { 
            detail: { object: foundObject, type: 'text' }
          });
          window.dispatchEvent(event);
        }
      }
      
      // Dispatch event that undo is complete
      const event = new CustomEvent('history:operation:end', { detail: { operation: 'undo' } });
      window.dispatchEvent(event);

    } catch (error) {
      console.error("Error in undo operation:", error);
    }
  }

  /**
   * Redo the last undone action
   * @returns {Promise} Promise that resolves when redo is complete
   */
  async redo() {
    if (this.redoHistory.length === 0) {
      console.log("No more redo states available");
      return;
    }

    try {
      // Track if we have a text object selected before redo
      let wasTextObjectSelected = false;
      let selectedTextData = null;

      // Store selection data
      if (this.canvas.getActiveObject()) {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject && activeObject.type && activeObject.type.includes('text')) {
          wasTextObjectSelected = true;
          selectedTextData = {
            id: activeObject.id || null,
            text: activeObject.text || "",
            type: activeObject.type,
            left: activeObject.left,
            top: activeObject.top
          };
          console.log("Text object selected before redo:", selectedTextData);
        }
      }

      // Get next state from redo history
      const nextState = this.redoHistory.pop();
      
      // Add current state back to history
      this.history.push(nextState);

      // Apply the next state
      await this._applyCanvasState(nextState);

      // Attempt to reselect the text object
      if (wasTextObjectSelected) {
        // Find matching text object by ID first
        let foundObject = null;
        
        if (selectedTextData.id) {
          foundObject = this.canvas.getObjects().find(obj => 
            obj.id === selectedTextData.id && obj.type && obj.type.includes('text')
          );
        }
        
        // If not found by ID, try to find by position and content
        if (!foundObject) {
          foundObject = this.canvas.getObjects().find(obj => 
            obj.type && obj.type.includes('text') && 
            Math.abs(obj.left - selectedTextData.left) < 10 &&
            Math.abs(obj.top - selectedTextData.top) < 10
          );
        }
        
        // Last resort - find any text object with similar content
        if (!foundObject && selectedTextData.text) {
          foundObject = this.canvas.getObjects().find(obj => 
            obj.type && obj.type.includes('text') && 
            obj.text && obj.text.includes(selectedTextData.text.substring(0, 10))
          );
        }
        
        // If we found a matching text object, select it
        if (foundObject) {
          console.log("Reselecting text object after redo");
          this.canvas.setActiveObject(foundObject);
          this.canvas.requestRenderAll();
          
          // Dispatch a custom event to notify components that selection was restored
          const event = new CustomEvent('history:selection:restored', { 
            detail: { object: foundObject, type: 'text' }
          });
          window.dispatchEvent(event);
        }
      }
      
      // Dispatch event that redo is complete
      const event = new CustomEvent('history:operation:end', { detail: { operation: 'redo' } });
      window.dispatchEvent(event);

    } catch (error) {
      console.error("Error in redo operation:", error);
    }
  }

  /**
   * Manually add current state to history
   */
  addState() {
    this._saveCanvasState();
  }

  /**
   * Debug method to help diagnose history issues
   */
  debugHistory() {
    console.log("==== History Manager Debug ====");
    console.log(`History States: ${this.history.length}`);
    console.log(`Redo States: ${this.redoHistory.length}`);
    console.log(`Current Flags: isApplyingState=${this._isApplyingState}, isClearingCanvas=${this._isClearingCanvas}`);

    // Check the latest state
    if (this.history.length > 0) {
      const latestState = this.history[this.history.length - 1];
      console.log(`Latest State Objects: ${latestState.objects?.length || 0}`);

      // Check for images with filters
      if (latestState.objects) {
        const imagesWithFilters = latestState.objects.filter(obj =>
            obj.type === 'image' && obj.filters && obj.filters.length > 0
        );
        console.log(`Images with filters: ${imagesWithFilters.length}`);

        // Log details of the first image with filters
        if (imagesWithFilters.length > 0) {
          console.log("First image filter details:", imagesWithFilters[0].filters);
        }
      }
    }

    console.log("==============================");
  }

  /**
   * Helper to get filter data from current active object for UI synchronization
   * @returns {Object|null} Filter data if active object has filters, null otherwise
   * @private
   */
  _getActiveObjectFilterData() {
    if (!this.canvas || !this.canvas.getActiveObject()) return null;
    
    const activeObject = this.canvas.getActiveObject();
    if (activeObject.type !== 'image' || !activeObject.filters) return null;
    
    // Create a map of filter types to their parameters
    const filterData = {};
    activeObject.filters.forEach((filter, index) => {
      if (!filter) return;
      
      const filterType = this._getFilterType(filter);
      switch(filterType) {
        case 'Brightness':
          filterData.brightness = filter.brightness || 0;
          break;
        case 'Contrast':
          filterData.contrast = filter.contrast || 0;
          break;
        case 'Blur':
          filterData.blur = filter.blur || 0;
          break;
        case 'Saturation':
          filterData.saturation = filter.saturation || 0;
          break;
        // Add other filter types as needed
      }
    });
    
    return {
      objectId: activeObject.id,
      filters: filterData
    };
  }
}

// Singleton instance
let historyManager = null;

// Queue for pending operations
let operationQueue = [];
let isProcessingQueue = false;

/**
 * Process the operation queue
 */
async function processOperationQueue() {
  if (isProcessingQueue || operationQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  // Take the next operation from the queue
  const nextOperation = operationQueue.shift();
  
  try {
    // Execute the operation
    if (nextOperation === 'undo') {
      await performUndo();
    } else if (nextOperation === 'redo') {
      await performRedo();
    }
  } catch (error) {
    console.error(`Error processing ${nextOperation} operation:`, error);
  }
  
  // Mark as done and process next operation if any
  isProcessingQueue = false;
  
  // Small delay before processing next operation
  if (operationQueue.length > 0) {
    setTimeout(() => {
      processOperationQueue();
    }, 100);
  }
}

/**
 * Core undo functionality separated from the exported function
 */
async function performUndo() {
  if (!historyManager) {
    console.error("History manager not initialized");
    return;
  }

  // Store current activeTool state to preserve it
  const currentActiveTool = window.fabricComponent ? window.fabricComponent.activeTool : null;
  
  // Check if uploads panel is active
  const isUploadsActive = currentActiveTool === 'uploads';
  let selectedImage = null;
  
  if (isUploadsActive && window.fabricComponent && window.fabricComponent.uploads) {
    selectedImage = window.fabricComponent.uploads.selectedImage;
  }

  // Check if drawing panel is active
  const isDrawingActive = currentActiveTool === 'drawing';
  
  // Notify components that an undo operation is starting
  window.dispatchEvent(new CustomEvent('history:operation:start', {
    detail: { operation: 'undo', preserveTool: true }
  }));

  // Show visual indication of undo in progress
  const fabricCanvas = document.querySelector('.canvas-container');
  if (fabricCanvas) {
    fabricCanvas.classList.add('history-operation-active');
  }

  // Call the history manager's undo function
  return historyManager.undo().then(() => {
    // Restore the active tool if it changed
    if (currentActiveTool && window.fabricComponent) {
      window.fabricComponent.activeTool = currentActiveTool;
      
      // Special handling for uploads panel
      if (isUploadsActive) {
        window.fabricComponent.activeTool = 'uploads';
        
        // Try to restore image selection for uploads panel
        if (window.canvas && window.fabricComponent.uploads && selectedImage) {
          // This will be handled by the history:operation:end event
          console.log("Uploads panel state will be restored via event listeners");
        }
      }
      
      // Special handling for drawing panel
      if (isDrawingActive && window.fabricComponent.drawing) {
        // Make sure drawing panel is active
        window.fabricComponent.activeTool = 'drawing';
        
        // Wait a bit before trying to restore drawing mode
        setTimeout(() => {
          if (window.fabricComponent.drawing.activeTab && 
              typeof window.fabricComponent.drawing.updateDrawingMode === 'function') {
            console.log("Reactivating drawing mode after undo");
            window.fabricComponent.drawing.updateDrawingMode(
              window.fabricComponent.drawing.activeTab
            );
          }
        }, 100);
      }
    }
    
    // Remove visual indication
    if (fabricCanvas) {
      fabricCanvas.classList.remove('history-operation-active');
    }
  }).catch(error => {
    console.error("Error in undo operation:", error);
    
    // Remove visual indication in case of error
    if (fabricCanvas) {
      fabricCanvas.classList.remove('history-operation-active');
    }
  });
}

/**
 * Core redo functionality separated from the exported function
 */
async function performRedo() {
  if (!historyManager) {
    console.error("History manager not initialized");
    return;
  }

  // Store current activeTool state to preserve it
  const currentActiveTool = window.fabricComponent ? window.fabricComponent.activeTool : null;
  
  // Check if uploads panel is active
  const isUploadsActive = currentActiveTool === 'uploads';
  let selectedImage = null;
  
  if (isUploadsActive && window.fabricComponent && window.fabricComponent.uploads) {
    selectedImage = window.fabricComponent.uploads.selectedImage;
  }
  
  // Check if drawing panel is active
  const isDrawingActive = currentActiveTool === 'drawing';

  // Notify components that a redo operation is starting
  window.dispatchEvent(new CustomEvent('history:operation:start', {
    detail: { operation: 'redo', preserveTool: true }
  }));

  // Show visual indication of redo in progress
  const fabricCanvas = document.querySelector('.canvas-container');
  if (fabricCanvas) {
    fabricCanvas.classList.add('history-operation-active');
  }

  // Call the history manager's redo function
  return historyManager.redo().then(() => {
    // Restore the active tool if it changed
    if (currentActiveTool && window.fabricComponent) {
      window.fabricComponent.activeTool = currentActiveTool;
      
      // Special handling for uploads panel
      if (isUploadsActive) {
        window.fabricComponent.activeTool = 'uploads';
        
        // Try to restore image selection for uploads panel
        if (window.canvas && window.fabricComponent.uploads && selectedImage) {
          // This will be handled by the history:operation:end event
          console.log("Uploads panel state will be restored via event listeners");
        }
      }
      
      // Special handling for drawing panel
      if (isDrawingActive && window.fabricComponent.drawing) {
        // Make sure drawing panel is active
        window.fabricComponent.activeTool = 'drawing';
        
        // Wait a bit before trying to restore drawing mode
        setTimeout(() => {
          if (window.fabricComponent.drawing.activeTab && 
              typeof window.fabricComponent.drawing.updateDrawingMode === 'function') {
            console.log("Reactivating drawing mode after redo");
            window.fabricComponent.drawing.updateDrawingMode(
              window.fabricComponent.drawing.activeTab
            );
          }
        }, 100);
      }
    }
    
    // Remove visual indication
    if (fabricCanvas) {
      fabricCanvas.classList.remove('history-operation-active');
    }
  }).catch(error => {
    console.error("Error in redo operation:", error);
    
    // Remove visual indication in case of error
    if (fabricCanvas) {
      fabricCanvas.classList.remove('history-operation-active');
    }
  });
}

/**
 * Initialize the history manager
 */
export function initHistoryManager() {
  if (!window.canvas) {
    console.error("Cannot initialize history manager - canvas not available");
    return;
  }

  historyManager = new CanvasHistory(window.canvas);

  // Expose to window for debugging
  window.historyManager = historyManager;
  
  // Add CSS for visual feedback during operations
  const style = document.createElement('style');
  style.textContent = `
    .canvas-container.history-operation-active {
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
      transition: box-shadow 0.2s ease-in-out;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Add current state to history
 */
export function addToHistory() {
  if (historyManager) {
    historyManager.addState();
  }
}

/**
 * Notify that a filter has been applied
 * @param {Object} imageObject - Optional image object that had filters applied
 */
export function filterApplied(imageObject = null) {
  if (historyManager) {
    historyManager.filterApplied(imageObject);
  }
}

/**
 * Undo last action on canvas
 */
export function undo() {
  if (!historyManager) {
    console.error("History manager not initialized");
    return;
  }

  // Add undo to operation queue
  if (historyManager._isApplyingState) {
    console.info("Adding undo operation to queue");
    
    // Limit queue size to prevent memory issues
    if (operationQueue.length < 5) {
      operationQueue.push('undo');
      setTimeout(() => processOperationQueue(), 50);
    } else {
      console.warn("Undo queue is full, ignoring additional requests");
    }
    return;
  }

  // Process immediately if no operations in progress
  operationQueue.push('undo');
  processOperationQueue();
}

/**
 * Redo last undone action on canvas
 */
export function redo() {
  if (!historyManager) {
    console.error("History manager not initialized");
    return;
  }

  // Add redo to operation queue
  if (historyManager._isApplyingState) {
    console.info("Adding redo operation to queue");
    
    // Limit queue size to prevent memory issues
    if (operationQueue.length < 5) {
      operationQueue.push('redo');
      setTimeout(() => processOperationQueue(), 50);
    } else {
      console.warn("Redo queue is full, ignoring additional requests");
    }
    return;
  }

  // Process immediately if no operations in progress
  operationQueue.push('redo');
  processOperationQueue();
}