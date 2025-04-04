// src/components/core/canvas-manager.js
export const canvasManagerComponent = () => ({
  // Panel state for text functionality
  isTextActive: false,
  selectedObject: null,

  // UI state for dropdowns and accordions
  showFontDropdown: false,
  showDistortion: false,
  showShadow: false,
  showCurve: false,

  // Text curve properties
  curveValue: 2500,
  curveAngle: 0,

  // Font management
  fontSearch: '',
  availableFonts: [
    'Arial', 'Helvetica', 'Times New Roman', 'Courier New',
    'Georgia', 'Verdana', 'Roboto', 'Open Sans', 'Lato',
    'Montserrat', 'Oswald', 'Raleway', 'Ubuntu'
  ],
  filteredFonts: [],

  // Text properties model
  textProperties: {
    fill: '#000000',
    fontFamily: 'Arial',
    fontSize: 20,
    fontWeight: 'normal',
    fontStyle: 'normal',
    underline: false,
    opacity: 1,
    stroke: '#000000',
    strokeWidth: 0,
    charSpacing: 0,
    rotation: 0,
    skewX: 0,
    skewY: 0,
    shadowEnabled: false,
    shadowColor: '#000000',
    shadowBlur: 5,
    shadowOffsetX: 5,
    shadowOffsetY: 5
  },

  init() {
    console.log("Canvas manager initializing...");
    // Initialize filtered fonts
    this.filteredFonts = [...this.availableFonts];
    
    // Initialize canvas and make it globally available
    const canvas = new fabric.Canvas(this.$refs.canvas, {
      preserveObjectStacking: true,
      width: 800,
      height: 600,
    });

    // Make canvas available globally for other components
    window.canvas = canvas;

    // Set up event listeners to communicate with other components
    canvas.on("selection:created", this.handleSelection.bind(this));
    canvas.on("selection:updated", this.handleSelection.bind(this));
    canvas.on("selection:cleared", this.handleSelectionCleared.bind(this));

    // Set up text event listeners for communication 
    this.setupTextEventListeners();

    // Set up text-specific event listeners
    this.setupTextPanelEventListeners();

    // Dispatch event that canvas is ready
    window.dispatchEvent(
      new CustomEvent("canvas:initialized", {
        detail: { canvas: canvas },
      })
    );

    // Listen for tool changes
    this.listenForToolChanges();
  },

  // Set up event listeners for text panel functionality
  setupTextPanelEventListeners() {
    // Listen for text selection from canvas
    window.addEventListener('text-selected', this.handleTextSelected.bind(this));

    // Listen for tool changes
    window.addEventListener('tool-changed', this.handleToolChanged.bind(this));
  },

  // Setup event listeners for direct communication
  setupTextEventListeners() {
    console.log("Setting up text event listeners...");
  
    // Add text listener
    window.addEventListener('canvas:addText', (e) => {
      console.log('Canvas received addText event:', e.detail);
      const args = e.detail.args || [];
      const type = args[0] || 'paragraph';
      
      this.addText(type);
    });
    
    // Update text property listener
    window.addEventListener('canvas:updateTextProperty', (e) => {
      console.log('Canvas received updateTextProperty event:', e.detail);
      const args = e.detail.args || [];
      if (args.length >= 2) {
        this.updateTextProperty(args[0], args[1]);
      }
    });
    
    // Update text rotation listener
    window.addEventListener('canvas:updateTextRotation', (e) => {
      console.log('Canvas received updateTextRotation event:', e.detail);
      const args = e.detail.args || [];
      if (args.length >= 1) {
        this.updateTextRotation(args[0]);
      }
    });
    
    // Toggle font weight listener
    window.addEventListener('canvas:toggleFontWeight', () => {
      console.log('Canvas received toggleFontWeight event');
      this.toggleFontWeight();
    });
    
    // Toggle font style listener
    window.addEventListener('canvas:toggleFontStyle', () => {
      console.log('Canvas received toggleFontStyle event');
      this.toggleFontStyle();
    });
    
    // Toggle underline listener
    window.addEventListener('canvas:toggleUnderline', () => {
      console.log('Canvas received toggleUnderline event');
      this.toggleUnderline();
    });
    
    // Toggle shadow listener
    window.addEventListener('canvas:toggleShadow', (e) => {
      console.log('Canvas received toggleShadow event:', e.detail);
      const args = e.detail.args || [];
      const enabled = args[0];
      this.toggleShadow(enabled);
    });
    
    // Update shadow listener
    window.addEventListener('canvas:updateShadow', (e) => {
      console.log('Canvas received updateShadow event:', e.detail);
      const args = e.detail.args || [];
      if (args.length >= 2) {
        this.updateShadow(args[0], args[1]);
      }
    });
    
    // Update text curve listener
    window.addEventListener('canvas:updateTextCurve', (e) => {
      console.log('Canvas received updateTextCurve event:', e.detail);
      const args = e.detail.args || [];
      if (args.length >= 1) {
        this.updateTextCurve(args[0]);
      }
    });
    
    console.log("All text event listeners have been set up successfully");
  },

  // Text Panel Methods
  handleTextSelected(e) {
    if (e.detail.type === 'text') {
      this.selectedObject = true;
      this.updatePropertiesFromSelectedObject(e.detail.object);
    } else {
      this.selectedObject = null;
    }
  },

  handleToolChanged(e) {
    this.isTextActive = e.detail.type === 'text';
  },

  updatePropertiesFromSelectedObject(obj) {
    // Update text properties from selected object
    this.textProperties = {
      fill: this.convertToHex(obj.fill) || '#000000',
      fontFamily: obj.fontFamily || 'Arial',
      fontSize: obj.fontSize || 20,
      fontWeight: obj.fontWeight || 'normal',
      fontStyle: obj.fontStyle || 'normal',
      underline: obj.underline || false,
      opacity: obj.opacity !== undefined ? obj.opacity : 1,
      stroke: this.convertToHex(obj.stroke) || '#000000',
      strokeWidth: obj.strokeWidth || 0,
      charSpacing: obj.charSpacing || 0,
      rotation: obj.angle || 0,
      skewX: obj.skewX || 0,
      skewY: obj.skewY || 0,
      shadowEnabled: !!obj.shadow,
      shadowColor: obj.shadow ? this.convertToHex(obj.shadow.color) : '#000000',
      shadowBlur: obj.shadow ? obj.shadow.blur : 5,
      shadowOffsetX: obj.shadow ? obj.shadow.offsetX : 5,
      shadowOffsetY: obj.shadow ? obj.shadow.offsetY : 5
    };

    // Update curve value based on skew
    this.updateCurveFromSkew(obj.skewX);
  },

  convertToHex(color) {
    if (!color) return '#000000';
    if (color.startsWith('#')) return color;

    // Extract RGB values
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    return '#000000';
  },

  updateCurveFromSkew(skewX) {
    if (skewX) {
      this.curveValue = 2500 + (skewX * 50);
      this.curveAngle = skewX;
    } else {
      this.curveValue = 2500;
      this.curveAngle = 0;
    }
  },

  // Helper method to call a method on the canvas
  callCanvasManagerMethod(methodName, args) {
    console.log(`Dispatching ${methodName} event with args:`, args);
    
    // Direct event dispatch approach
    window.dispatchEvent(new CustomEvent(`canvas:${methodName}`, {
      detail: { args }
    }));
  },

  // Text Panel UI methods
  filterFonts() {
    if (!this.fontSearch) {
      this.filteredFonts = [...this.availableFonts];
    } else {
      const search = this.fontSearch.toLowerCase();
      this.filteredFonts = this.availableFonts.filter(
        font => font.toLowerCase().includes(search)
      );
    }
  },

  selectFont(font) {
    console.log(`selectFont: ${font}`);
    this.textProperties.fontFamily = font;
    this.updateTextProperty('fontFamily', font);
    this.showFontDropdown = false;
  },

  getPercentageFromRange(value) {
    return Math.round(Math.abs((value - 2500) / 2500 * 100));
  },

  // Add text (for the HTML button)
  addHeading(type) {
    console.log(`Adding heading of type: ${type}`);
    this.addText(type);
  },

  // Text Methods - Canvas implementation
  addText(type) {
    console.log('Canvas adding text of type:', type);
    
    if (!window.canvas) {
      console.error('Canvas is not initialized');
      return;
    }
    
    let textObj;
    
    // Create textbox with appropriate settings based on type
    switch(type) {
      case 'full':
        textObj = new fabric.Textbox('New Heading', {
          left: 100,
          top: 100,
          width: 300,
          fontSize: 48,
          fontWeight: 'bold',
          editable: true
        });
        break;
      case 'sub':
        textObj = new fabric.Textbox('New Subheading', {
          left: 100,
          top: 150,
          width: 250,
          fontSize: 32,
          fontWeight: 'normal',
          editable: true
        });
        break;
      case 'paragraph':
        textObj = new fabric.Textbox('Add your text here', {
          left: 100,
          top: 200,
          width: 400,
          fontSize: 16,
          fontWeight: 'normal',
          editable: true
        });
        break;
      default:
        textObj = new fabric.Textbox('New Text', {
          left: 100,
          top: 100,
          width: 200,
          fontSize: 20,
          fontWeight: 'normal',
          editable: true
        });
    }
    
    // Add the text object to canvas
    window.canvas.add(textObj);
    window.canvas.setActiveObject(textObj);
    window.canvas.requestRenderAll();
  },
  
  updateTextProperty(property, value) {
    console.log('Updating text property:', property, value);
    
    const activeObject = window.canvas.getActiveObject();
    if (!activeObject || !activeObject.type || 
        (activeObject.type !== 'textbox' && activeObject.type !== 'i-text')) {
      console.error('No text object selected');
      return;
    }
    
    // Handle numeric values
    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
      if (property === 'fontSize' || property === 'charSpacing' ||
          property === 'strokeWidth' || property === 'skewX' ||
          property === 'skewY') {
        value = parseFloat(value);
      }
    }
    
    // Update the property
    activeObject.set(property, value);
    window.canvas.requestRenderAll();
  },
  
  updateTextRotation(value) {
    console.log('Updating text rotation:', value);
    
    const activeObject = window.canvas.getActiveObject();
    if (!activeObject || !activeObject.type || 
        (activeObject.type !== 'textbox' && activeObject.type !== 'i-text')) {
      console.error('No text object selected');
      return;
    }
    
    // Convert to number if it's a string
    if (typeof value === 'string') {
      value = parseFloat(value);
    }
    
    activeObject.set('angle', value);
    window.canvas.requestRenderAll();
  },
  
  toggleFontWeight() {
    console.log('Canvas manager: toggleFontWeight called');
    
    const activeObject = window.canvas.getActiveObject();
    if (!activeObject || (activeObject.type !== 'textbox' && activeObject.type !== 'i-text')) {
      console.error('No text object selected');
      return;
    }
    
    const newWeight = activeObject.fontWeight === 'bold' ? 'normal' : 'bold';
    activeObject.set('fontWeight', newWeight);
    window.canvas.requestRenderAll();
    
    // Update local textProperties
    this.textProperties.fontWeight = newWeight;
    
    // Send updated object back to text panel
    window.dispatchEvent(new CustomEvent('text-selected', {
      detail: {
        type: 'text',
        object: activeObject
      }
    }));
  },
  
  toggleFontStyle() {
    console.log('Toggling font style');
    
    const activeObject = window.canvas.getActiveObject();
    if (!activeObject || !activeObject.type || 
        (activeObject.type !== 'textbox' && activeObject.type !== 'i-text')) {
      console.error('No text object selected');
      return;
    }
    
    const newStyle = activeObject.fontStyle === 'italic' ? 'normal' : 'italic';
    activeObject.set('fontStyle', newStyle);
    window.canvas.requestRenderAll();
    
    // Update local textProperties
    this.textProperties.fontStyle = newStyle;
    
    // Send updated object back to text panel
    window.dispatchEvent(new CustomEvent('text-selected', {
      detail: {
        type: 'text',
        object: activeObject
      }
    }));
  },
  
  toggleUnderline() {
    console.log('Toggling underline');
    
    const activeObject = window.canvas.getActiveObject();
    if (!activeObject || !activeObject.type || 
        (activeObject.type !== 'textbox' && activeObject.type !== 'i-text')) {
      console.error('No text object selected');
      return;
    }
    
    const newUnderline = !activeObject.underline;
    activeObject.set('underline', newUnderline);
    window.canvas.requestRenderAll();
    
    // Update local textProperties
    this.textProperties.underline = newUnderline;
    
    // Send updated object back to text panel
    window.dispatchEvent(new CustomEvent('text-selected', {
      detail: {
        type: 'text',
        object: activeObject
      }
    }));
  },
  
  toggleShadow(enabled) {
    console.log('Toggling shadow:', enabled);
    
    const activeObject = window.canvas.getActiveObject();
    if (!activeObject || !activeObject.type || 
        (activeObject.type !== 'textbox' && activeObject.type !== 'i-text')) {
      console.error('No text object selected');
      return;
    }
    
    if (enabled) {
      activeObject.set('shadow', new fabric.Shadow({
        color: this.textProperties.shadowColor || '#000000',
        blur: this.textProperties.shadowBlur || 5,
        offsetX: this.textProperties.shadowOffsetX || 5,
        offsetY: this.textProperties.shadowOffsetY || 5
      }));
    } else {
      activeObject.set('shadow', null);
    }
    
    // Update local textProperties
    this.textProperties.shadowEnabled = enabled;
    
    window.canvas.requestRenderAll();
    
    // Send updated object back to text panel
    window.dispatchEvent(new CustomEvent('text-selected', {
      detail: {
        type: 'text',
        object: activeObject
      }
    }));
  },
  
  updateShadow(property, value) {
    console.log('Updating shadow property:', property, value);
    
    const activeObject = window.canvas.getActiveObject();
    if (!activeObject || !activeObject.type || 
        (activeObject.type !== 'textbox' && activeObject.type !== 'i-text')) {
      console.error('No text object selected');
      return;
    }
    
    // Create shadow if it doesn't exist
    if (!activeObject.shadow) {
      activeObject.set('shadow', new fabric.Shadow({
        color: this.textProperties.shadowColor || '#000000',
        blur: this.textProperties.shadowBlur || 5,
        offsetX: this.textProperties.shadowOffsetX || 5,
        offsetY: this.textProperties.shadowOffsetY || 5
      }));
    }
    
    // Convert value to number if appropriate
    if (property !== 'color' && typeof value === 'string') {
      value = parseFloat(value);
    }
    
    activeObject.shadow[property] = value;
    activeObject.set('shadow', activeObject.shadow);
    
    // Update local textProperties
    if (property === 'color') this.textProperties.shadowColor = value;
    else if (property === 'blur') this.textProperties.shadowBlur = value;
    else if (property === 'offsetX') this.textProperties.shadowOffsetX = value;
    else if (property === 'offsetY') this.textProperties.shadowOffsetY = value;
    
    window.canvas.requestRenderAll();
    
    // Send updated object back to text panel
    window.dispatchEvent(new CustomEvent('text-selected', {
      detail: {
        type: 'text',
        object: activeObject
      }
    }));
  },
  
  updateTextCurve(value) {
    console.log('Updating text curve:', value);
    
    const activeObject = window.canvas.getActiveObject();
    if (!activeObject || !activeObject.type || 
        (activeObject.type !== 'textbox' && activeObject.type !== 'i-text')) {
      console.error('No text object selected');
      return;
    }
    
    // Simple implementation - adjust skewX based on value
    const skewValue = (value - 2500) / 50;
    activeObject.set('skewX', skewValue);
    
    // Update curve values 
    this.curveValue = value;
    this.curveAngle = skewValue;
    
    window.canvas.requestRenderAll();
    
    // Send updated object back to text panel
    window.dispatchEvent(new CustomEvent('text-selected', {
      detail: {
        type: 'text',
        object: activeObject
      }
    }));
  },
  
  updateCurveFromAngle(angle) {
    console.log(`updateCurveFromAngle: ${angle}`);
    const value = 2500 + (angle * 50);
    this.curveValue = value;
    this.updateTextCurve(value);
  },

  // Original methods
  handleSelection(e) {
    try {
      const activeObject = e.selected ? e.selected[0] : window.canvas.getActiveObject();
      
      if (activeObject) {
        console.log('Object selected in canvas-manager:', activeObject.type);
        
        // Dispatch event to notify panels about selection
        window.dispatchEvent(
          new CustomEvent("object:selected", {
            detail: activeObject,
          })
        );
        
        // If it's a text object, notify the text panel
        if (activeObject.type === 'textbox' || activeObject.type === 'i-text') {
          console.log('Sending text-selected event with object properties', activeObject);
          
          // Update local state
          this.selectedObject = true;
          this.updatePropertiesFromSelectedObject(activeObject);
          
          // Dispatch event for other components
          window.dispatchEvent(new CustomEvent('text-selected', {
            detail: {
              type: 'text',
              object: {
                fill: activeObject.fill,
                fontFamily: activeObject.fontFamily,
                fontSize: activeObject.fontSize,
                fontWeight: activeObject.fontWeight,
                fontStyle: activeObject.fontStyle,
                underline: activeObject.underline,
                opacity: activeObject.opacity,
                stroke: activeObject.stroke,
                strokeWidth: activeObject.strokeWidth,
                charSpacing: activeObject.charSpacing,
                angle: activeObject.angle,
                skewX: activeObject.skewX,
                skewY: activeObject.skewY,
                shadow: activeObject.shadow
              }
            }
          }));
        } else {
          // Not a text object
          this.selectedObject = null;
          window.dispatchEvent(new CustomEvent('text-selected', {
            detail: { type: 'other' }
          }));
        }
      }
    } catch (error) {
      console.error('Error in handleSelection:', error);
    }
  },

  handleSelectionCleared() {
    this.selectedObject = null;
    
    // Notify panels that selection is cleared
    window.dispatchEvent(new CustomEvent("selection:cleared"));
    window.dispatchEvent(new CustomEvent('text-selected', {
      detail: { type: 'none' }
    }));
  },

  listenForToolChanges() {
    window.addEventListener("tool-changed", (e) => {
      const toolType = e.detail.type;
      
      // Update text panel state
      this.isTextActive = toolType === 'text';

      // Set drawing mode only when drawing tool is active
      if (toolType === "drawing") {
        // Enable drawing mode
        window.canvas.isDrawingMode = true;

        // Setup a default brush
        const brush = new fabric.PencilBrush(window.canvas);
        brush.width = 5;
        brush.color = "#000000";
        window.canvas.freeDrawingBrush = brush;
      } else {
        // Disable drawing mode for other tools
        window.canvas.isDrawingMode = false;
      }

      window.canvas.renderAll();
    });
  },
});