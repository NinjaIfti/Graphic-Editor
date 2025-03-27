// curved-text.js using CircleType
import * as fabric from 'fabric';

// Helper function definition
function getRangeFromPercentage(percentage) {
    percentage = parseInt(percentage) || 0;
    let rangeValue = 2500;
    if (percentage > 0) rangeValue = 2500 + percentage * 25;
    else if (percentage < 0) rangeValue = 2500 - Math.abs(percentage) * 25;
    return rangeValue;
}

// Define CurvedText using CircleType and fabric.js
class CurvedText {
    constructor(text, options = {}) {
        this.text = text || "";
        this.options = options;
        this.fabricObject = this.createFabricObject();
    }

    createFabricObject() {
        // Create a temporary div for CircleType
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.fontFamily = this.options.fontFamily || 'Arial';
        tempDiv.style.fontSize = `${this.options.fontSize || 40}px`;
        tempDiv.style.fontWeight = this.options.fontWeight || 'normal';
        tempDiv.style.fontStyle = this.options.fontStyle || 'normal';
        tempDiv.style.color = this.options.fill || '#000000';
        tempDiv.innerText = this.text;
        document.body.appendChild(tempDiv);

        // Create CircleType instance
        const circleType = new CircleType(tempDiv);

        // Set radius based on percentage
        const percentage = parseFloat(this.options.percentage || 0);
        const diameter = parseInt(this.options.diameter || 200);

        if (percentage !== 0) {
            const radius = diameter / 2;
            // Adjust radius for CircleType (it uses different units)
            const adjustedRadius = percentage < 0 ? -radius : radius;

            // Set radius on CircleType
            circleType.radius(adjustedRadius);
        }

        // Convert to image
        html2canvas(tempDiv).then(canvas => {
            const dataURL = canvas.toDataURL('image/png');

            // Create fabric image from the data URL
            fabric.Image.fromURL(dataURL, img => {
                // Apply options
                img.set({
                    left: this.options.left || 0,
                    top: this.options.top || 0,
                    scaleX: this.options.scaleX || 1,
                    scaleY: this.options.scaleY || 1,
                    originX: 'center',
                    originY: 'center'
                });

                // Add our properties to the fabric object
                img.curvedTextInstance = this;
                img.type = 'curved-text';
                img.text = this.text;

                // Replace the placeholder
                if (this.fabricObject && this.fabricObject.canvas) {
                    const canvas = this.fabricObject.canvas;
                    const index = canvas.getObjects().indexOf(this.fabricObject);
                    canvas.remove(this.fabricObject);
                    canvas.add(img);
                    if (index >= 0) {
                        canvas.moveTo(img, index);
                    }
                    canvas.renderAll();
                }

                this.fabricObject = img;
            });
        });

        // Clean up
        document.body.removeChild(tempDiv);

        // Return a placeholder object while we wait for the real one
        return new fabric.Rect({
            width: 100,
            height: 100,
            fill: 'transparent',
            stroke: 'transparent',
            left: this.options.left || 0,
            top: this.options.top || 0,
            originX: 'center',
            originY: 'center'
        });
    }

    addToCanvas(canvas) {
        canvas.add(this.fabricObject);
        return this.fabricObject;
    }
}

// Export the class and helper function
export { CurvedText, getRangeFromPercentage };