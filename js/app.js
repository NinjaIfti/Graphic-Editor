import Alpine from "alpinejs";
import * as fabric from "fabric";
import fabricComponent from "./fabric.js"; // Your custom fabric component

window.Alpine = Alpine;
window.fabric = fabric;
Alpine.data("fabric", fabricComponent);

document.addEventListener("alpine:init", () => {
  console.log("Steve Editor initialized with unified fabric component!");
});

Alpine.start();
