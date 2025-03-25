import Alpine from "alpinejs";
import { panelManager } from "./Editor/panels/index.js";
import { textPanel, curvedTextPanel } from "./Editor/panels/text.js";
import { layersPanel } from "./Editor/panels/layers.js";
import { uploadsPanel } from "./Editor/panels/uploads.js";
import { settingsPanel } from "./Editor/panels/settings.js";
// Import other components

window.Alpine = Alpine;

// Register components
Alpine.data("panelManager", panelManager);
Alpine.data("textPanel", textPanel);
Alpine.data("curvedTextPanel", curvedTextPanel);
Alpine.data("layersPanel", layersPanel);
Alpine.data("uploadsPanel", uploadsPanel);
Alpine.data("settingsPanel", settingsPanel);
// Register other components

// Initialize Alpine
Alpine.start();
