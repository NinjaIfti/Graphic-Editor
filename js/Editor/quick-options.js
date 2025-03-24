import $ from 'jquery';
import { canvas } from "./app.js";
import { alignmentObject } from './plugins/alignment.js';

const $con = $('.quick-options-bar'),
    QUICK_OPTIONS = {
        $delete: $con.find('.single-tool[data-type="delete"]'),
        $alignment: $con.find(".alignment-btns"),
        $crop: $con.find(".single-tool.crop-btn"),
        // Delete
        delete: function (toggle) {
            if (toggle) this.$delete.removeAttr('disabled');
            else this.$delete.attr('disabled', true);
        },
        // Alignment
        alignment: function (toggle) {
            if (toggle) this.$alignment.removeAttr('disabled');
            else this.$alignment.attr('disabled', true);
        },
        // Crop
        crop: function (toggle) {
            if (toggle) this.$crop.removeAttr('disabled');
            else this.$crop.attr('disabled', true);
        }
    }

// Delete Object (Quick options bar)
$(document).on("click", ".quick-options-bar .single-tool[data-type='delete']", function () {
    let obj = canvas.getActiveObject(),
        id = obj.id,
        $layer = $(`.layers-con .single-layer[data-id="${id}"]`);
    $layer.find('.action-btn[data-type="delete"]').trigger("click");
});

// Alignment in Canvas (Quick options bar)
$(document).on("click", ".quick-options-bar .alignment-btns .single-tool", function () {
    let obj = canvas.getActiveObject(),
        type = $(this).dataVal('type');
    if (!obj) return false;
    alignmentObject(type, obj);
    obj.setCoords();
    canvas.setActiveObject(obj);
    canvas.renderAll();
});

export {
    QUICK_OPTIONS
}