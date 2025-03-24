import { Canvas, FabricText, Rect } from 'fabric';

export default (() => {
    return {
        init() {
            // Initialize canvas and make it globally available
            const canvas = new Canvas(this.$refs.canvas, {
                preserveObjectStacking: true,
                width: 800,
                height: 600
            });

            // Make canvas available globally for other components
            window.canvas = canvas;

            // Add demo elements
            const helloWorld = new FabricText('Checking Fabric Js', {
                fontFamily: 'Roboto',
                fontSize: 30
            });

            const rect = new Rect({
                fill: '#ff0000',
                left: 400,
                top: 200,
                width: 250,
                height: 250,
            });

            canvas.add(rect);
            canvas.add(helloWorld);
            canvas.centerObject(helloWorld);

            // Set up event listeners to communicate with other components
            canvas.on('selection:created', this.handleSelection);
            canvas.on('selection:updated', this.handleSelection);
            canvas.on('selection:cleared', this.handleSelectionCleared);

            // Dispatch event that canvas is ready
            window.dispatchEvent(new CustomEvent('canvas:initialized', {
                detail: { canvas: canvas }
            }));
        },

        handleSelection() {
            const activeObject = window.canvas.getActiveObject();
            if (activeObject) {
                // Dispatch event to notify panels about selection
                window.dispatchEvent(new CustomEvent('object:selected', {
                    detail: activeObject
                }));
            }
        },

        handleSelectionCleared() {
            // Notify panels that selection is cleared
            window.dispatchEvent(new CustomEvent('selection:cleared'));
        }
    }
});