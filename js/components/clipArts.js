// Clip Arts panel properties and methods
import {FabricImage} from "fabric";
import {addToHistory} from "../utils/history-manager";

export default function clipArtsComponent() {
    return {
        // Gallery of available clip art categories and items
        categories: [
            {id: 'shapes', name: 'Shapes', items: []},
            {id: 'icons', name: 'Icons', items: []},
            {id: 'backgrounds', name: 'Backgrounds', items: []}
        ],
        selectedCategory: 'shapes',
        searchQuery: '',

        // Add a clip art image to the canvas
        addClipArt(src) {
            if (!window.canvas) return;

            FabricImage.fromURL(src, (img) => {
                if (img) { // Ensure image loaded successfully
                    img.scale(0.5).set({
                        left: 100,
                        top: 100,
                        name: 'Clip Art',
                    });

                    window.canvas.add(img);
                    window.canvas.setActiveObject(img);
                    window.canvas.requestRenderAll();

                    // Add to history
                    if (typeof addToHistory === 'function') {
                        addToHistory();
                    }

                    // Dispatch event to update layers panel
                    window.dispatchEvent(new CustomEvent('object:added', {
                        detail: img,
                    }));
                } else {
                    console.error('Failed to load image from:', src);
                }
            }, {
                crossOrigin: 'anonymous', // Handle CORS if needed
            });
        },

        // Load clip art items for a category
        loadCategory(categoryId) {
            this.selectedCategory = categoryId;
            // Here you would typically load items from your database or API
            // This is just a placeholder implementation
        },

        // Search clip art items
        searchClipArt(query) {
            this.searchQuery = query;
            // Implement search functionality here
        }
    }
}