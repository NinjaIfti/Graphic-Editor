import $ from 'jquery';
import { SVG_ICONS } from '../app.js';
import { isImageFile, getExtension, getRand, getBase64 } from '../../Functions/functions.js';
import { AddItemToEditor } from "../Editor.js";

let $uploads = $('.single-panel#uploads');
/*  */

// Upload File 
$uploads.find('#upload-file-inp').on("change", async function () {
    let files = this.files;
    if (!files.length) return false;
    files = Array.from(files);

    for (let i = 0; i < files.length; i++) {
        await addFileToEditor(files[i]);
    }
    $(this).val("");


    // Delete File 
    $uploads.find('#file-upload-con .item .delete-btn').on("click", async function () {
        let $item = $(this).parents(".item").first(),
            id = $item.dataVal("id");
        $item.remove(); // Remove Item
    });

    // Add Image to canvas
    $uploads.find('#file-upload-con .item').on("click", async function () {
        let fileType = $(this).dataVal('file-type'),
            src = $(this).find("img").attr("src");

        await AddItemToEditor({
            type: 'image',
            fileType,
            src
        }, {
            radius: 0
        });
    });

});

// Add file to editor
function addFileToEditor(file) {
    return new Promise(async (res, rej) => {
        if (!isImageFile(file)) return true;

        let $conn = $uploads.find('#file-upload-con'),
            filename = file.name,
            ext = getExtension(filename),
            fileId = getRand(30),
            src = await getBase64(file),
            fileType = ext == 'svg' ? 'svg' : 'image',
            item =
                `<div class="item" data-file-type="${fileType}" data-id="${fileId}">
                    <img src="${src}" alt="">
                    <button class="no-btn-styles delete-btn">${SVG_ICONS['trash-alt']}</button>
                </div>`;

        $conn.prepend(item);
        res(true);
    });
}

