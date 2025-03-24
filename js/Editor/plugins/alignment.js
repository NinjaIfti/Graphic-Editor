import { canvas } from "../app.js";
import { canvasDimensions } from "./aspect-ratio.js";
import $ from 'jquery';
// Group alignment
function groupAlignment(direction) {
    let activeGroup = canvas.getActiveObject();
    if (activeGroup.type === 'activeSelection') {
        // Group width and height
        let groupWidth = activeGroup.getBoundingRect(true).width,
            groupHeight = activeGroup.getBoundingRect(true).height;
        // Group inner objects
        activeGroupPosition = {
            left: activeGroup.left,
            top: activeGroup.top,
            groupWidth: activeGroup.getBoundingRect(true).width,
            groupHeight: activeGroup.getBoundingRect(true).height,
        };
        activeGroup._objects.forEach(function (obj, i) {
            // objects Width & height
            let objWidth = obj.getBoundingRect(true).width,
                objHeight = obj.getBoundingRect(true).height;
            // Center
            if (direction === 'top') {
                obj.set({
                    top: -groupHeight / 2,
                });
            } else if (direction === 'bottom') {
                obj.set({
                    top: groupHeight / 2 - objHeight
                });
            } else if (direction === 'centerV') {
                obj.centerV();
            } else if (direction === 'centerH') {
                obj.centerH();
            } else if (direction === 'left') {
                obj.set({
                    left: -groupWidth / 2
                });
            } else if (direction === 'right') {
                obj.set({
                    left: groupWidth / 2 - objWidth
                });
            } else if (direction === 'center') {
                obj.center();
            }

        });
        groupObjectsWidthUpdate(activeGroup);
        canvas.renderAll();
        if (direction === 'centerV' || direction === 'centerH' || direction === 'center') {
            activeGroup.set({
                left: activeGroupPosition.left,
                top: activeGroupPosition.top,
            });
            canvas.renderAll();
        }
    }
}

// Group Objects Width Update
function groupObjectsWidthUpdate(group) {
    group.forEachObject(function (item) {
        // group.removeWithUpdate(item).addWithUpdate(item);
    });
    group.setCoords();
    canvas.renderAll();
}

$(document).ready(function () {
    // object Scaling
    canvas.on({
        'object:modified': objectScaling
    });
});

// Object Scaling
function objectScaling(options) {
    if (options.target.isType('group'))
        groupObjectsWidthUpdate(options.target);
}

// Set Object Alignment
function alignmentObject(val, activeObj) {
    let canvasWidth = canvasDimensions.resizedWidth,
        canvasHeight = canvasDimensions.resizedHeight;
    activeObj.set({ objectCaching: false });
    switch (val) {
        case 'left':
            activeObj.set({
                left: 0,
            });
            break;
        case 'right':
            activeObj.set({
                left: canvasWidth - activeObj.getScaledWidth(),
            });
            break;
        case 'top':
            activeObj.set({
                top: 0,
            });
            break;
        case 'bottom':
            activeObj.set({
                top: canvasHeight - activeObj.getScaledHeight(),
            });
            break;
        case 'centerH':
            activeObj.set({
                left: (canvasWidth / 2) - (activeObj.getScaledWidth() / 2),
            });
            break;
        case 'centerV':
            activeObj.set({
                top: (canvasHeight / 2) - (activeObj.getScaledHeight() / 2),
            });
            break;
    }
}

export {
    alignmentObject,
    groupAlignment
}