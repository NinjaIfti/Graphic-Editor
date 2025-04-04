// src/app.js - entry point
import Alpine from "alpinejs";
import * as fabric from "fabric";
import { setupGlobalUtilities, registerAllComponents } from "./fabric.js";

window.Alpine = Alpine;
window.fabric = fabric;

document.addEventListener("alpine:init", () => {
  setupGlobalUtilities();
  registerAllComponents(Alpine);
  console.log("Steve Editor components registered in fabric.js!");
});

Alpine.start();
