import $ from "jquery";
import { FabricImage, loadSVGFromURL, Textbox, version, Group } from 'fabric';
console.log("Fabric js Version : ", version)
import * as fabric from 'fabric';
import '../Functions/prototype.fn.js';
import { } from '../Functions/functions.js';
import { } from '../Functions/el-functions.js';

import { canvas, plugins } from './app.js';
import './prototype.js';

// Plugins
import './plugins/aspect-ratio.js';
import './plugins/active-obj.js';
import './plugins/context-menu.js';
import './plugins/filters.js';
import './plugins/export.js';
import './plugins/curve-text.js';
import './plugins/test.js';
import { selectionRectRemove } from './plugins/crop.js';
import { RotationState } from './plugins/rotation-angle.js';
import { alignmentObject } from './plugins/alignment.js';
import { hideAllPositioningLines } from './plugins/canvas-guides.js';

import { createNewId, getObjById } from './functions.js'; // Editor Functions
import { QUICK_OPTIONS } from './quick-options.js'; // Quick Options Bar

// Panels
import "./panels/uploads.js";
import "./panels/text.js";
import "./panels/drawing.js";
import "./panels/settings.js";
import { addLayer } from "./panels/layers.js";
import "./panels/index.js";


// #region Add Item To Editor
async function AddItemToEditor(item, properties = {}, options = {}) {
    let shape = 0,
        { src, type, fileType } = item,
        id = createNewId();
    if (!fileType)
        fileType = type;
    // Item class
    if (!item.class) {
        let itemClasses = {
            'svg': 'shape'
        },
            itemClass = fileType in itemClasses ? itemClasses[fileType] : fileType;
        item.class = itemClass;
    }

    properties.id = id;
    properties.name = item.type;
    item.id = id;
    item.fileType = fileType;
    properties.options = options;
    properties.originalItem = item;
    properties.centeredScaling = true; // Center Scaling
    // Load SVG
    if (fileType == "svg") {
        properties = {
            ...properties,
        };

        let { objects, options } = await loadSVGFromURL(src);

        let obj = new Group(objects, options);
        if (item.type === "mask") {
            // add mask on active object
            let activeObj = canvas.getActiveObject();
            if (!activeObj) return false;
            let svgObj = obj,
                { width, height } = activeObj;
            svgObj.set({
                left: -(width / 2),
                top: -(height / 2),
            })
            let scale = width / svgObj.width;
            svgObj.scaleX = scale;
            scale = height / svgObj.height;
            svgObj.scaleY = scale;
            svgObj.fill = 'transparent'

            activeObj.dirty = true;
            console.log(svgObj);
            activeObj.clipPath = svgObj;
            canvas.renderAll();
            return true;
        }

        // // add svg icon
        // obj.set(properties).setCoords();
        // if (!options.beforeRender) obj.scaleToWidth(200);

        // // Add item to Editor
        // canvas.add(obj);
        // addItemToEditorCallback(id);

    } else if (fileType == "text") {
        properties = {
            fontFamily: 'sans-serif',
            fill: '#262626',
            erasable: false,
            editable: true,
            textAlign: 'center',
            width: 400,
            ...properties,
        };
        shape = new Textbox(src, properties);
        canvas.add(shape);
        addItemToEditorCallback(id);
    } else if (fileType == "image") {

        let img = await FabricImage.fromURL(src);
        img.set(properties);
        // Add item to Editor
        canvas.add(img);
        addItemToEditorCallback(id);
    }
}

// add layers, etc of editor object
function addItemToEditorCallback(objId) {
    let obj = getObjById(objId);
    if (!obj) return false;
    let options = obj.options || {},
        centerObject = "centerObject" in options ? options.centerObject : true,
        selected = "selected" in options ? options.selected : true;
    // Before Render Callback
    if (options.beforeRender)
        options.beforeRender(obj);

    // center object
    if (centerObject) {
        alignmentObject('centerH', obj);
        alignmentObject('centerV', obj);
    }
    // Make obj active
    if (selected) obj.erasable = false;

    // Check if is background
    if (obj.name === 'background-image') {
        obj.moveTo(0)
        canvas.discardActiveObject();
    } else {
        canvas.setActiveObject(obj);
        addLayer(obj.id);
    }

    // Render canvas
    canvas.renderAll();
    canvas.requestRenderAll();
}

// Mouse Up Event 
canvas.on("mouse:up", function () {
    let obj = canvas.getActiveObject();
    if (plugins.RotationAngle) RotationState.isRotating = false; // Rotation Angle Plugin
    if (plugins.CanvasGuides) hideAllPositioningLines(); // Canvas Guides Plugin

    // Crop Plugin
    if (plugins.Crop) {
        if (!obj) {
            selectionRectRemove();
            $('.cn-apply-crop-btn').dnone(true);
            $('.cn-reset-crop-btn').dnone(true);
            $('.cn-start-crop-btn').dnone(false);
        }
    }

    if (!obj) {
        // Quick actions btn disable
        QUICK_OPTIONS.delete(false);
        QUICK_OPTIONS.alignment(false);
        QUICK_OPTIONS.crop(false);
    }
});


export {
    canvas,
    addItemToEditorCallback,
    AddItemToEditor
}