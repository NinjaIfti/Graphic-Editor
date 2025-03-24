import './Editor/Editor.js';
import './Editor/color-picker.js';
import jQuery from "jquery";
window.$ = window.jQuery = jQuery;
import { labelLayers } from "./Editor/panels/layers.js";

let script = document.createElement("script");
script.src = "./js/Libraries/jquery-ui.min.js";
document.body.appendChild(script);

script.onload = () => {
    let $layers = $('.single-panel#layers .layers-con');

    // Make Layers Sortable
    $layers.sortable({
        axis: "y",
        start: function (e, ui) {
            ui.item.addClass("focused");
        },
        stop: function (e, ui) {
            ui.item.removeClass("focused");
            labelLayers();
        }
    });
};

