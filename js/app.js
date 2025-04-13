import Alpine from "alpinejs";
import * as fabric from 'fabric';
import fabricComponent from "./fabric.js";  // Your custom fabric component

// Make Alpine globally available
window.Alpine = Alpine;

// Register the fabric components globally
window.fabric = fabric; 

// Register the unified fabric component with Alpine.js
Alpine.data('fabric', fabricComponent);

document.addEventListener("alpine:init", () => {
  console.log("Steve Editor initialized with unified fabric component!");
});

Alpine.start(); // Start Alpine.js
