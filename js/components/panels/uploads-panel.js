export const uploadsPanelComponent = () => ({
  isActive: false,
  uploads: [],
  selectedObject: null,
  activeFilter: null,
  showFilterTools: false,
  showShadow: false,
  showDistortion: false,
  filterAvailable: false, // Track filter availability
  originalImage: null, // Store original image for filter resets

  // Image filter properties
  filters: {
    brightness: 0,
    contrast: 0,
    blur: 0,
    noise: 0,
    saturation: 0,
    hue: 0,
    pixelate: 0,
  },

  // Object properties
  objectProperties: {
    opacity: 1,
    stroke: "#000000",
    strokeWidth: 0,
    radius: 0,
    skewX: 0,
    skewY: 0,
    fill: "#000000",
    shadowEnabled: false,
    shadowColor: "#dddddd",
    shadowBlur: 20,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  },

  init() {
    console.log("Uploads panel initializing");

    // Check if fabric is available and has filters
    this.checkFilterAvailability();

    // Listen for tool changes
    window.addEventListener("tool-changed", (e) => {
      console.log("Tool changed event received:", e.detail);
      this.isActive = e.detail.type === "uploads";

      // Check filter availability when panel becomes active
      if (this.isActive) {
        this.checkFilterAvailability();
      }
    });

    // Listen for object selection
    window.addEventListener("object:selected", (e) => {
      console.log("Object selected event received:", e.detail);
      if (e.detail) {
        this.selectedObject = e.detail;
        this.syncObjectProperties();

        // Reset filters object when selecting a new object
        this.resetFilterValues();

        // Store original image when selecting a new object for the first time
        if (this.selectedObject.type === "image" && !this.originalImage) {
          this.storeOriginalImage();
        }
      }
    });

    // Listen for selection cleared
    window.addEventListener("selection:cleared", () => {
      console.log("Selection cleared event received");
      this.selectedObject = null;
      this.originalImage = null;
    });

    console.log("Uploads panel initialization complete");
  },

  // Check if fabric.js filters are available
  checkFilterAvailability() {
    // Check if fabric exists
    if (typeof fabric === "undefined") {
      console.warn("Fabric.js is not available");
      this.filterAvailable = false;
      return;
    }

    // Check if fabric.Image exists
    if (!fabric.Image) {
      console.warn("Fabric.Image is not available");
      this.filterAvailable = false;
      return;
    }

    // Check if filters are available
    if (!fabric.Image.filters) {
      console.warn(
        "Fabric.Image.filters is not available - filters won't work"
      );
      this.filterAvailable = false;
      return;
    }

    console.log("Fabric filters are available:", fabric.Image.filters);
    this.filterAvailable = true;

    // Optional: Log available filters
    const availableFilters = [];
    for (const filter in fabric.Image.filters) {
      availableFilters.push(filter);
    }
    console.log("Available filters:", availableFilters);
  },

  // Store reference to original image for resetting filters
  storeOriginalImage() {
    if (!this.selectedObject || this.selectedObject.type !== "image") {
      console.warn("Cannot store original image: No image selected");
      return;
    }

    try {
      // If object has _originalElement, use that (it's the original DOM image)
      if (this.selectedObject._originalElement) {
        this.originalImage = this.selectedObject._originalElement;
        console.log("Stored original image from _originalElement");
      }
      // Otherwise use the current element
      else if (this.selectedObject._element) {
        this.originalImage = this.selectedObject._element;
        console.log("Stored original image from _element");
      }
      // Last resort: try to get src and create a new image
      else if (this.selectedObject.getSrc) {
        const imgSrc = this.selectedObject.getSrc();
        const img = new Image();
        img.src = imgSrc;
        img.crossOrigin = "anonymous";
        this.originalImage = img;
        console.log("Created new original image from src");
      } else {
        console.warn("Could not find original image source");
      }
    } catch (error) {
      console.error("Error storing original image:", error);
    }
  },

  // Reset filter values in the UI
  resetFilterValues() {
    console.log("Resetting filter values in UI");
    this.filters = {
      brightness: 0,
      contrast: 0,
      blur: 0,
      noise: 0,
      saturation: 0,
      hue: 0,
      pixelate: 0,
    };
    this.activeFilter = null;
  },

  // Handle file uploads
  handleFileUpload(event) {
    console.log("File upload triggered");
    const files = event.target.files;

    if (!files || files.length === 0) {
      console.warn("No files selected");
      return;
    }

    console.log("Files selected:", files.length);

    Array.from(files).forEach((file, index) => {
      console.log(
        `Processing file ${index + 1}/${files.length}:`,
        file.name,
        file.type,
        file.size + "bytes"
      );

      if (!file.type.match("image.*")) {
        console.warn(`File ${file.name} is not an image, skipping`);
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        console.log(`File ${file.name} loaded successfully`);
        const imgURL = e.target.result;
        console.log(`Image URL (truncated): ${imgURL.substring(0, 30)}...`);

        this.uploads.push({
          url: imgURL,
          name: file.name,
        });
        console.log(
          `Added to uploads array, total count: ${this.uploads.length}`
        );

        // Add to the grid
        const container = document.getElementById("file-upload-con");
        if (container) {
          console.log("Upload container found, adding visual element");
          const imgElement = document.createElement("div");
          imgElement.className =
            "aspect-square border border-gray-200 rounded overflow-hidden";
          imgElement.innerHTML = `<img src="${imgURL}" alt="${file.name}" class="w-full h-full object-cover cursor-pointer">`;

          // Store reference to this for closure
          const self = this;
          imgElement.onclick = function () {
            console.log(`Image clicked: ${file.name}`);
            self.addImageToCanvas(imgURL);
          };

          container.appendChild(imgElement);
          console.log("Image added to visual grid");
        } else {
          console.error("Upload container element not found!");
        }
      };

      reader.onerror = (error) => {
        console.error(`Error reading file ${file.name}:`, error);
      };

      console.log(`Starting to read file ${file.name} as data URL`);
      reader.readAsDataURL(file);
    });
  },

  // Add an image to the canvas
  addImageToCanvas(url) {
    console.log("=== addImageToCanvas START ===");

    // Check if fabric is available
    if (typeof fabric === "undefined" || !window.canvas) {
      console.error("Fabric.js or canvas not available!");
      return;
    }

    try {
      // Store reference to 'this' for use in callbacks
      const self = this;

      // Create a native DOM Image element
      const imgElement = new Image();
      imgElement.crossOrigin = "anonymous";

      // Set up load event handler
      imgElement.onload = function () {
        console.log(
          "DOM Image loaded successfully:",
          this.width,
          "x",
          this.height
        );

        try {
          // Create Fabric.js Image object from the DOM Image
          const fabricImage = new fabric.Image(imgElement, {
            left: window.canvas.width / 2,
            top: window.canvas.height / 2,
            originX: "center",
            originY: "center",
            name: "Uploaded Image",
          });

          // Scale the image to fit within max dimensions
          const maxWidth = 400;
          const maxHeight = 300;
          const scaleX = maxWidth / fabricImage.width;
          const scaleY = maxHeight / fabricImage.height;
          const scale = Math.min(scaleX, scaleY, 1);
          fabricImage.scale(scale);

          // Add to canvas
          window.canvas.add(fabricImage);
          window.canvas.setActiveObject(fabricImage);
          window.canvas.renderAll();

          // Update the component state
          self.selectedObject = fabricImage;
          self.syncObjectProperties();

          // Store the original image for filter resets
          self.originalImage = imgElement;

          // Initialize the selectedImage object with default filter values
          self.selectedImage = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            vibrance: 0,
            noise: 0,
            blur: 0,
            hue: 0,
            pixelate: 0,
          };
        } catch (error) {
          console.error("Error creating or adding Fabric Image:", error);
        }
      };

      // Start loading the image
      imgElement.src = url;
    } catch (e) {
      console.error("Exception in overall image loading process:", e);
    }
  },

  // Synchronize object properties
  syncObjectProperties() {
    console.log("Synchronizing object properties");
    if (!this.selectedObject) {
      console.warn("No selected object to synchronize");
      return;
    }

    const obj = this.selectedObject;
    console.log("Selected object:", obj.type);

    // Get current object properties
    this.objectProperties = {
      opacity: obj.opacity !== undefined ? obj.opacity : 1,
      stroke: obj.stroke || "#000000",
      strokeWidth: obj.strokeWidth !== undefined ? obj.strokeWidth : 0,
      radius: obj.clipPath ? obj.clipPath.rx || 0 : 0,
      skewX: obj.skewX || 0,
      skewY: obj.skewY || 0,
      fill: obj.fill || "#000000",
      shadowEnabled: !!obj.shadow,
      shadowColor: obj.shadow ? obj.shadow.color : "#dddddd",
      shadowBlur: obj.shadow ? obj.shadow.blur : 20,
      shadowOffsetX: obj.shadow ? obj.shadow.offsetX : 0,
      shadowOffsetY: obj.shadow ? obj.shadow.offsetY : 0,
    };

    console.log("Object properties synchronized:", this.objectProperties);
  },

  // MAIN FILTER APPLICATION FUNCTION
  applyFilter(filterType, value) {
    console.log(`Applying ${filterType} filter with value: ${value}`);

    // Declare the variable first
    let activeObject;

    // Then assign it
    activeObject = window.canvas.getActiveObject();

    // Now you can log it
    console.log(`Active object:`, activeObject);
    console.log(
      `Active object type:`,
      activeObject ? activeObject.type : "none"
    );
    console.log(
      `Is an image:`,
      activeObject
        ? activeObject.isType
          ? activeObject.isType("image")
          : activeObject.type === "image"
        : false
    );

    // Check if we have an active object
    if (!activeObject) {
      console.warn("No object selected");
      return;
    }

    // For Fabric.js 5+, use isType if available, otherwise check type property
    const isImage = activeObject.isType
      ? activeObject.isType("image")
      : activeObject.type === "image";
    if (!isImage) {
      console.warn("Selected object is not an image");
      return;
    }

    // Update the selectedImage object
    if (filterType === "HueRotation") {
      this.selectedImage.hue = Number(value);
    } else {
      this.selectedImage[filterType.toLowerCase()] = Number(value);
    }

    try {
      // Store original image reference if not already stored
      if (!this.originalImage) {
        console.log("Storing original image reference");
        this.originalImage =
          activeObject._originalElement || activeObject._element;
      }

      // Remove existing filters of the same type
      activeObject.filters = activeObject.filters || [];
      activeObject.filters = activeObject.filters.filter(
        (filter) => !filter.type || filter.type !== filterType
      );

      // Create filter only if value is not neutral
      let shouldAddFilter = true;
      let filterProperty = filterType.toLowerCase();

      // Handle special cases and determine if we should add the filter
      switch (filterType) {
        case "Brightness":
        case "Contrast":
        case "Saturation":
          shouldAddFilter = Number(value) !== 0;
          break;
        case "HueRotation":
          filterProperty = "rotation";
          shouldAddFilter = Number(value) !== 0;
          break;
        case "Blur":
        case "Noise":
          shouldAddFilter = Number(value) > 0;
          break;
        case "Pixelate":
          filterProperty = "blocksize";
          shouldAddFilter = Number(value) > 2;
          break;
      }

      // Only add the filter if the value is not neutral
      if (shouldAddFilter) {
        console.log(
          `Adding ${filterType} filter with ${filterProperty}=${value}`
        );
        const filter = new fabric.Image.filters[filterType]({
          [filterProperty]: Number(value),
        });
        activeObject.filters.push(filter);
      }

      // Apply filters and render
      console.log("Applying filters...");
      activeObject.applyFilters();
      window.canvas.renderAll();
      console.log("Filters applied and canvas rendered");
    } catch (error) {
      console.error("Error applying filter:", error);
    }
  },
  // Add this to your component data
  originalImageElement: null,

  // Modify your addImage function to store the original image
  addImage(image) {
    this.selectedImage = {
      ...image,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      vibrance: 0,
      noise: 0,
      blur: 0,
    };

    let imageElement = new Image();
    imageElement.src = image.url;

    // Store original image for filter resets
    this.originalImageElement = imageElement;

    let fabricImage = new FabricImage(imageElement, {
      top: 50,
      left: 50,
    });

    fabricImage.scale(0.5);
    canvas.add(fabricImage);
    canvas.setActiveObject(fabricImage);
    canvas.requestRenderAll();
  },

  // Modify applySimpleFilter to rebuild from original
  applySimpleFilter(filterType, value) {
    let activeObject = canvas.getActiveObject();
    if (!activeObject || !activeObject.isType("image")) {
      console.warn("Please select an image");
      return;
    }

    // Update the value in our tracking object
    let filterProperty = filterType.toLowerCase();
    this.selectedImage[filterProperty] = Number(value);

    // If we have the original image, create a new image instance with all current filters
    if (this.originalImageElement) {
      // Create a new image from the original
      let newImage = new FabricImage(this.originalImageElement, {
        top: activeObject.top,
        left: activeObject.left,
        scaleX: activeObject.scaleX,
        scaleY: activeObject.scaleY,
        angle: activeObject.angle,
        flipX: activeObject.flipX,
        flipY: activeObject.flipY,
      });

      // Build all filters from scratch based on current values
      let allFilters = [];

      // Only add filters with non-zero values
      if (this.selectedImage.brightness !== 0) {
        allFilters.push(
          new filters.Brightness({
            brightness: this.selectedImage.brightness,
          })
        );
      }

      if (this.selectedImage.contrast !== 0) {
        allFilters.push(
          new filters.Contrast({
            contrast: this.selectedImage.contrast,
          })
        );
      }

      if (this.selectedImage.saturation !== 0) {
        allFilters.push(
          new filters.Saturation({
            saturation: this.selectedImage.saturation,
          })
        );
      }

      if (this.selectedImage.vibrance !== 0) {
        allFilters.push(
          new filters.Vibrance({
            vibrance: this.selectedImage.vibrance,
          })
        );
      }

      // Fix for noise filter - adjust the multiplier to get it in the right range
      if (this.selectedImage.noise !== 0) {
        allFilters.push(
          new filters.Noise({
            noise: Math.round(this.selectedImage.noise * 400), // Try a higher multiplier
          })
        );
      }

      if (this.selectedImage.blur !== 0) {
        allFilters.push(
          new filters.Blur({
            blur: this.selectedImage.blur,
          })
        );
      }

      // Apply all filters to new image
      newImage.filters = allFilters;
      newImage.applyFilters();

      // Replace the old image on canvas
      const index = canvas.getObjects().indexOf(activeObject);
      canvas.remove(activeObject);
      canvas.insertAt(newImage, index);
      canvas.setActiveObject(newImage);
      canvas.requestRenderAll();
    } else {
      // Fallback to original approach if original image isn't available
      let filterProperty = filterType.toLowerCase();
      activeObject.filters = activeObject.filters.filter(
        (ele) => ele.type !== filterType
      );

      if (Number(value) !== 0) {
        // Special handling for Noise filter
        if (filterType === "Noise") {
          const filter = new filters.Noise({
            noise: Math.round(Number(value) * 400), // Try a higher multiplier
          });
          activeObject.filters.push(filter);
        } else {
          const filter = new filters[filterType]({
            [filterProperty]: Number(value),
          });
          activeObject.filters.push(filter);
        }
      }

      activeObject.applyFilters();
      canvas.requestRenderAll();
    }
  },

  // Apply brightness and contrast adjustments
  applyBrightnessContrast(data, brightness, contrast) {
    brightness = parseFloat(brightness) * 255; // Scale to -255 to 255
    contrast = parseFloat(contrast) * 255; // Scale to -255 to 255

    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < data.length; i += 4) {
      // Apply brightness
      data[i] += brightness; // Red
      data[i + 1] += brightness; // Green
      data[i + 2] += brightness; // Blue

      // Apply contrast
      if (contrast !== 0) {
        data[i] = factor * (data[i] - 128) + 128;
        data[i + 1] = factor * (data[i + 1] - 128) + 128;
        data[i + 2] = factor * (data[i + 2] - 128) + 128;
      }

      // Ensure values are in range 0-255
      data[i] = Math.max(0, Math.min(255, data[i]));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
    }
  },

  // Apply hue and saturation adjustments
  applyHueSaturation(data, hue, saturation) {
    hue = parseFloat(hue) * Math.PI; // Scale to -2pi to 2pi
    saturation = parseFloat(saturation); // Scale is already -1 to 1

    for (let i = 0; i < data.length; i += 4) {
      // Convert RGB to HSL
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h,
        s,
        l = (max + min) / 2;

      if (max === min) {
        h = s = 0; // achromatic
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }

        h /= 6;
      }

      // Apply hue adjustment
      h += hue / (2 * Math.PI);
      h %= 1;
      if (h < 0) h += 1;

      // Apply saturation adjustment
      if (saturation !== 0) {
        if (saturation > 0) {
          s += (1 - s) * saturation;
        } else {
          s += s * saturation;
        }
        s = Math.max(0, Math.min(1, s));
      }

      // Convert back to RGB
      let r1, g1, b1;

      if (s === 0) {
        r1 = g1 = b1 = l; // achromatic
      } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        r1 = this.hue2rgb(p, q, h + 1 / 3);
        g1 = this.hue2rgb(p, q, h);
        b1 = this.hue2rgb(p, q, h - 1 / 3);
      }

      // Convert back to 0-255 range
      data[i] = Math.round(r1 * 255);
      data[i + 1] = Math.round(g1 * 255);
      data[i + 2] = Math.round(b1 * 255);
    }
  },

  // Helper function for HSL to RGB conversion
  hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  },

  // Apply blur filter
  applyBlur(imageData, radius) {
    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Simple box blur implementation
    const iterations = Math.min(3, Math.max(1, Math.floor(radius / 2)));
    const boxSize = Math.max(1, Math.floor(radius / iterations));

    // Create temporary array for processing
    const tempPixels = new Uint8ClampedArray(pixels.length);

    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0,
          count = 0;

        // Sample within box radius
        for (let i = -boxSize; i <= boxSize; i++) {
          const xPos = Math.min(width - 1, Math.max(0, x + i));
          const idx = (y * width + xPos) * 4;

          r += pixels[idx];
          g += pixels[idx + 1];
          b += pixels[idx + 2];
          a += pixels[idx + 3];
          count++;
        }

        // Average and set in temp array
        const targetIdx = (y * width + x) * 4;
        tempPixels[targetIdx] = r / count;
        tempPixels[targetIdx + 1] = g / count;
        tempPixels[targetIdx + 2] = b / count;
        tempPixels[targetIdx + 3] = a / count;
      }
    }

    // Vertical pass
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0,
          count = 0;

        // Sample within box radius
        for (let i = -boxSize; i <= boxSize; i++) {
          const yPos = Math.min(height - 1, Math.max(0, y + i));
          const idx = (yPos * width + x) * 4;

          r += tempPixels[idx];
          g += tempPixels[idx + 1];
          b += tempPixels[idx + 2];
          a += tempPixels[idx + 3];
          count++;
        }

        // Average and set back in original array
        const targetIdx = (y * width + x) * 4;
        pixels[targetIdx] = r / count;
        pixels[targetIdx + 1] = g / count;
        pixels[targetIdx + 2] = b / count;
        pixels[targetIdx + 3] = a / count;
      }
    }
  },

  // Apply noise filter
  applyNoise(data, amount) {
    const noise = Math.max(0, Math.min(1000, amount)) / 10; // Scale to reasonable range

    for (let i = 0; i < data.length; i += 4) {
      if (i % 4 === 3) continue; // Skip alpha channel

      // Add random noise
      const randomNoise = (Math.random() - 0.5) * noise;
      data[i] = Math.max(0, Math.min(255, data[i] + randomNoise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + randomNoise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + randomNoise));
    }
  },

  // Apply pixelate filter
  applyPixelate(imageData, blockSize) {
    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    blockSize = Math.max(2, Math.min(20, blockSize));

    for (let y = 0; y < height; y += blockSize) {
      for (let x = 0; x < width; x += blockSize) {
        // Get the color of the first pixel in the block
        const sourceIdx = (y * width + x) * 4;
        const r = pixels[sourceIdx];
        const g = pixels[sourceIdx + 1];
        const b = pixels[sourceIdx + 2];
        const a = pixels[sourceIdx + 3];

        // Apply this color to all pixels in the block
        for (let by = 0; by < blockSize && y + by < height; by++) {
          for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
            const targetIdx = ((y + by) * width + (x + bx)) * 4;
            pixels[targetIdx] = r;
            pixels[targetIdx + 1] = g;
            pixels[targetIdx + 2] = b;
            pixels[targetIdx + 3] = a;
          }
        }
      }
    }
  },

  // Apply a preset filter
  applyPresetFilter(filterName) {
    console.log(`Applying preset filter: ${filterName}`);

    // Check if filters are available
    if (!this.filterAvailable) {
      console.warn("Filters are not available in this Fabric.js instance");
      return;
    }

    if (!this.selectedObject) {
      console.warn("No selected object for preset filter");
      return;
    }

    if (!window.canvas) {
      console.error("Canvas not available for preset filter");
      return;
    }

    if (this.selectedObject.type !== "image") {
      console.warn("Selected object is not an image");
      return;
    }

    // Use the custom filter implementation
    this.applyCustomFilter(filterName);
  },

  // Custom Filter View implementation
  applyCustomFilter(filterName) {
    console.log(`Applying custom filter: ${filterName}`);

    if (!this.selectedObject || !window.canvas) {
      console.warn("No selected object or canvas available");
      return;
    }

    if (this.selectedObject.type !== "image") {
      console.warn("Selected object is not an image");
      return;
    }

    // Set active filter name
    this.activeFilter = filterName;

    // Store the original image when first applying a filter
    if (!this.originalImage) {
      this.storeOriginalImage();
      if (!this.originalImage) {
        console.error("Cannot apply filter: Failed to store original image");
        return;
      }
    }

    // Create a temporary canvas to apply filters
    const tempCanvas = document.createElement("canvas");

    // Use original image to avoid quality loss
    const imgElement = this.originalImage;

    // Set canvas size to match image
    tempCanvas.width = imgElement.width;
    tempCanvas.height = imgElement.height;
    const ctx = tempCanvas.getContext("2d");

    // Draw original image
    ctx.drawImage(imgElement, 0, 0);

    // Get image data for manipulation
    const imageData = ctx.getImageData(
      0,
      0,
      tempCanvas.width,
      tempCanvas.height
    );
    const data = imageData.data;

    // Apply filter effects based on filter name
    switch (filterName) {
      case "grayscale":
      case "black_white":
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = avg;
          data[i + 1] = avg;
          data[i + 2] = avg;
        }
        break;

      case "sepia":
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
          data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
          data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
        }
        break;

      case "invert":
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 255 - data[i];
          data[i + 1] = 255 - data[i + 1];
          data[i + 2] = 255 - data[i + 2];
        }
        break;

      case "brownie":
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          data[i] = r * 0.59 + g * 0.34 + b * 0.07;
          data[i + 1] = r * 0.31 + g * 0.54 + b * 0.15;
          data[i + 2] = r * 0.19 + g * 0.28 + b * 0.47;
        }
        break;

      case "kodachrome":
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Boost colors with cross-processing effect
          data[i] = Math.min(255, r * 1.2 + g * 0.1 + b * 0.1);
          data[i + 1] = Math.min(255, r * 0.1 + g * 1.1 + b * 0.1);
          data[i + 2] = Math.min(255, r * 0.1 + g * 0.1 + b * 1.3);
        }
        break;

      case "technicolor":
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          data[i] = Math.min(255, r * 1.3 - g * 0.1 - b * 0.1);
          data[i + 1] = Math.min(255, g * 1.2 - r * 0.1 - b * 0.1);
          data[i + 2] = Math.min(255, b * 1.2 - r * 0.1 - g * 0.1);
        }
        break;

      case "sharpen":
        // Sharpen using a convolution kernel
        {
          const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
          const side = Math.round(Math.sqrt(kernel.length));
          const halfSide = Math.floor(side / 2);
          const w = imageData.width;
          const h = imageData.height;

          // Create temp array for the convolution result
          const temp = new Uint8ClampedArray(data.length);

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              let r = 0,
                g = 0,
                b = 0;

              // Apply convolution kernel
              for (let ky = 0; ky < side; ky++) {
                for (let kx = 0; kx < side; kx++) {
                  const pixelX = Math.min(
                    w - 1,
                    Math.max(0, x + kx - halfSide)
                  );
                  const pixelY = Math.min(
                    h - 1,
                    Math.max(0, y + ky - halfSide)
                  );
                  const offset = (pixelY * w + pixelX) * 4;
                  const weight = kernel[ky * side + kx];

                  r += data[offset] * weight;
                  g += data[offset + 1] * weight;
                  b += data[offset + 2] * weight;
                }
              }

              // Write result to temp array
              const dstOffset = (y * w + x) * 4;
              temp[dstOffset] = Math.min(255, Math.max(0, r));
              temp[dstOffset + 1] = Math.min(255, Math.max(0, g));
              temp[dstOffset + 2] = Math.min(255, Math.max(0, b));
              temp[dstOffset + 3] = data[dstOffset + 3]; // Keep original alpha
            }
          }

          // Copy temp array back to data
          for (let i = 0; i < data.length; i++) {
            data[i] = temp[i];
          }
        }
        break;

      case "emboss":
        // Emboss effect using convolution
        {
          const kernel = [1, 1, 1, 1, 0.7, -1, -1, -1, -1];
          const side = Math.round(Math.sqrt(kernel.length));
          const halfSide = Math.floor(side / 2);
          const w = imageData.width;
          const h = imageData.height;

          // Create temp array for the convolution result
          const temp = new Uint8ClampedArray(data.length);

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              let r = 0,
                g = 0,
                b = 0;

              // Apply convolution kernel
              for (let ky = 0; ky < side; ky++) {
                for (let kx = 0; kx < side; kx++) {
                  const pixelX = Math.min(
                    w - 1,
                    Math.max(0, x + kx - halfSide)
                  );
                  const pixelY = Math.min(
                    h - 1,
                    Math.max(0, y + ky - halfSide)
                  );
                  const offset = (pixelY * w + pixelX) * 4;
                  const weight = kernel[ky * side + kx];

                  r += data[offset] * weight;
                  g += data[offset + 1] * weight;
                  b += data[offset + 2] * weight;
                }
              }

              // Write result to temp array
              const dstOffset = (y * w + x) * 4;
              temp[dstOffset] = Math.min(255, Math.max(0, r));
              temp[dstOffset + 1] = Math.min(255, Math.max(0, g));
              temp[dstOffset + 2] = Math.min(255, Math.max(0, b));
              temp[dstOffset + 3] = data[dstOffset + 3]; // Keep original alpha
            }
          }

          // Copy temp array back to data
          for (let i = 0; i < data.length; i++) {
            data[i] = temp[i];
          }
        }
        break;

      case "polaroid":
        // Warm colors + vignette effect
        for (let i = 0; i < data.length; i += 4) {
          // First, warm the colors (increase red, decrease blue)
          data[i] = Math.min(255, data[i] * 1.1); // More red
          data[i + 2] = Math.min(255, data[i + 2] * 0.9); // Less blue

          // Add slight contrast
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] += (data[i] - avg) * 0.1;
          data[i + 1] += (data[i + 1] - avg) * 0.1;
          data[i + 2] += (data[i + 2] - avg) * 0.1;

          // Ensure values are in valid range
          data[i] = Math.min(255, Math.max(0, data[i]));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1]));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2]));
        }
        break;

      case "vintage":
        // Vintage effect (sepia + desaturation + slight contrast adjustment)
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // First apply sepia
          let newR = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
          let newG = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
          let newB = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);

          // Then reduce contrast slightly
          const grey = 0.2989 * newR + 0.587 * newG + 0.114 * newB; // Luminance
          const factor = 0.15; // Contrast reduction factor

          newR = grey + (1 - factor) * (newR - grey);
          newG = grey + (1 - factor) * (newG - grey);
          newB = grey + (1 - factor) * (newB - grey);

          data[i] = Math.min(255, Math.max(0, newR));
          data[i + 1] = Math.min(255, Math.max(0, newG));
          data[i + 2] = Math.min(255, Math.max(0, newB));
        }
        break;
    }

    // Put modified pixels back
    ctx.putImageData(imageData, 0, 0);

    // Create new image from filtered canvas
    const newImg = new Image();
    newImg.onload = () => {
      // Replace the image element in the Fabric.js object
      this.selectedObject._element = newImg;

      // Force a re-render
      this.selectedObject.dirty = true;
      window.canvas.renderAll();
      console.log("Custom filter applied successfully");
    };
    newImg.src = tempCanvas.toDataURL();
  },

  // Reset all filters
  resetFilters() {
    console.log("Resetting all filters");

    if (!this.selectedObject || this.selectedObject.type !== "image") {
      console.warn("Cannot reset filters: No image selected");
      return;
    }

    if (!this.originalImage) {
      console.warn("Cannot reset filters: No original image stored");
      return;
    }

    try {
      // Reset our tracking filters object
      this.resetFilterValues();

      // Create a new image with the original source
      const newImg = new Image();
      newImg.crossOrigin = "anonymous";

      newImg.onload = () => {
        // Get properties of current object
        const props = {
          scaleX: this.selectedObject.scaleX,
          scaleY: this.selectedObject.scaleY,
          left: this.selectedObject.left,
          top: this.selectedObject.top,
          angle: this.selectedObject.angle || 0,
          flipX: this.selectedObject.flipX || false,
          flipY: this.selectedObject.flipY || false,
          originX: this.selectedObject.originX || "center",
          originY: this.selectedObject.originY || "center",
        };

        // Create a new fabric image
        const fabricImg = new fabric.Image(newImg, props);

        // Replace current object
        const objIndex = window.canvas
          .getObjects()
          .indexOf(this.selectedObject);
        if (objIndex !== -1) {
          window.canvas.remove(this.selectedObject);
          window.canvas.insertAt(fabricImg, objIndex);
          window.canvas.setActiveObject(fabricImg);
          this.selectedObject = fabricImg;
        } else {
          window.canvas.add(fabricImg);
          window.canvas.setActiveObject(fabricImg);
          this.selectedObject = fabricImg;
        }

        window.canvas.renderAll();
        console.log("Filters reset successfully");
      };

      // Handle error
      newImg.onerror = (error) => {
        console.error("Error creating new image for filter reset:", error);
      };

      // Set source from original image
      if (this.originalImage.src) {
        newImg.src = this.originalImage.src;
      } else if (this.originalImage.toDataURL) {
        // If originalImage is a canvas element
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = this.originalImage.width;
        tempCanvas.height = this.originalImage.height;
        const ctx = tempCanvas.getContext("2d");
        ctx.drawImage(this.originalImage, 0, 0);
        newImg.src = tempCanvas.toDataURL();
      } else {
        console.error("Cannot determine source for original image");
      }
    } catch (error) {
      console.error("Error resetting filters:", error);
    }
  },

  // Update object property
  updateObjectProperty(property, value) {
    console.log(`Updating object property: ${property} to ${value}`);

    // Ensure we have a selected object and canvas
    if (!this.selectedObject) {
      console.error("No selected object available");
      return;
    }

    if (!window.canvas) {
      console.error("Canvas not available");
      return;
    }

    // Convert value based on property type
    let finalValue;
    switch (property) {
      case "opacity":
      case "strokeWidth":
      case "skewX":
      case "skewY":
        finalValue = parseFloat(value);
        if (isNaN(finalValue)) {
          console.warn(`Invalid number for ${property}: ${value}`);
          return;
        }
        break;
      case "stroke":
      case "fill":
        finalValue = value; // Colors are strings
        break;
      default:
        console.warn(`Unhandled property: ${property}`);
        finalValue = value; // Default to raw value
        break;
    }

    // Apply the property to the selected object
    console.log(`Setting ${property} = ${finalValue} on object`);
    try {
      // Set the property on the object
      this.selectedObject.set(property, finalValue);

      // Special case for stroke: need to make sure strokeWidth is non-zero
      if (property === "stroke" && this.selectedObject.strokeWidth === 0) {
        console.log("Stroke color set but width is 0. Setting default width.");
        this.selectedObject.set("strokeWidth", 1);
        this.objectProperties.strokeWidth = 1;
      }
    } catch (e) {
      console.error(`Error setting property ${property}:`, e);
      return;
    }

    // Update local state (objectProperties)
    if (property in this.objectProperties) {
      console.log(`Updating objectProperties.${property}`);
      this.objectProperties[property] = finalValue;
    } else {
      console.warn(`Property ${property} not in objectProperties`);
    }

    // Special handling for radius (if called directly, though typically via updateClipPath)
    if (property === "radius") {
      console.log("Calling updateClipPath for radius property");
      this.updateClipPath(finalValue);
    }

    // Re-render the canvas
    console.log("Rendering canvas after property update");
    try {
      window.canvas.renderAll();
      console.log("Canvas rendered successfully");
    } catch (e) {
      console.error("Error rendering canvas:", e);
    }
  },

  // Update clip path (for rounded corners)
  updateClipPath(radius) {
    console.log(`Updating clip path with radius: ${radius}`);

    if (!this.selectedObject || !window.canvas) {
      console.warn("No selected object or canvas available");
      return;
    }

    // Parse radius as float and validate
    const radiusValue = parseFloat(radius);
    if (isNaN(radiusValue)) {
      console.warn(`Invalid radius value: ${radius}`);
      return;
    }

    // Update internal state
    this.objectProperties.radius = radiusValue;

    // If radius is 0, remove clip path
    if (radiusValue <= 0) {
      this.selectedObject.clipPath = null;
      window.canvas.renderAll();
      return;
    }

    // Get object dimensions
    const width = this.selectedObject.width * this.selectedObject.scaleX;
    const height = this.selectedObject.height * this.selectedObject.scaleY;

    // Create rounded rectangle clip path
    const clipPath = new fabric.Rect({
      width: width,
      height: height,
      rx: radiusValue,
      ry: radiusValue,
      originX: "center",
      originY: "center",
    });

    // Apply clip path
    this.selectedObject.clipPath = clipPath;

    // Render canvas
    window.canvas.renderAll();
    console.log("Clip path updated successfully");
  },

  // Toggle shadow on/off
  toggleShadow() {
    console.log(`Toggling shadow: ${this.objectProperties.shadowEnabled}`);

    if (!this.selectedObject || !window.canvas) {
      console.warn("No selected object or canvas available");
      return;
    }

    if (this.objectProperties.shadowEnabled) {
      // Create shadow object if enabled
      this.selectedObject.shadow = new fabric.Shadow({
        color: this.objectProperties.shadowColor,
        blur: this.objectProperties.shadowBlur,
        offsetX: this.objectProperties.shadowOffsetX,
        offsetY: this.objectProperties.shadowOffsetY,
      });
    } else {
      // Remove shadow if disabled
      this.selectedObject.shadow = null;
    }

    // Render canvas
    window.canvas.renderAll();
    console.log("Shadow toggled successfully");
  },

  // Update shadow properties
  updateShadow(property, value) {
    console.log(`Updating shadow ${property}: ${value}`);

    if (!this.selectedObject || !window.canvas) {
      console.warn("No selected object or canvas available");
      return;
    }

    if (!this.objectProperties.shadowEnabled) {
      console.warn("Shadow is disabled");
      return;
    }

    // Update internal state
    switch (property) {
      case "color":
        this.objectProperties.shadowColor = value;
        break;
      case "blur":
        this.objectProperties.shadowBlur = parseFloat(value);
        break;
      case "offsetX":
        this.objectProperties.shadowOffsetX = parseFloat(value);
        break;
      case "offsetY":
        this.objectProperties.shadowOffsetY = parseFloat(value);
        break;
      default:
        console.warn(`Unknown shadow property: ${property}`);
        return;
    }

    // Create or update shadow object
    this.selectedObject.shadow = new fabric.Shadow({
      color: this.objectProperties.shadowColor,
      blur: this.objectProperties.shadowBlur,
      offsetX: this.objectProperties.shadowOffsetX,
      offsetY: this.objectProperties.shadowOffsetY,
    });

    // Render canvas
    window.canvas.renderAll();
    console.log("Shadow updated successfully");
  },
});
