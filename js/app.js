// app.js - Simple version without custom eraser implementation
import Alpine from "alpinejs";
import * as fabric from "fabric";
import fabricComponent from "./fabric.js";

// Make fabric globally available
window.fabric = fabric;

window.Alpine = Alpine;
Alpine.data("fabric", fabricComponent);

document.addEventListener("alpine:init", () => {
  console.log("Steve Editor initialized with unified fabric component!");
});

Alpine.start();