import $ from 'jquery';
import { canvas } from '../app.js';
import { Rect } from 'fabric';
import { isJson } from '../../Functions/functions.js';
import { getRangeFromPercentage } from "./curve-text.js";
import { activeObjPropsPanel } from "../panels/index.js";
let $propsPanel = $('.single-panel');

// Fill active object props inputs
function fillActiveObjPropsInputs($targets = $(".cn-obj-props-changer")) {

    $propsPanel = $('.single-panel');

    let obj = canvas.getActiveObject();
    if (!obj) return false;
    if (!obj.originalItem) return false;
    if (obj.originalItem.type === "group") return false;

    if (obj.originalItem.class == 'text') $propsPanel = $('.single-panel#text');
    else $propsPanel = $('.single-panel#uploads');


    $targets.each(function () {
        let prop = $(this).dataVal("prop"),
            inputType = $(this).attr("type"),
            val = $(this).val(),
            isBoolean = $(this).dataVal("value-type") === "boolean",
            propVal = obj[prop],
            objType = obj.originalItem.class,
            isToggleType = ["checkbox", "radio"].includes(inputType);

        if (isBoolean) if (isJson(val)) val = JSON.parse(val);

        // Validate value
        if (inputType == "number" || inputType == "range")
            if (typeof propVal !== "object") propVal = parseFloat(propVal);

        if (prop === 'charSpacing' && obj.type == 'curved-text') propVal = obj.kerning;
        if (prop === 'stroke' && obj.type == 'curved-text') propVal = obj.strokeStyle;

        // Shadow
        if (prop === "shadow" && propVal) {
            // Shadow
            let $shadowCon = $propsPanel.find(".cn-obj-props-shadow")
            $shadowCon.find(`.cn-obj-props-changer[name="color"]`).val(propVal.color);
            $shadowCon.find(`.cn-obj-props-changer[name="blur"]`).val(propVal.blur);
            $shadowCon.find(`.cn-obj-props-changer[name="offsetX"]`).val(propVal.offsetX);
            $shadowCon.find(`.cn-obj-props-changer[name="offsetY"]`).val(propVal.offsetY);
        } else if (prop === 'fontFamily' && objType == 'text') {
            let $dropdown = $('.canvas-tool.font-family .editor-dropdown');
            $dropdown.attr("value", obj.fontFamily);
            $dropdown.find(".dropdown-toggle-item .item-html").text(obj.fontFamily);
            $dropdown.find('.item').removeClass("selected");
            $dropdown.find(`.item[value="${obj.fontFamily}"]`).addClass("selected");
        } else if (isToggleType) {
            $(this).prop("checked", propVal === val);
            if ($(this).hasClass("prop-toggle-checkbox")) {
                $(this).trigger("canvasObjChanged");
            }
        } else {
            let fill = $(this).dataVal('fill-val');
            if (fill)
                $(fill).val(propVal);

            $(this).val(propVal);
        }
    });
}

// object properties change event
function objPropsInputsHandler() {

    $(".cn-obj-props-changer:not([data-launch-prop])").each(function () {
        $(this).attr("data-launch-prop", "true");

        let tagName = $(this).tagName(),
            inputType = $(this).attr('type'),
            isToggleType = ["checkbox", "radio"].includes(inputType),
            event = tagName == 'input' ? 'input' : 'click',
            dataUncheckValue = $(this).dataVal("uncheck");

        if (isToggleType || inputType == "file" || tagName === "select") event = "change";

        // Apply listener
        $(this).on(event, function () {
            $propsPanel = $('.single-panel');

            let val = $(this).val(),
                obj = canvas.getActiveObject(),
                type = obj?.type,
                isChecked = isToggleType ? $(this).is(":checked") : null,
                prop = $(this).dataVal('prop'),
                fillVal = $(this).dataVal("fill-val"),
                propValue = $(this).dataVal("prop-value");
            if (propValue) val = propValue;
            if (!prop) return false;


            if (obj.originalItem.class == 'text') $propsPanel = $('.single-panel#text');
            else $propsPanel = $('.single-panel#uploads');



            // Check if value is boolean
            if ($(this).dataVal("value-type") === "boolean") {
                if (isJson(val)) val = JSON.parse(val);
                if (isToggleType) val = isChecked;
            }

            // Set Un Check value
            if (isToggleType) {
                if (!isChecked && dataUncheckValue)
                    val = dataUncheckValue;
            }

            // Fill Val
            if (fillVal) $(fillVal).not(this).val(val);

            // Validate value for (Number,Range)
            if (inputType == "number" || inputType == "range") {
                val = parseFloat(val);
                if (isNaN(val)) return false;
            }


            // Shadow
            if (prop == 'shadow' && obj.shadowCheck) {
                let $shadowCon = $propsPanel.find(".cn-obj-props-shadow"),
                    shadow = {
                        color: $shadowCon.find(`.cn-obj-props-changer[name="color"]`).val(),
                        blur: parseInt($shadowCon.find(`.cn-obj-props-changer[name="blur"]`).val()),
                        offsetX: parseInt($shadowCon.find(`.cn-obj-props-changer[name="offsetX"]`).val()),
                        offsetY: parseInt($shadowCon.find(`.cn-obj-props-changer[name="offsetY"]`).val()),
                    };

                val = shadow;
            }


            // Object Radius
            if (prop === 'clipPath') {
                let radius = Math.abs(val);

                if (obj.originalItem.class === 'shape') {
                    let objWidth = obj.width + obj.height,
                        radiusPer = (radius * objWidth) / 100;
                    obj.set({
                        rx: radiusPer / obj.scaleX,
                        ry: radiusPer / obj.scaleY,
                    });
                    canvas.renderAll();
                    console.log("running");
                    return false;
                }
                val = (target) => {
                    let objWidth = target.width + target.height,
                        radiusPer = (radius * objWidth) / 100;

                    let svg = new Rect({
                        width: target.width,
                        height: target.height,
                        rx: radiusPer / target.scaleX,
                        ry: radiusPer / target.scaleY,
                        left: -target.width / 2,
                        top: -target.height / 2,
                        objectCaching: false,
                        dirty: true
                    });
                    return svg;
                }
            }

            if (type == 'curved-text' && prop === 'charSpacing') prop = 'kerning';

            if (type == 'curved-text' && prop === 'stroke') prop = 'strokeStyle';



            // Property toggler checkbox
            if ($(this).hasClass("prop-toggle-checkbox") && obj) {

                let targetProp = $(this).data("target-prop"),
                    isChecked = $(this).is(":checked") ? true : false,
                    oldPropsKey = `${prop}Old`,
                    oldProps = obj[oldPropsKey] || {};

                val = isChecked;
                obj.set(prop, val);
                canvas.requestRenderAll();

                // Shadow
                if (targetProp === "shadow") {
                    if (!isChecked) {
                        oldProps.shadow = {
                            color: '#0000',
                            blur: 0,
                            offsetX: 0,
                            offsetY: 0,
                        }
                    }

                    let currentValues = {};
                    for (let key in oldProps.shadow) {
                        let keyValue = oldProps.shadow[key],
                            $input = $propsPanel.find(`[data-prop="shadow"][name="${key}"]`);
                        currentValues[key] = $input.val();
                        $input.val(keyValue);
                    }

                    $propsPanel.find(`[data-prop="shadow"][name="blur"]`).trigger("input");
                    if (!isChecked) oldProps[prop] = currentValues;

                    return true;
                }

                if (!isChecked) obj[oldPropsKey] = oldProps;

                $(this).val(val.toString());
                return true;
            }

            // Rotate
            if (prop === "angle") {
                val = target => {
                    target.rotate(originalValue);
                    return undefined;
                }
            }

            //#region BringForward &  SendBackwards
            if (prop === "bringForward") {
                val = target => {
                    canvas.bringForward(target);
                    return undefined;
                }
            }

            if (prop === "sendBackwards") {
                val = target => {
                    canvas.sendBackwards(target);
                    return undefined;
                }
            }

            //#endregion BringForward &  SendBackwards

            // Set Active Obj Prop
            activeObjPropSet({
                [prop]: val
            });
        });
    });
}

objPropsInputsHandler();

// Set Active Object Properties
const activeObjPropSet = (properties = {}, targetType = null) => {
    let activeObj = canvas.getActiveObject();

    if (!activeObj) return false;

    if (targetType) {
        if (activeObj.type != targetType)
            return false;
    }

    // Is Check Multiple Objects
    let objects = (activeObj._objects) ? activeObj._objects : [activeObj];
    // objects = [activeObj];
    Array.from(objects).forEach(obj => {
        for (let key in properties) {
            let value = properties[key];
            if (typeof value == 'function')
                properties[key] = value(obj);

            if (properties[key] === undefined)
                delete properties[key];
        }

        obj.set(properties);
        if (obj.type == 'curved-text') {
            obj.refreshCtx(true);
            obj._updateObj('scaleX', obj.scaleX);
            obj._updateObj('scaleY', obj.scaleY);
        }
    });
    canvas.renderAll();
}

// Object events
function initObjectEvents() {
    let events = ['moving', 'scaling', 'rotating', 'skewing', 'resizing'];
    events.forEach(event => {
        canvas.on(`object:${event}`, function (e) {
            let obj = e.target;

            //#region Curved Text Setting


            if (obj.type == 'curved-text' && event !== 'moving') {

                $('#text-curve-range').val(getRangeFromPercentage(obj.percentage))
                $('#curve-text').val(obj.rotateAngle ? obj.rotateAngle : 0);

                obj.refreshCtx(true);
                obj._updateObj('scaleX', obj.scaleX);
                obj._updateObj('scaleY', obj.scaleY);
            }
            //#endregion Curved Text Setting 

            fillActiveObjPropsInputs();
        });
    });
}
initObjectEvents();

// Created and updated obj prop
const createdAndUpdatedProp = (e) => {
    let obj = canvas.getActiveObject();
    if (!obj) return false;
    activeObjPropsPanel(obj.originalItem?.class);   // Active Obj props panel
    fillActiveObjPropsInputs();

    // TODO: Layer Active
}

// Objects Selection Created
canvas.on("selection:created", function (e) {
    createdAndUpdatedProp(e);
});

// Objects Selection Updated
canvas.on("selection:updated", function (e) {
    createdAndUpdatedProp(e);
});

// selection updated
canvas.on("selection:cleared", function () {
    createdAndUpdatedProp();
});

$(".prop-toggle-checkbox").on("canvasObjChanged", function () {
    let isChecked = $(this).is(":checked"),
        $parent = $(this).parents(".folding-card"),
        $header = $parent.find(".card-header"),
        $body = $parent.find(".card-body");
    if (isChecked) {
        $header.addClass("active");
        $body.slideDown(0);
    } else {
        $header.removeClass("active");
        $body.slideUp(0);
    }
});