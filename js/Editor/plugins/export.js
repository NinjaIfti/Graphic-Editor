import $ from 'jquery';
import { startDownloadCanvas, finishDownloadCanvas } from "./aspect-ratio.js";
import { canvas } from "../app.js";


// Export canvas
function exportCanvasFile(type, options = {}) {
    if (!type) return false;
    startDownloadCanvas();
    let downloadLink,
        downloadFile = ("downloadFile" in options) ? options.downloadFile : true;

    if (type == "svg") {
        let svgStr = canvas.toSVG(),
            svg64 = btoa(svgStr);
        b64Start = 'data:image/svg+xml;base64,';
        downloadLink = b64Start + svg64;
    } else if (type == "png") {
        downloadLink = canvas.toDataURL("image/png");
    } else {
        let bgColor = canvas.backgroundColor;
        if (!bgColor)
            canvas.backgroundColor = "#fff";
        downloadLink = canvas.toDataURL("image/jpeg");
        canvas.backgroundColor = bgColor;
    }
    if (downloadFile) {
        var anchor = document.createElement('a');
        anchor.href = downloadLink;
        anchor.target = '_blank';
        anchor.download = "image." + type;
        anchor.click();
    }

    finishDownloadCanvas();
    return downloadLink;
}
// Editor Image Download
$(document).on('click', ".download[data-target='download']", function (e) {
    e.preventDefault();
    let type = $(this).attr('data-type');
    // Download jpg, png, svg
    exportCanvasFile(type);
});
