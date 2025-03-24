import $ from 'jquery';
import { canvas } from '../app.js';
import { AddItemToEditor } from '../Editor.js';

let $textPanel = $(".single-panel#text"),
    headings = {
        full: {
            fontSize: 50,
            fontWeight: 'bold',
        },
        sub: {
            fontSize: 35,
            fontWeight: 'bold',
        },
        paragraph: {
            fontSize: 20,
            fontWeight: 'normal',
        }
    }


// Add Text Btn
$textPanel.find('.add-text-btn').on("click", function () {
    canvas.discardActiveObject();

    let $shadow = $('.folding-card[data-name="shadow"] .card-header.active');
    if ($shadow.length) {
        $shadow.click();
        $shadow.find(".prop-toggle-checkbox").prop("checked", false);
    }

    // Add Text
    AddItemToEditor({
        type: 'text',
        src: 'Lorem ipsum ....'
    }, {
        strokeWidth: 0
    });
});

// Headings
$(document).on("click", ".pre-built-headings .single-heading", function () {
    let type = $(this).dataVal("type"),
        props = headings[type];
    props.strokeWidth = 0;
    // Add Heading
    AddItemToEditor({
        src: 'Lorem ipsum ....',
        type: "text",
    }, props);
});

