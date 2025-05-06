// src/utils/export-utils.js
export function downloadPNG() {
  if (!window.canvas) return;

  // DEBUG LOGGING
  console.log("=== DEBUG PNG EXPORT START ===");
  console.log(`Canvas element ID: ${window.canvas.lowerCanvasEl.id}`);
  console.log(`Canvas internal dimensions: ${window.canvas.width}x${window.canvas.height}`);
  console.log(`Canvas CSS dimensions: ${window.canvas.lowerCanvasEl.style.width}x${window.canvas.lowerCanvasEl.style.height}`);
  
  if (window.fabricComponent && window.fabricComponent.settings) {
    console.log(`Settings component values:`);
    console.log(`- Selected Size: ${window.fabricComponent.settings.selectedSize}`);
    console.log(`- Selected Value: ${window.fabricComponent.settings.selectedValue}`);
    console.log(`- Custom Width: ${window.fabricComponent.settings.customWidth}`);
    console.log(`- Custom Height: ${window.fabricComponent.settings.customHeight}`);
    console.log(`- Export Width: ${window.fabricComponent.settings.exportWidth}`);
    console.log(`- Export Height: ${window.fabricComponent.settings.exportHeight}`);
  } else {
    console.log("Settings component not available");
  }
  console.log("=== DEBUG PNG EXPORT END ===");

  // Store current dimensions
  const currentWidth = window.canvas.width;
  const currentHeight = window.canvas.height;
  const currentCSSWidth = window.canvas.lowerCanvasEl.style.width;
  const currentCSSHeight = window.canvas.lowerCanvasEl.style.height;
  
  // Store current zoom and viewport transform
  const currentZoom = window.canvas.getZoom();
  const currentVPT = [...window.canvas.viewportTransform];
  
  // Store the current background color
  const currentBackgroundColor = window.canvas.backgroundColor;

  // FORCIBLY get dimensions from settings - this is the most direct approach
  let exportWidth, exportHeight;
  
  // Get dimensions from the selected size value
  if (window.fabricComponent && window.fabricComponent.settings) {
    // Get the selected value from settings (e.g. "820x312" for Facebook Cover)
    const selectedValue = window.fabricComponent.settings.selectedValue;
    
    // If it's a custom size, use those dimensions
    if (selectedValue === 'custom') {
      exportWidth = window.fabricComponent.settings.customWidth;
      exportHeight = window.fabricComponent.settings.customHeight;
      console.log(`Using custom dimensions: ${exportWidth}x${exportHeight}`);
    } 
    // Otherwise, parse dimensions from the selectedValue string (e.g. "820x312")
    else if (selectedValue && selectedValue.includes('x')) {
      const dimensions = selectedValue.split('x');
      exportWidth = parseInt(dimensions[0]);
      exportHeight = parseInt(dimensions[1]);
      console.log(`Using dimensions from selected value: ${exportWidth}x${exportHeight}`);
    }
    // Fallback to exportWidth/Height from settings
    else if (window.fabricComponent.settings.exportWidth && window.fabricComponent.settings.exportHeight) {
      exportWidth = window.fabricComponent.settings.exportWidth;
      exportHeight = window.fabricComponent.settings.exportHeight;
      console.log(`Using exportWidth/Height from settings: ${exportWidth}x${exportHeight}`);
    }
  }
  
  // If we still don't have dimensions, use default values based on canvas size
  if (!exportWidth || !exportHeight || isNaN(exportWidth) || isNaN(exportHeight)) {
    exportWidth = currentWidth;
    exportHeight = currentHeight;
    console.log(`Falling back to canvas dimensions: ${exportWidth}x${exportHeight}`);
  }

  console.log(`Exporting PNG at ${exportWidth}x${exportHeight}`);

  // Temporarily disable viewport transform to ensure correct positioning
  window.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  window.canvas.setZoom(1);
  
  // For PNG, set transparent background
  window.canvas.backgroundColor = 'transparent';

  // Set canvas to export dimensions
  window.canvas.setDimensions({
    width: exportWidth,
    height: exportHeight
  });

  // Also set CSS dimensions to match export size for proper rendering
  window.canvas.setDimensions({
    width: exportWidth,
    height: exportHeight
  }, { cssOnly: true });

  // Force an additional render to ensure dimensions are applied
  window.canvas.requestRenderAll();
  
  // Small delay to ensure the canvas is fully rendered at the new dimensions
  setTimeout(() => {
    // Generate the data URL at the export dimensions with transparent background for PNG
    const dataURL = window.canvas.toDataURL({
      format: "png",
      quality: 1,
      enableRetinaScaling: false,
      withoutTransform: true,
      multiplier: 1,
      dpi: 72
    });

    // Create and trigger download
    const link = document.createElement("a");
    link.download = "canvas-export.png";
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Restore original canvas dimensions
    window.canvas.setDimensions({
      width: currentWidth,
      height: currentHeight
    });

    // Restore responsive CSS dimensions
    window.canvas.setDimensions({
      width: currentCSSWidth,
      height: currentCSSHeight
    }, { cssOnly: true });

    // Restore original background
    window.canvas.backgroundColor = currentBackgroundColor;

    // Restore original zoom and viewport transform
    window.canvas.setZoom(currentZoom);
    window.canvas.setViewportTransform(currentVPT);

    window.canvas.requestRenderAll();
    console.log("Canvas restored to responsive display");
  }, 100);
}

export function downloadJPG() {
  if (!window.canvas) return;

  // Store current dimensions
  const currentWidth = window.canvas.width;
  const currentHeight = window.canvas.height;
  const currentCSSWidth = window.canvas.lowerCanvasEl.style.width;
  const currentCSSHeight = window.canvas.lowerCanvasEl.style.height;
  
  // Store current zoom and viewport transform
  const currentZoom = window.canvas.getZoom();
  const currentVPT = [...window.canvas.viewportTransform];
  
  // Store the current background color
  const currentBackgroundColor = window.canvas.backgroundColor;

  // FORCIBLY get dimensions from settings - this is the most direct approach
  let exportWidth, exportHeight;
  
  // Get dimensions from the selected size value
  if (window.fabricComponent && window.fabricComponent.settings) {
    // Get the selected value from settings (e.g. "820x312" for Facebook Cover)
    const selectedValue = window.fabricComponent.settings.selectedValue;
    
    // If it's a custom size, use those dimensions
    if (selectedValue === 'custom') {
      exportWidth = window.fabricComponent.settings.customWidth;
      exportHeight = window.fabricComponent.settings.customHeight;
      console.log(`Using custom dimensions: ${exportWidth}x${exportHeight}`);
    } 
    // Otherwise, parse dimensions from the selectedValue string (e.g. "820x312")
    else if (selectedValue && selectedValue.includes('x')) {
      const dimensions = selectedValue.split('x');
      exportWidth = parseInt(dimensions[0]);
      exportHeight = parseInt(dimensions[1]);
      console.log(`Using dimensions from selected value: ${exportWidth}x${exportHeight}`);
    }
    // Fallback to exportWidth/Height from settings
    else if (window.fabricComponent.settings.exportWidth && window.fabricComponent.settings.exportHeight) {
      exportWidth = window.fabricComponent.settings.exportWidth;
      exportHeight = window.fabricComponent.settings.exportHeight;
      console.log(`Using exportWidth/Height from settings: ${exportWidth}x${exportHeight}`);
    }
  }
  
  // If we still don't have dimensions, use default values based on canvas size
  if (!exportWidth || !exportHeight || isNaN(exportWidth) || isNaN(exportHeight)) {
    exportWidth = currentWidth;
    exportHeight = currentHeight;
    console.log(`Falling back to canvas dimensions: ${exportWidth}x${exportHeight}`);
  }

  console.log(`Exporting JPG at ${exportWidth}x${exportHeight}`);

  // Temporarily disable viewport transform to ensure correct positioning
  window.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  window.canvas.setZoom(1);
  
  // For JPG, ensure the background color is preserved
  // If background is transparent or undefined, set it to white
  if (!currentBackgroundColor || currentBackgroundColor === 'transparent') {
    window.canvas.backgroundColor = '#ffffff';
  }

  // Set canvas to export dimensions
  window.canvas.setDimensions({
    width: exportWidth,
    height: exportHeight
  });

  // Also set CSS dimensions to match export size for proper rendering
  window.canvas.setDimensions({
    width: exportWidth,
    height: exportHeight
  }, { cssOnly: true });

  // Force an additional render to ensure dimensions are applied
  window.canvas.requestRenderAll();
  
  // Small delay to ensure the canvas is fully rendered at the new dimensions
  setTimeout(() => {
    // Generate the data URL at the export dimensions with background
    const dataURL = window.canvas.toDataURL({
      format: "jpeg",
      quality: 0.8,
      enableRetinaScaling: false,
      withoutTransform: true,
      multiplier: 1,
      dpi: 72
    });

    // Create and trigger download
    const link = document.createElement("a");
    link.download = "canvas-export.jpg";
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Restore original canvas dimensions
    window.canvas.setDimensions({
      width: currentWidth,
      height: currentHeight
    });

    // Restore responsive CSS dimensions
    window.canvas.setDimensions({
      width: currentCSSWidth,
      height: currentCSSHeight
    }, { cssOnly: true });

    // Restore original background
    window.canvas.backgroundColor = currentBackgroundColor;

    // Restore original zoom and viewport transform
    window.canvas.setZoom(currentZoom);
    window.canvas.setViewportTransform(currentVPT);

    window.canvas.requestRenderAll();
    console.log("Canvas restored to responsive display");
  }, 100);
}