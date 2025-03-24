import $ from 'jquery';
import { canvas } from '../app.js';
import { toBoolean } from "../../Functions/functions.js";
import { createObjectsGroup, unGroupObjects, activeObjPositionChange } from '../functions.js';
// Context Menu
let CtMenu = {
    currentId: 0
};

// Set id to context menu 
CtMenu.setId = (element) => {
    $(element).attr("data-ct-menu-id", CtMenu.currentId);
};

// Hide Context menu
CtMenu.hide = () => {
    $(".contextmenu-target").removeClass("selected");
    $(".context-menu").removeClass("active");
}

// Show Context menu
const showContextMenu = (e) => {
    let contextMenu = e.contextMenu,
        target = e.target,
        event = e.event;

    let contextMenuCoords = {
        "top": event.pageY + 10
    },
        windowWidth = window.innerWidth,
        windowHeight = window.innerHeight,
        left = event.pageX + 20,
        top = event.pageY + 10,
        contextMenuWidth = contextMenu.width(),
        contextMenuHeight = contextMenu.height();

    if ((left + contextMenuWidth) >= windowWidth) {
        contextMenuCoords.right = (windowWidth - left) + 10;
        contextMenuCoords.left = 'auto';
    } else {
        contextMenuCoords.left = event.pageX + 10;
        contextMenuCoords.right = 'auto';
    }
    if ((top + contextMenuHeight) > windowHeight) {
        contextMenuCoords.bottom = (windowHeight - top) + 10;
        contextMenuCoords.top = 'auto';
    } else {
        contextMenuCoords.top = top;
        contextMenuCoords.bottom = 'auto';
    }
    contextMenu.css(contextMenuCoords);
    contextMenu.addClass("active");
};

// Check Target 
function checkTarget(targets, target) {
    target = $(target);
    let valid = true;
    targets.forEach((className) => {
        if (target.hasClass(className) || target.parents("." + className).length > 0) valid = false;
    });
    return valid;
}

// Hide Context Menu
$(window).on("click", function (e) {
    let target = $(e.target);
    let unValidTargets = ["context-menu"],
        valid = true;

    valid = checkTarget(unValidTargets, target);
    if (valid)
        CtMenu.hide();
});

// Init Context Menu
$(".context-menu").each(function () {
    CtMenu.currentId++;

    if (!$(this).attr('data-target')) return false;

    let target = $(this).attr("data-target"),
        $context = $(this);

    CtMenu.setId($context);
    CtMenu.setId(target);

    $(document).on("contextmenu", target, function (e) {

        $(target).addClass("contextmenu-target");
        if (e.shiftKey) return;
        e.preventDefault();

        // Call before
        let callbefore = $context.dataVal("callbefore");
        if (callbefore) {
            // callbefore = fn._handle($context, e.originalEvent, 'callbefore');
            // if (!callbefore) return false;
        }

        $context.css({
            "top": e.pageY + 10,
            "left": e.pageX + 10,
        });

        if ($(this).hasClass(".selected")) {
            $(this).addClass("selected");

            showContextMenu({
                event: e,
                contextMenu: $context,
                target: $(this)
            });
        } else {

            $(target).removeClass('selected');
            $(this).addClass("selected");
            showContextMenu({
                event: e,
                contextMenu: $context,
                target: $(this)
            });
        }
    });
});

// contextmenu (canvas on right click)
$(document).on("contextmenu", '.canvas-container', function (e) {
    let obj = canvas.getActiveObject()
    // context menu option toggle hide & show
    if (!canvas._objects.length) CtMenu.hide();
    if (!obj) return false;

    let { type } = obj,
        $con = $('.context-menu'),
        $group = $con.find('.ct-menu-opt[data-target="group"]'),
        $lock = $con.find('.ct-menu-opt[data-target="object_lock"]')

    // Group 
    $group.dnone(!(type === 'activeSelection' || type === 'group'));
    $group.attr("data-group", type == 'group');

    // Lock/Unlock
    $lock.attr("data-locked", obj.lockMovementX == true);
});


//#region Event Listeners

// Group/Un Group
$(document).on('click', ".context-menu .ct-menu-opt[data-target='group']", function () {
    let $this = $(this),
        grouped = toBoolean($this.dataVal("group"))

    grouped = grouped == false ? true : false;
    let res = grouped ? createObjectsGroup() : unGroupObjects();

    if (!res) return false;
    $this.attr('data-group', grouped.toString());
});

// Canvas Obj Layer Pos 
$(document).on('click', ".context-menu .ct-menu-opt.obj-pos", function () {
    let type = $(this).data('target');
    activeObjPositionChange(type);
    CtMenu.hide();
});

// Lock/Unlock
$(document).on('click', ".context-menu .ct-menu-opt[data-target='object_lock']", function () {
    let locked = toBoolean($(this).dataVal("locked")),
        objects = canvas.getActiveObjects();
    if (!objects.length) return false;
    locked = locked == false ? true : false;

    objects.forEach(obj => {
        obj.set({
            lockMovementY: locked,
            lockMovementX: locked,
            lockScalingX: locked,
            lockScalingY: locked,
        });
    });

    $(this).attr("data-locked", locked.toString());

    canvas.renderAll();
    // Context menu hide
    CtMenu.hide();
});

//#endregion Event Listeners 

