import $ from "jquery";
import { canvas, SVG_ICONS } from '../app.js';
import { getObjById, setActiveObject_ } from '../functions.js';

let layers = [],
    $layers = $('.single-panel#layers .layers-con'),
    layerCount = 0;

// Get Layer HTML
const getLayerHTML = (item, isSubLayer = false) => {
    if (!item) return '';

    let image = item.src,
        imageTag = '',
        subLayers = '',
        subLayerBtn = '',
        type = item.class;

    if (type == 'image' || type == "shape" && item.type !== 'drawing')
        imageTag = `<img src="${image}" alt="img" class="layer-img">`;
    else if (type == 'text')
        imageTag = `<i class="layer-icon">${SVG_ICONS.text}</i>`;
    else if (item.type == 'group') {
        imageTag = `<i class="layer-icon sub-layer-toggle cp">${SVG_ICONS.folder}</i>`;
        subLayers = '<div class="sub-layers">' + subLayersData(item.id) + '</div>';
    }

    else if (item.type == 'drawing')
        imageTag = `<i class="layer-icon">${SVG_ICONS.drawing}</i>`;
    if (!isSubLayer) layers.unshift(item.id);

    // Layer HTML
    let layer = `<div class="single-layer" data-id="${item.id}" data-type="${type}">
                    <div class="layer-content">
                        <div class="left-side">
                            ${imageTag}
                            <span class="title">Layer ${++layerCount}</span>
                        </div>
                        <div class="right-side">
                            <span class="action-btn" data-type="object-view" data-view="true"><span class="view">${SVG_ICONS["eye-open"]}</span><span class="hide">${SVG_ICONS["eye-close"]}</span></span>
                            <span class="action-btn" data-type="delete">${SVG_ICONS['trash-alt']}</span>
                        </div>
                    </div>

                    ${subLayers}
                </div>`;
    return layer;
}

// sub layers fn
function subLayersData(groupId) {
    let group = getObjById(groupId),
        subLayersHTML = '';
    if (!group) return subLayersHTML;
    group._objects.forEach(obj => {
        if (obj.originalItem) {
            // layer
            subLayersHTML += getLayerHTML(obj.originalItem, true)
        }
    });
    return subLayersHTML;
}

// Add Layer fn 
const addLayer = (objId) => {
    let obj = getObjById(objId);
    if (!obj) return false;
    if ($layers.find(`.single-layer[data-id="${obj.id}"]`).length) return false;
    let layerHTML = getLayerHTML(obj.originalItem);
    $layers.prepend(layerHTML);
};

// Label Layers according to the layers pattern
function labelLayers(new_layers_pattren = null) {
    if (new_layers_pattren === null) {
        new_layers_pattren = [];
        $layers.find(".single-layer").each(function () {
            new_layers_pattren.push($(this).attr('data-id'));
        });
    }


    let new_indexes = [];
    layers.forEach(function (l_id, i) {
        let old_index = i,
            new_index = new_layers_pattren.indexOf(l_id),
            move_index = old_index - new_index;
        if (move_index < 0) {
            new_indexes.push({
                layer_id: l_id,
                move_index: move_index
            });
        }
    });
    // Set New Layers to editor objects
    for (let i = new_indexes.length - 1; i >= 0; i--) {
        canvas.forEachObject((obj) => {
            if (obj.id == new_indexes[i].layer_id) {
                for (let j = new_indexes[i].move_index; j < 0; j++) {
                    canvas.sendObjectToBack(obj);
                }
            }
        });
    }
    canvas.requestRenderAll();
    layers = new_layers_pattren;
}

// Active layer object
function activeLayerObj(objId) {
    $layers.find(".single-layer").removeClass("active");
    $layers.find(`.single-layer[data-id="${objId}"]`).addClass("active");
    let obj = getObjById(objId);
    if (!obj) return false;
    setActiveObject_(obj);
}

// layer reload
function layerReload() {
    $layers.html('');
    // canvas objects
    layers = [];
    canvas.forEachObject(obj => {
        if (obj.originalItem) addLayer(obj.id);
    });
}

// Active Layer
$(document).on("click", ".single-layer", function () {
    $(this).toggleClass('active');
    let id = $(this).dataVal("id"),
        obj = getObjById(id);
    if (!obj) return false;
    setActiveObject_(obj);
});


// object hide and show
$(document).on('click', ".single-layer .action-btn[data-type='object-view'][data-view='true']", function (e) {
    e.stopPropagation();
    e.preventDefault();
    let $parent = $(this).parents(".single-layer"),
        targetId = $parent.attr('data-id');
    $(this).toggleClass("active");

    let opacityVal = $(this).hasClass("active") ? 0 : 1;
    canvas.forEachObject(obj => {
        if (targetId == obj.id)
            obj.set("opacity", opacityVal);

        canvas.requestRenderAll();
    });
});

// Delete Object
$(document).on('click', ".single-layer .action-btn[data-type='delete']", function (e) {
    e.stopPropagation();
    e.preventDefault();
    let $layer = $(this).parents(".single-layer").first(),
        id = $layer.dataVal("id"),
        obj = getObjById(id);

    if (obj._objects)
        obj._objects.forEach(obj => {
            canvas.remove(obj);
        });

    canvas.remove(obj);
    $layer.remove();
});

// Active Object on layer active
$layers.find('.single-layer').on('click', function () {
    let layerId = $(this).dataVal("id");
    activeLayerObj(layerId);
});

// sub layer shows 
$(document).on('click', ".single-layer .layer-content .sub-layer-toggle", function (e) {
    console.log('clicking');
    e.stopPropagation();
    let $parent = $(this).parents('.single-layer').first();
    $parent.find('.sub-layers').toggleClass("active");
});


export {
    labelLayers,
    addLayer,
    layerReload
}