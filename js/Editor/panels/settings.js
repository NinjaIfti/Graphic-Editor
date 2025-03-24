import $ from 'jquery';
import { AddItemToEditor } from '../Editor.js';
import { canvas } from "../app.js";
import { resizeCanvas } from '../plugins/aspect-ratio.js';
let $settings = $('.single-panel#settings');

// Background Image Change (Editor) 
function backgroundImageChange(imageSrc) {
    // Remove existing image
    let obj = canvas._objects.find(obj => obj.name == 'background-image');
    canvas.backgroundColor = "";
    if (obj) {
        canvas.remove(obj);
        canvas.renderAll();
    }

    // Add Image
    let img = new Image();
    img.src = imageSrc;
    img.onload = function () {
        AddItemToEditor({
            type: 'background-image',
            src: imageSrc,
            fileType: 'image'
        }, {
            left: 0,
            top: 0,
            erasable: false,
            name: 'background-image',
            lockMovementX: true,
            lockMovementY: true,
            selectable: false,

        }, {
            selected: false,
            centerObject: false
        });
        // Canvas Resize
        resizeCanvas({
            width: img.width,
            height: img.height
        });

    }
}

// Canvas BG Color
$settings.find('.cn-bg-color').on("input", function () {
    // Remove existing image
    let obj = canvas._objects.find(obj => obj.name == 'background-image');
    if (obj) {
        canvas.remove(obj);
        canvas.renderAll();
    }

    let color = $(this).val();
    canvas.backgroundColor = color;
    canvas.renderAll();
});

// Add Background to canvas
$settings.find('.media-component[data-type="backgrounds"] .items .item').on("click", async function () {
    let name = $(this).dataVal("name");
    backgroundImageChange("images/uploads/" + name)
});


//#region Canvas Resize
// Canvas Resize
$settings.find('.canvas-size-inp').on("change", function () {
    let size = $(this).attr('value'),
        isCustom = size == 'custom';
    size = size.split('x').map(s => parseInt(s));
    if (isCustom) {
        $('.custom-canvas-size').dnone(false);
        return false;
    }
    else
        $('.custom-canvas-size').dnone(true);
    resizeCanvas({
        width: size[0],
        height: size[1]
    });
});

// Custom Canvas Resize
$settings.find('.apply-custom-cn-size').on("click", function () {
    let width = $settings.find('.custom-canvas-size .canvas-tool.width input').val(),
        height = $settings.find('.custom-canvas-size .canvas-tool.height input').val();
    width = parseInt(width);
    height = parseInt(height);

    console.log(width, height)
    resizeCanvas({ width, height });

});
//#endregion Canvas Resize 

