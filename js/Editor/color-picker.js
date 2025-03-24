import $ from 'jquery';
import { getRand } from "../Functions/functions.js"
// Color Picker
function ColorPicker() {
    // Color Picker (library)
    $(".color-picker:not([data-launched])").each(function () {
        $(this).attr("data-launched", "true");

        let id = getRand(20),
            selector = `.color-picker[data-clr-id="${id}"]`,
            defaultColor = $(this).val() || "#000";
        $(this).attr("data-clr-id", id);

        Coloris({
            el: selector,
            swatches: [
                '#264653',
                '#2a9d8f',
                '#e9c46a',
                '#f4a261',
                '#e76f51',
                '#d62828',
                '#023e8a',
                '#0077b6',
                '#0096c7',
                '#00b4d8',
            ]
        });

        Coloris.setInstance(selector, {
            theme: 'pill',
            themeMode: 'light',
            formatToggle: true,
            defaultColor
        });


        // Change cursor on close
        $(this).on("close", function () {
            $(".color-picker.active").removeClass("active");
            // if (_canvas_cursor_ === "colorpicker")
            // changeCanvasCursor('default');
        });

        // Active color picker
        $(this).on("open", function () {
            $(".color-picker.active").removeClass("active");
            $(this).addClass("active");
        });
    });
}


(async () => {
    let script = document.createElement("script");
    script.src = "./js/Libraries/coloris.min.js";
    document.body.appendChild(script);

    script.onload = () => {
        ColorPicker();

    };
})();