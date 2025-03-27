// Simple Fabric.js Filters Polyfill
// Include this before your Alpine.js component

/**
 * This polyfill creates minimal versions of commonly used Fabric.js filters
 * Use this if you cannot upgrade your Fabric.js version but need filter functionality
 */

// Wait for fabric to be available
(function initFabricFiltersPolyfill() {
    // Check if fabric is defined
    if (typeof fabric === 'undefined') {
        console.log("Waiting for Fabric.js to load...");
        setTimeout(initFabricFiltersPolyfill, 100);
        return;
    }

    // Skip if filters already exist
    if (fabric && fabric.Image && fabric.Image.filters) {
        console.log("Fabric.js filters already available, skipping polyfill");
        return;
    }

    // Create the filters namespace if it doesn't exist
    if (fabric && fabric.Image) {
        console.log("Creating basic Fabric.js filters polyfill");
        fabric.Image.filters = {};
    } else {
        console.error("fabric.Image not found, cannot create polyfill");
        return;
    }
    // Base filter class
    class BaseFilter {
        constructor(options = {}) {
            this.options = options;
            for (const prop in options) {
                this[prop] = options[prop];
            }
        }
        isNeutralState() {
            // Default implementation - filters are not neutral by default
            return false;
        }
        applyTo(canvasEl) {
            // In Fabric.js, canvasEl might be an image data object, not a canvas element
            if (canvasEl.getContext) {
                // It's a canvas element
                const context = canvasEl.getContext('2d');
                this.applyToContext(context, canvasEl.width, canvasEl.height);
            } else if (canvasEl.data) {
                // It's image data
                const ctx = document.createElement('canvas').getContext('2d');
                const width = canvasEl.width;
                const height = canvasEl.height;

                // Put image data on temporary canvas
                ctx.putImageData(canvasEl, 0, 0);

                // Apply filter
                this.applyToContext(ctx, width, height);

                // Get modified image data
                const newData = ctx.getImageData(0, 0, width, height);

                // Copy back to original image data
                for (let i = 0; i < canvasEl.data.length; i++) {
                    canvasEl.data[i] = newData.data[i];
                }
            }
        }

        applyToContext(ctx, width, height) {
            // Override in subclasses
        }
    }

    // Define basic filters

    // Brightness Filter
    fabric.Image.filters.Brightness = class Brightness extends BaseFilter {
        constructor(options = {}) {
            super(options);
            this.brightness = options.brightness || 0;
            this.type = 'Brightness';
        }

        applyToContext(ctx, width, height) {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            const brightness = Math.floor(this.brightness * 255);

            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, Math.max(0, data[i] + brightness));
                data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightness));
                data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightness));
            }

            ctx.putImageData(imageData, 0, 0);
        }
    };

    // Contrast Filter
    fabric.Image.filters.Contrast = class Contrast extends BaseFilter {
        constructor(options = {}) {
            super(options);
            this.contrast = options.contrast || 0;
            this.type = 'Contrast';
        }

        applyToContext(ctx, width, height) {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            const factor = 259 * (this.contrast * 255 + 255) / (255 * (259 - this.contrast * 255));

            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
                data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
                data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
            }

            ctx.putImageData(imageData, 0, 0);
        }
    };

    // Grayscale Filter
    fabric.Image.filters.Grayscale = class Grayscale extends BaseFilter {
        constructor(options = {}) {
            super(options);
            this.type = 'Grayscale';
        }

        applyToContext(ctx, width, height) {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = avg;
                data[i + 1] = avg;
                data[i + 2] = avg;
            }

            ctx.putImageData(imageData, 0, 0);
        }
    };

    // Invert Filter
    fabric.Image.filters.Invert = class Invert extends BaseFilter {
        constructor(options = {}) {
            super(options);
            this.type = 'Invert';
        }

        applyToContext(ctx, width, height) {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i];
                data[i + 1] = 255 - data[i + 1];
                data[i + 2] = 255 - data[i + 2];
            }

            ctx.putImageData(imageData, 0, 0);
        }
    };

    // Sepia Filter
    fabric.Image.filters.Sepia = class Sepia extends BaseFilter {
        constructor(options = {}) {
            super(options);
            this.type = 'Sepia';
        }

        applyToContext(ctx, width, height) {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
            }

            ctx.putImageData(imageData, 0, 0);
        }
    };

    // Saturation Filter
    fabric.Image.filters.Saturation = class Saturation extends BaseFilter {
        constructor(options = {}) {
            super(options);
            this.saturation = options.saturation || 0;
            this.type = 'Saturation';
        }

        applyToContext(ctx, width, height) {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            const adjustment = this.saturation * 100;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Convert RGB to HSL
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                let h, s, l = (max + min) / 2;

                if (max === min) {
                    h = s = 0; // achromatic
                } else {
                    const d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

                    switch (max) {
                        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                        case g: h = (b - r) / d + 2; break;
                        case b: h = (r - g) / d + 4; break;
                    }

                    h /= 6;
                }

                // Adjust saturation
                s = Math.max(0, Math.min(1, s + adjustment / 100));

                // Convert back to RGB
                let r1, g1, b1;

                if (s === 0) {
                    r1 = g1 = b1 = l; // achromatic
                } else {
                    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                    const p = 2 * l - q;

                    r1 = this.hue2rgb(p, q, h + 1/3);
                    g1 = this.hue2rgb(p, q, h);
                    b1 = this.hue2rgb(p, q, h - 1/3);
                }

                data[i] = Math.round(r1 * 255);
                data[i + 1] = Math.round(g1 * 255);
                data[i + 2] = Math.round(b1 * 255);
            }

            ctx.putImageData(imageData, 0, 0);
        }

        hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }
    };

    // Blur Filter (simple box blur)
    fabric.Image.filters.Blur = class Blur extends BaseFilter {
        constructor(options = {}) {
            super(options);
            this.blur = options.blur || 0;
            this.type = 'Blur';
        }

        applyToContext(ctx, width, height) {
            // Skip if no blur
            if (this.blur <= 0) return;

            const blur = Math.min(Math.max(1, Math.floor(this.blur * 10)), 10);
            ctx.filter = `blur(${blur}px)`;

            // Need to redraw the image with the filter
            const imageData = ctx.getImageData(0, 0, width, height);
            ctx.clearRect(0, 0, width, height);
            ctx.putImageData(imageData, 0, 0);

            // Reset filter
            ctx.filter = 'none';
        }
    };

    // Pixelate Filter
    fabric.Image.filters.Pixelate = class Pixelate extends BaseFilter {
        constructor(options = {}) {
            super(options);
            this.blocksize = options.blocksize || 4;
            this.type = 'Pixelate';
        }

        applyToContext(ctx, width, height) {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            const blocksize = Math.max(2, Math.min(50, this.blocksize));

            for (let y = 0; y < height; y += blocksize) {
                for (let x = 0; x < width; x += blocksize) {
                    const blockWidth = Math.min(blocksize, width - x);
                    const blockHeight = Math.min(blocksize, height - y);

                    // Get the average color of the block
                    let r = 0, g = 0, b = 0, count = 0;

                    for (let by = 0; by < blockHeight; by++) {
                        for (let bx = 0; bx < blockWidth; bx++) {
                            const i = ((y + by) * width + (x + bx)) * 4;
                            r += data[i];
                            g += data[i + 1];
                            b += data[i + 2];
                            count++;
                        }
                    }

                    r = Math.round(r / count);
                    g = Math.round(g / count);
                    b = Math.round(b / count);

                    // Fill the block with the average color
                    for (let by = 0; by < blockHeight; by++) {
                        for (let bx = 0; bx < blockWidth; bx++) {
                            const i = ((y + by) * width + (x + bx)) * 4;
                            data[i] = r;
                            data[i + 1] = g;
                            data[i + 2] = b;
                        }
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);
        }
    };

    // Add BlackWhite as an alias for Grayscale
    fabric.Image.filters.BlackWhite = fabric.Image.filters.Grayscale;

    // Add simple HueRotation filter
    fabric.Image.filters.HueRotation = class HueRotation extends BaseFilter {
        constructor(options = {}) {
            super(options);
            this.rotation = options.rotation || 0;
            this.type = 'HueRotation';
        }

        applyToContext(ctx, width, height) {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            const rotation = this.rotation * Math.PI;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Convert RGB to HSL
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                let h, s, l = (max + min) / 2;

                if (max === min) {
                    h = s = 0; // achromatic
                } else {
                    const d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

                    switch (max) {
                        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                        case g: h = (b - r) / d + 2; break;
                        case b: h = (r - g) / d + 4; break;
                    }

                    h /= 6;
                }

                // Rotate hue
                h = (h + rotation) % 1;
                if (h < 0) h += 1;

                // Convert back to RGB
                let r1, g1, b1;

                if (s === 0) {
                    r1 = g1 = b1 = l; // achromatic
                } else {
                    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                    const p = 2 * l - q;

                    r1 = this.hue2rgb(p, q, h + 1/3);
                    g1 = this.hue2rgb(p, q, h);
                    b1 = this.hue2rgb(p, q, h - 1/3);
                }

                data[i] = Math.round(r1 * 255);
                data[i + 1] = Math.round(g1 * 255);
                data[i + 2] = Math.round(b1 * 255);
            }

            ctx.putImageData(imageData, 0, 0);
        }

        hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }
    };

    // Add simple noise filter
    fabric.Image.filters.Noise = class Noise extends BaseFilter {
        constructor(options = {}) {
            super(options);
            this.noise = options.noise || 0;
            this.type = 'Noise';
        }

        applyToContext(ctx, width, height) {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            const noise = Math.floor(this.noise);

            for (let i = 0; i < data.length; i += 4) {
                // Generate random noise
                const n = Math.floor(Math.random() * (noise * 2 + 1)) - noise;

                // Apply noise to each channel
                data[i] = Math.min(255, Math.max(0, data[i] + n));
                data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
                data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
            }

            ctx.putImageData(imageData, 0, 0);
        }
    };

    // Simple Convolute filter for advanced operations like sharpen, emboss, etc.
    fabric.Image.filters.Convolute = class Convolute extends BaseFilter {
        constructor(options = {}) {
            super(options);
            this.matrix = options.matrix || [0, 0, 0, 0, 1, 0, 0, 0, 0];
            this.type = 'Convolute';
        }

        applyToContext(ctx, width, height) {
            const pixels = ctx.getImageData(0, 0, width, height);
            const output = ctx.createImageData(width, height);
            const w = width;
            const h = height;
            const matrix = this.matrix;

            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const i = (y * w + x) * 4;
                    let r = 0, g = 0, b = 0;

                    for (let ky = 0; ky < 3; ky++) {
                        for (let kx = 0; kx < 3; kx++) {
                            const px = Math.min(w - 1, Math.max(0, x + kx - 1));
                            const py = Math.min(h - 1, Math.max(0, y + ky - 1));
                            const k = ky * 3 + kx;
                            const idx = (py * w + px) * 4;

                            r += pixels.data[idx] * matrix[k];
                            g += pixels.data[idx + 1] * matrix[k];
                            b += pixels.data[idx + 2] * matrix[k];
                        }
                    }

                    output.data[i] = Math.min(255, Math.max(0, r));
                    output.data[i + 1] = Math.min(255, Math.max(0, g));
                    output.data[i + 2] = Math.min(255, Math.max(0, b));
                    output.data[i + 3] = pixels.data[i + 3]; // Alpha
                }
            }

            ctx.putImageData(output, 0, 0);
        }
    };

    // Additional filter styles as simplified versions
    fabric.Image.filters.Vintage = class Vintage extends BaseFilter {
        constructor(options = {}) {
            super(options);
            this.type = 'Vintage';
        }

        applyToContext(ctx, width, height) {
            // Apply sepia first
            const sepia = new fabric.Image.filters.Sepia();
            sepia.applyToContext(ctx, width, height);

            // Then reduce contrast slightly
            const contrast = new fabric.Image.filters.Contrast({ contrast: -0.15 });
            contrast.applyToContext(ctx, width, height);
        }
    };

    fabric.Image.filters.Brownie = class Brownie extends BaseFilter {
        constructor(options = {}) {
            super(options);
            this.type = 'Brownie';
        }
        isNeutralState() {
            // Most filters are not neutral by default
            return false;
        }
        applyToContext(ctx, width, height) {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                data[i] = r * 0.59 + g * 0.34 + b * 0.07;
                data[i + 1] = r * 0.31 + g * 0.54 + b * 0.15;
                data[i + 2] = r * 0.19 + g * 0.28 + b * 0.47;
            }

            ctx.putImageData(imageData, 0, 0);
        }
    };

    fabric.Image.filters.Kodachrome = class Kodachrome extends BaseFilter {
        constructor(options = {}) {
            super(options);
            this.type = 'Kodachrome';
        }

        applyToContext(ctx, width, height) {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                data[i] = r * 1.2 + g * 0.1 + b * 0.1;
                data[i + 1] = r * 0.1 + g * 1.1 + b * 0.1;
                data[i + 2] = r * 0.1 + g * 0.1 + b * 1.3;
            }

            // Increase saturation
            const saturation = new fabric.Image.filters.Saturation({ saturation: 0.2 });
            saturation.applyToContext(ctx, width, height);
        }
    };

    fabric.Image.filters.Technicolor = class Technicolor extends BaseFilter {
        constructor(options = {}) {
            super(options);
            this.type = 'Technicolor';
        }

        applyToContext(ctx, width, height) {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                data[i] = Math.min(255, r * 1.3 - g * 0.1 - b * 0.1);
                data[i + 1] = Math.min(255, g * 1.2 - r * 0.1 - b * 0.1);
                data[i + 2] = Math.min(255, b * 1.2 - r * 0.1 - g * 0.1);
            }

            ctx.putImageData(imageData, 0, 0);
        }
    };

    fabric.Image.filters.Polaroid = class Polaroid extends BaseFilter {
        constructor(options = {}) {
            super(options);
            this.type = 'Polaroid';
        }

        applyToContext(ctx, width, height) {
            // Slightly warm colors
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, data[i] * 1.1);       // More red
                data[i + 2] = Math.min(255, data[i + 2] * 0.9); // Less blue
            }

            ctx.putImageData(imageData, 0, 0);

            // Add contrast and vignette-like darkening at edges
            const contrast = new fabric.Image.filters.Contrast({ contrast: 0.1 });
            contrast.applyToContext(ctx, width, height);
        }
    };

    console.log("Fabric.js filters polyfill initialized");
})();