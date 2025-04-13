// Text panel properties and methods - Fabric.js v6 syntax with direct method calls
import { Textbox, Path } from 'fabric';
import { addToHistory } from '../utils/history-manager';

export default function textComponent() {
    return {
        canvasManager: null, // Will hold reference to canvas manager
        selectedObject: null,
        textProperties: {
            fontFamily: 'Arial',
            fontSize: 20,
            fontWeight: 'normal',
            fontStyle: 'normal',
            underline: false,
            fill: '#000000',
            stroke: '#000000',
            strokeWidth: 0,
            charSpacing: 0,
            opacity: 1,
            rotation: 0,
            skewX: 0,
            skewY: 0,
            shadowEnabled: false,
            shadowColor: '#000000',
            shadowBlur: 5,
            shadowOffsetX: 5,
            shadowOffsetY: 5
        },
        showFontDropdown: false,
        fontSearch: '',
        filteredFonts: ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia'],
        showCurve: false,
        curveValue: 2500,
        curveAngle: 0,
        showDistortion: false,
        showShadow: false,

        // Initialize component and establish references
        init() {
            // Make this component accessible to others
            window.textComponent = this;

            // Try to get reference to canvas manager
            this.$nextTick(() => {
                if (window.canvasManager) {
                    this.canvasManager = window.canvasManager;
                    console.log("Text component connected to canvas manager");
                }
            });
        },

        // Helper color conversion function
        convertColorToHex(color) {
            if (!color) return '#000000';
            // If already in hex format, return as is
            if (color.startsWith('#')) return color;

            // If in rgb format, convert to hex
            if (color.startsWith('rgb')) {
                const rgb = color.match(/\d+/g);
                if (rgb && rgb.length === 3) {
                    return '#' +
                        ('0' + parseInt(rgb[0]).toString(16)).slice(-2) +
                        ('0' + parseInt(rgb[1]).toString(16)).slice(-2) +
                        ('0' + parseInt(rgb[2]).toString(16)).slice(-2);
                }
            }

            // Default fallback
            return '#000000';
        },

        // Methods for text panel
        addHeading(type) {
            if (!window.canvas) return;

            // Call canvas manager's method directly if available
            if (this.canvasManager && typeof this.canvasManager.addText === 'function') {
                this.canvasManager.addText(type);
                return;
            }

            // Fallback implementation if canvas manager isn't available
            let text;
            const textOptions = {
                fontFamily: 'Arial',
                left: 300,
                top: 100,
                width: 400,
                height: 100, // Ensure a default height
                strokeWidth: 0  // Explicitly set default strokeWidth
            };

            if (type === 'full') {
                text = new Textbox('Add a heading', {
                    ...textOptions,
                    fontSize: 36,
                    fontWeight: 'bold',
                });
            } else if (type === 'sub') {
                text = new Textbox('Add a subheading', {
                    ...textOptions,
                    fontSize: 24,
                    top: 150,
                });
            } else if (type === 'paragraph') {
                text = new Textbox('Add a little bit of body text', {
                    ...textOptions,
                    fontSize: 16,
                    top: 200,
                });
            }

            if (text) {
                // Ensure text has valid dimensions before adding it
                if (!text.width || text.width <= 0) text.width = 400;
                if (!text.height || text.height <= 0) text.height = 50;

                window.canvas.add(text);
                window.canvas.setActiveObject(text);

                // Center the text object on the canvas
                const canvasCenter = window.canvas.getCenter();
                text.set({
                    left: canvasCenter.left,
                    top: type === 'full' ? canvasCenter.top - 50 :
                        type === 'sub' ? canvasCenter.top :
                            canvasCenter.top + 50,
                    originX: 'center',
                    originY: 'center'
                });

                // Always calculate text dimensions after adding content
                text.calcTextHeight();
                text.setCoords();

                window.canvas.requestRenderAll();

                // Update the text panel with this object's properties
                this.selectedObject = text;
                this.syncTextProperties(text);
            }
        },

        // Sync text object properties with the panel
        syncTextProperties(textObject) {
            if (!textObject) return;

            this.textProperties = {
                fontFamily: textObject.fontFamily || 'Arial',
                fontSize: textObject.fontSize || 20,
                fontWeight: textObject.fontWeight || 'normal',
                fontStyle: textObject.fontStyle || 'normal',
                underline: textObject.underline || false,
                fill: textObject.fill || '#000000',
                stroke: textObject.stroke || '#000000',
                strokeWidth: textObject.strokeWidth || 0,
                charSpacing: textObject.charSpacing || 0,
                opacity: textObject.opacity !== undefined ? textObject.opacity : 1,
                rotation: textObject.angle || 0,
                skewX: textObject.skewX || 0,
                skewY: textObject.skewY || 0,
                shadowEnabled: !!textObject.shadow,
                shadowColor: textObject.shadow ? textObject.shadow.color : '#000000',
                shadowBlur: textObject.shadow ? textObject.shadow.blur : 5,
                shadowOffsetX: textObject.shadow ? textObject.shadow.offsetX : 5,
                shadowOffsetY: textObject.shadow ? textObject.shadow.offsetY : 5
            };
        },

        // Enhanced updateTextProperty method
        updateTextProperty(property, value) {
            // Call canvas manager's method directly if available
            if (this.canvasManager && typeof this.canvasManager.updateTextProperty === 'function') {
                this.canvasManager.updateTextProperty(property, value);
                return;
            }

            // Fallback implementation
            if (!window.canvas) return;

            const activeObject = window.canvas.getActiveObject();
            if (activeObject && activeObject.type.includes('text')) {
                // For color properties, ensure hex format
                if (['fill', 'stroke', 'shadowColor'].includes(property) && typeof value === 'string') {
                    try {
                        value = this.convertColorToHex(value);
                    } catch (e) {
                        console.error('Error converting color', e);
                    }
                }

                // Special handling for strokeWidth to prevent disappearing text
                if (property === 'strokeWidth') {
                    const numValue = parseFloat(value);

                    // Store text's current state
                    const originalText = activeObject.text;
                    const originalFill = activeObject.fill;

                    // Set the stroke width
                    activeObject.set('strokeWidth', numValue);

                    // If stroke width is very small but not zero, set a minimum value
                    // This prevents text from disappearing at small values
                    if (numValue > 0 && numValue < 0.3) {
                        activeObject.set('strokeWidth', 0.3);
                    }

                    // Make sure the fill is still visible
                    if (numValue > 0 && !activeObject.fill) {
                        activeObject.set('fill', originalFill || '#000000');
                    }

                    // Ensure text properties are maintained
                    if (!activeObject.text || activeObject.text !== originalText) {
                        activeObject.set('text', originalText);
                    }

                    // Force Fabric to recalculate the text boundaries
                    activeObject.dirty = true;

                    // Set these properties to ensure the text renders properly
                    activeObject.set({
                        strokeUniform: true,
                        paintFirst: 'fill' // This helps with rendering - stroke goes behind fill
                    });
                } else {
                    // Normal property update for non-stroke properties
                    activeObject.set(property, value);
                }

                // Update the property in our state
                this.textProperties[property] = value;

                // Force the object to update its coordinates
                activeObject.setCoords();

                // Ensure the canvas rerenders completely
                window.canvas.requestRenderAll();

                // Add to history for undo/redo
                if (typeof addToHistory === 'function') {
                    addToHistory();
                }
            }
        },

        // Toggle font weight
        toggleFontWeight() {
            this.textProperties.fontWeight = this.textProperties.fontWeight === 'bold' ? 'normal' : 'bold';

            // Call canvas manager's method directly if available
            if (this.canvasManager && typeof this.canvasManager.toggleFontWeight === 'function') {
                this.canvasManager.toggleFontWeight();
            } else {
                // Fallback to local implementation
                this.updateTextProperty('fontWeight', this.textProperties.fontWeight);
            }
        },

        // Toggle font style
        toggleFontStyle() {
            this.textProperties.fontStyle = this.textProperties.fontStyle === 'italic' ? 'normal' : 'italic';

            // Call canvas manager's method directly if available
            if (this.canvasManager && typeof this.canvasManager.toggleFontStyle === 'function') {
                this.canvasManager.toggleFontStyle();
            } else {
                // Fallback to local implementation
                this.updateTextProperty('fontStyle', this.textProperties.fontStyle);
            }
        },

        // Toggle underline
        toggleUnderline() {
            this.textProperties.underline = !this.textProperties.underline;

            // Call canvas manager's method directly if available
            if (this.canvasManager && typeof this.canvasManager.toggleUnderline === 'function') {
                this.canvasManager.toggleUnderline();
            } else {
                // Fallback to local implementation
                this.updateTextProperty('underline', this.textProperties.underline);
            }
        },

        // Update rotation
        updateTextRotation() {
            const rotation = parseInt(this.textProperties.rotation);

            // Call canvas manager's method directly if available
            if (this.canvasManager && typeof this.canvasManager.updateTextRotation === 'function') {
                this.canvasManager.updateTextRotation(rotation);
            } else {
                // Fallback to local implementation
                this.updateTextProperty('angle', rotation);
            }
        },

        // Select font
        selectFont(font) {
            this.textProperties.fontFamily = font;
            this.updateTextProperty('fontFamily', font);
            this.showFontDropdown = false; // Hide dropdown after selection
        },

        // Filter fonts based on search
        filterFonts() {
            if (!this.fontSearch) {
                this.filteredFonts = ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia'];
                return;
            }
            this.filteredFonts = ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia']
                .filter(font => font.toLowerCase().includes(this.fontSearch.toLowerCase()));
        },

        // Update curve from angle
        updateCurveFromAngle(angle) {
            this.curveAngle = angle;
            // Convert angle to curve value (roughly proportional)
            const curveValue = angle * 100;
            this.curveValue = curveValue;

            // Apply the curve
            this.updateTextCurve(curveValue);
        },

        // Get percentage from range
        getPercentageFromRange(value) {
            // Calculate percentage from range value
            return Math.round((value / 5000) * 100);
        },

        // Toggle shadow
        toggleShadow() {
            // Toggle the shadow enabled state
            this.textProperties.shadowEnabled = !this.textProperties.shadowEnabled;

            // Call canvas manager's method directly if available
            if (this.canvasManager && typeof this.canvasManager.toggleShadow === 'function') {
                this.canvasManager.toggleShadow(this.textProperties.shadowEnabled);
            } else {
                // Fallback implementation
                if (!window.canvas) return;

                const activeObject = window.canvas.getActiveObject();
                if (activeObject && activeObject.type.includes('text')) {
                    try {
                        if (this.textProperties.shadowEnabled) {
                            // Get shadow color and convert to hex if needed
                            let shadowColor = '#000000';
                            try {
                                shadowColor = this.convertColorToHex(this.textProperties.shadowColor || '#000000');
                            } catch (e) {
                                console.error('Error converting shadow color', e);
                            }

                            // Create a proper shadow object
                            const shadowObj = {
                                color: shadowColor,
                                blur: parseFloat(this.textProperties.shadowBlur) || 5,
                                offsetX: parseFloat(this.textProperties.shadowOffsetX) || 5,
                                offsetY: parseFloat(this.textProperties.shadowOffsetY) || 5
                            };

                            // In Fabric.js v6, shadow is set directly as an object
                            activeObject.set('shadow', shadowObj);
                        } else {
                            // Remove shadow
                            activeObject.set('shadow', null);
                        }

                        // Force update
                        activeObject.dirty = true;
                        activeObject.setCoords();
                        window.canvas.requestRenderAll();

                        // Add to history
                        if (typeof addToHistory === 'function') {
                            addToHistory();
                        }
                    } catch (error) {
                        console.error("Error applying shadow:", error);
                    }
                }
            }
        },

        // Update shadow properties
        updateShadow(property, value) {
            // Update the property in our state
            const propName = 'shadow' + property.charAt(0).toUpperCase() + property.slice(1);
            this.textProperties[propName] = value;

            // Call canvas manager's method directly if available
            if (this.canvasManager && typeof this.canvasManager.updateShadow === 'function') {
                this.canvasManager.updateShadow(property, value);
                return;
            }

            // Fallback implementation
            if (!window.canvas) return;

            const activeObject = window.canvas.getActiveObject();
            if (activeObject && activeObject.type.includes('text') && this.textProperties.shadowEnabled) {
                try {
                    // Convert color to hex if needed
                    if (property === 'color' && typeof value === 'string') {
                        try {
                            value = this.convertColorToHex(value);
                        } catch (e) {
                            console.error('Error converting shadow color', e);
                            value = '#000000'; // Fallback
                        }
                    }

                    // Ensure numeric values are parsed correctly
                    if (['blur', 'offsetX', 'offsetY'].includes(property)) {
                        value = parseFloat(value);
                    }

                    // Get current shadow color and convert if needed
                    let shadowColor = '#000000';
                    try {
                        shadowColor = this.convertColorToHex(this.textProperties.shadowColor || '#000000');
                    } catch (e) {
                        console.error('Error converting existing shadow color', e);
                    }

                    // Create a complete shadow object to avoid partial updates
                    const shadowObj = {
                        color: property === 'color' ? value : shadowColor,
                        blur: property === 'blur' ? value : parseFloat(this.textProperties.shadowBlur || 5),
                        offsetX: property === 'offsetX' ? value : parseFloat(this.textProperties.shadowOffsetX || 5),
                        offsetY: property === 'offsetY' ? value : parseFloat(this.textProperties.shadowOffsetY || 5)
                    };

                    // Apply the complete shadow object
                    activeObject.set('shadow', shadowObj);

                    // Force update
                    activeObject.dirty = true;
                    activeObject.setCoords();
                    window.canvas.requestRenderAll();

                    // Add to history
                    if (typeof addToHistory === 'function') {
                        addToHistory();
                    }
                } catch (error) {
                    console.error("Error updating shadow:", error);
                }
            }
        },

        // Text curve handling
        updateTextCurve(value) {
            this.curveValue = value;

            // Call canvas manager's method directly if available
            if (this.canvasManager && typeof this.canvasManager.updateTextCurve === 'function') {
                this.canvasManager.updateTextCurve(value);
                return;
            }

            // Fallback implementation
            if (!window.canvas) return;

            const activeObject = window.canvas.getActiveObject();
            if (activeObject && activeObject.type.includes('text')) {
                try {
                    // Create an arc path with the curve value
                    if (value !== 0) {
                        const width = activeObject.width * (activeObject.scaleX || 1);
                        const radius = Math.abs(50000 / value); // Inversely proportional

                        // Create path data array
                        const pathData = [
                            ['M', 0, 0],
                            ['A', radius, radius, 0, 0, value > 0 ? 1 : 0, width, 0]
                        ];

                        // Create a proper Path instance
                        const path = new Path(pathData, {
                            left: activeObject.left,
                            top: activeObject.top,
                            originX: 'center',
                            originY: 'center',
                            fill: '',
                            stroke: '',
                            visible: false // Hide the path, we just want the text to follow it
                        });

                        // In Fabric.js v6, we set the path property of the text object
                        activeObject.set('path', path);
                    } else {
                        // Remove any existing path
                        activeObject.set('path', null);
                    }

                    activeObject.setCoords();
                    window.canvas.requestRenderAll();

                    // Add to history
                    if (typeof addToHistory === 'function') {
                        addToHistory();
                    }
                } catch (error) {
                    console.error("Error updating text curve:", error);
                }
            }
        },

        // Text alignment
        alignText(alignment) {
            // Call canvas manager's method directly if available
            if (this.canvasManager && typeof this.canvasManager.alignText === 'function') {
                this.canvasManager.alignText(alignment);
                return;
            }

            // Fallback implementation
            if (!window.canvas) return;

            const activeObject = window.canvas.getActiveObject();
            if (activeObject && activeObject.type.includes('text')) {
                activeObject.set('textAlign', alignment);
                activeObject.setCoords();
                window.canvas.requestRenderAll();

                // Add to history
                if (typeof addToHistory === 'function') {
                    addToHistory();
                }
            }
        },

        // Line height adjustment
        updateLineHeight(value) {
            // Call canvas manager's method directly if available
            if (this.canvasManager && typeof this.canvasManager.updateLineHeight === 'function') {
                this.canvasManager.updateLineHeight(value);
                return;
            }

            // Fallback implementation
            if (!window.canvas) return;

            const activeObject = window.canvas.getActiveObject();
            if (activeObject && activeObject.type.includes('text')) {
                activeObject.set('lineHeight', parseFloat(value));
                this.textProperties.lineHeight = parseFloat(value);
                activeObject.setCoords();
                window.canvas.requestRenderAll();

                // Add to history
                if (typeof addToHistory === 'function') {
                    addToHistory();
                }
            }
        },

        // Text case conversion
        convertCase(type) {
            // Call canvas manager's method directly if available
            if (this.canvasManager && typeof this.canvasManager.convertCase === 'function') {
                this.canvasManager.convertCase(type);
                return;
            }

            // Fallback implementation
            if (!window.canvas) return;

            const activeObject = window.canvas.getActiveObject();
            if (activeObject && activeObject.type.includes('text')) {
                let text = activeObject.text;

                switch (type) {
                    case 'upper':
                        text = text.toUpperCase();
                        break;
                    case 'lower':
                        text = text.toLowerCase();
                        break;
                    case 'capitalize':
                        text = text.split(' ')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                            .join(' ');
                        break;
                }

                activeObject.set('text', text);
                activeObject.setCoords();
                window.canvas.requestRenderAll();

                // Add to history
                if (typeof addToHistory === 'function') {
                    addToHistory();
                }
            }
        },

        // Character spacing
        updateCharSpacing(value) {
            const spacing = parseInt(value);
            this.textProperties.charSpacing = spacing;
            this.updateTextProperty('charSpacing', spacing);
        },

        // Text transformation
        applyTextTransform(transform) {
            // Call canvas manager's method directly if available
            if (this.canvasManager && typeof this.canvasManager.applyTextTransform === 'function') {
                this.canvasManager.applyTextTransform(transform);
                return;
            }

            // Fallback implementation
            if (!window.canvas) return;

            const activeObject = window.canvas.getActiveObject();
            if (activeObject && activeObject.type.includes('text')) {
                switch (transform) {
                    case 'stretch':
                        activeObject.set('scaleX', activeObject.scaleX * 1.1);
                        break;
                    case 'compress':
                        activeObject.set('scaleX', activeObject.scaleX * 0.9);
                        break;
                    case 'tall':
                        activeObject.set('scaleY', activeObject.scaleY * 1.1);
                        break;
                    case 'short':
                        activeObject.set('scaleY', activeObject.scaleY * 0.9);
                        break;
                }

                activeObject.setCoords();
                window.canvas.requestRenderAll();

                // Add to history
                if (typeof addToHistory === 'function') {
                    addToHistory();
                }
            }
        },

        // Text selection handler
        handleTextSelected(textObject) {
            this.selectedObject = textObject;
            this.syncTextProperties(textObject);
        },

        // Handle text deselection
        handleTextDeselected() {
            this.selectedObject = null;
        }
    };
}