import $ from 'jquery';
import { AddItemToEditor } from '../Editor.js';
import { stopDrawingMode } from './drawing.js';
import { QUICK_OPTIONS } from "../quick-options.js";
import { getExtension } from '../../Functions/functions.js';
// Tool Item 
$(document).on("click", ".editor-sidebar .tool-item", function () {
    let type = $(this).dataVal("type"),
        $parent = $('.editor-sidebar-panels'),
        $panel = $parent.find(`.single-panel#${type}`);
    $parent.find(".single-panel").not($panel).removeClass('active')

    $('.editor-sidebar .tool-item').not($(this)).removeClass("active");
    $(this).toggleClass("active");
    $panel.toggleClass('active');

    // Drawing Event Listener
    if (type == 'drawing')
        $panel.find('.tab-btn[data-panel="brush"]').trigger("click"); // Active Brush Panel
    else stopDrawingMode();
});


// Active Props Panel
function activeObjPropsPanel(type) {
    if (type == 'curved-text') type = 'text';

    let $text = $(`.cn-obj-editing-tools[data-type='text']`),
        $image = $(`.cn-obj-editing-tools[data-type='image']`),
        $shape = $(`.cn-obj-editing-tools[data-type='shape']`),
        $panel = $(`.editor-sidebar .tool-item[data-type="${type}"]:not(.active)`);

    $text.removeClass('active');
    $image.removeClass('active');
    $shape.removeClass('active');

    if (type == 'text')
        $text.addClass('active');
    else if (type == 'image' || type == 'shape') {
        $panel = $(`.editor-sidebar .tool-item[data-type="uploads"]:not(.active)`);

        if (type == 'image') {
            $image.addClass("active");
            QUICK_OPTIONS.crop(true);
        }
        else {
            $shape.addClass('active');
            QUICK_OPTIONS.crop(false);
        }
    }

    QUICK_OPTIONS.delete(true);
    QUICK_OPTIONS.alignment(true);
    $panel.trigger("click");
}

// Add Item to canvas
$('.single-panel.category-panel .media-component').find('.items .item').on("click", function () {
    let url = $(this).dataVal("url"),
        name = $(this).dataVal("name"),
        category = $(this).dataVal("category"),
        ext = getExtension(name),
        fileType = ext === "svg" ? "svg" : "image",
        type = category === 'mask' ? 'mask' : "image";
    
    // add svg shape
    let item = {
        fileType: fileType,
        src: url,
        type
    };
    AddItemToEditor(item);  // Add Item To Editor
});

export { activeObjPropsPanel };