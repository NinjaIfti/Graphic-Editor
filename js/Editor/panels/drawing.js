import $ from 'jquery';
import * as fabric from 'fabric';
import { PencilBrush, PatternBrush, Shadow, Rect, Group } from "fabric";
import { EraserBrush } from '@erase2d/fabric';
import { rgbaColorGenerator, changeCurserEvent, createNewId } from '../functions.js';
import { addItemToEditorCallback } from "../Editor.js";
import { canvas } from '../app.js';

//#region Drawing Functions
const drawingPropObject = {},
    $panel = $(".single-panel#drawing"),

    $brush = $panel.find('.tab-panels .tab-panel#brush'),
    $eraser = $panel.find('.tab-panels .tab-panel#eraser'),
    $pencil = $panel.find('.tab-panels .tab-panel#pencil');


// Drawing Brush Curser
const getBrushCurser = () => {
    let color = $brush.find(".drawing-input[name='color']").val(),
        opacity = $brush.find(".drawing-input[name='opacity']").val(),
        size = $brush.find(".drawing-input[name='size']").val();

    const circle = `
		<svg
			height="${size}"
			fill="${rgbaColorGenerator(color, opacity)}"
			viewBox="0 0 ${size * 2} ${size * 2}"
			width="${size}"
			xmlns="http://www.w3.org/2000/svg"
		>
			<circle
				cx="50%"
				cy="50%"
				r="${size}" 
			/>
		</svg>
	`;

    return `data:image/svg+xml;base64,${window.btoa(circle)}`;
};


// Eraser Bursh Curser
const getEraserCursor = () => {
    let size = $eraser.find(".drawing-input[name='size']").val();

    const circle = `
        <svg
            height="${size}"
            fill="#2f3e50"
            viewBox="0 0 ${size * 2} ${size * 2}"
            width="${size}"
            xmlns="http://www.w3.org/2000/svg"
        >
            <circle
                cx="50%"
                cy="50%"
                r="${size}" 
            />
        </svg>
`;

    return `data:image/svg+xml;base64,${window.btoa(circle)}`;
};


// Drawing Mode 
function startDrawingMode(prop = {}) {
    let { width, color } = prop;

    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = color;
    canvas.freeDrawingCursor = `url(${getBrushCurser()}) ${width / 2} ${width / 2}, crosshair`;
    canvas.freeDrawingBrush.width = width || 1;
    canvas.isDrawingMode = true;
    canvas.renderAll();
}
// Listen for new paths and set them as erasable
canvas.on('path:created', function (e) {
    e.path.set({ erasable: true });
});
// Eraser Mode fn
const startEraserMode = (inverted = false, width = 20) => {
    let eraser = new EraserBrush(canvas);

    eraser.on('end', async (e) => {
        e.preventDefault();
        const { path, targets } = e.detail;
        await eraser.commit({ path, targets });
        canvas.renderAll();
    });

    eraser.width = width || 1;
    eraser.active = true;
    eraser.fill = "#ddd";
    canvas.freeDrawingBrush = eraser;
    canvas.freeDrawingCursor = `url(${getEraserCursor()}) ${width / 2} ${width / 2}, crosshair`;
    canvas.isDrawingMode = true;
    canvas.renderAll();
}

//#region Bind Small Inputs with range sliders

// On Slider Input
$panel.find("input[type='range'].drawing-input").on("input", function (e) {
    let val = $(this).val(),
        $parent = $(this).parents(".canvas-tool"),
        $smallInp = $parent.find('.editor-small-inp');
    $smallInp.val(val);
});

// On Editor Small Input
$panel.find("input.editor-small-inp").on("change", function (e) {
    let val = $(this).val(),
        $parent = $(this).parents(".canvas-tool"),
        min = $(this).attr("min"),
        max = $(this).attr("max"),
        $rangeInp = $parent.find('input[type="range"].drawing-input');


    if (val < min) val = min;
    if (val > max) val = max;

    $(this).val(val);
    $rangeInp.val(val);
    $rangeInp.trigger("change");
});

//#endregion Bind Small Inputs with range sliders 

//#region Tabs Activation

// Brush
$panel.find('.tab-items .tab-btn[data-panel="brush"]').on('click', function () {
    canvas.isDrawingMode = true;
    let brush = canvas.freeDrawingBrush,
        size = $brush.find('.drawing-input[name="size"]').val(),
        color = $brush.find('.drawing-input[name="color"]').val(),
        opacity = $brush.find('.drawing-input[name="opacity"]').val();

    color = rgbaColorGenerator(color, opacity);

    startDrawingMode({
        width: size,
        color,
    });

    $brush.find('.drawing-input[name="color"]').trigger('change');

    canvas.renderAll();
});

// Eraser
$panel.find('.tab-items .tab-btn[data-panel="eraser"]').on('click', function () {
    // drawingModeFalse();
    let size = $eraser.find('.drawing-input[name="size"]').val();
    startEraserMode(false, parseInt(size));
});

// Pencil
$panel.find('.tab-items .tab-btn[data-panel="pencil"]').on('click', function () {
    canvas.isDrawingMode = true;
    canvas.freeDrawingCursor = 'crosshair';

    $pencil.find(".drawing-input[name='brush_type'] .item.selected").trigger("click");
    canvas.renderAll();
});

//#endregion Tabs Activation 

//#region Brush

// Size
$brush.find(".drawing-input[name='size']").on('change input', function () {
    let size = $(this).val(),
        color = $brush.find('.drawing-input[name="color"]').val(),
        opacity = $brush.find('.drawing-input[name="opacity"]').val();

    color = rgbaColorGenerator(color, opacity);
    startDrawingMode({ width: parseInt(size), color }); // Start Drawing Mode

    $brush.find(".brush-view .background-image .draw-circle").css({
        width: size + 'px',
        height: size + 'px',
        'background-color': color,
    });
});

// Opacity
$brush.find(".drawing-input[name='opacity']").on('change input', function () {
    let opacity = $(this).val(),
        size = $brush.find('.drawing-input[name="size"]').val(),
        color = $brush.find('.drawing-input[name="color"]').val();

    color = rgbaColorGenerator(color, opacity);
    startDrawingMode({ width: parseInt(size), color }); // Start Drawing Mode
});

// Color
$brush.find(".drawing-input[name='color']").on('change input', function () {
    let color = $(this).val(),
        opacity = $brush.find('.drawing-input[name="opacity"]').val(),
        size = $brush.find('.drawing-input[name="size"]').val();

    color = rgbaColorGenerator(color, opacity);

    // draw mode
    startDrawingMode({
        width: parseInt(size),
        color: color,
    });

    $brush.find(".brush-view .background-image .draw-circle").css({
        'background-color': color,
    });
});

//#endregion Brush 

//#region Eraser

// Invert Eraser
$eraser.find(".drawing-input[name='invert_eraser']").on('change', function () {
    let size = $eraser.find(".drawing-input[name='size']");

    if ($(this).is(':checked') == true)
        startEraserMode(true, size);
    else
        startEraserMode(false, size);
});

// Size
$eraser.find(".drawing-input[name='size']").on('input change', function () {
    let size = $(this).val();
    startEraserMode(false, parseInt(size));
    $eraser.find(".brush-view .background-image .draw-circle").css({
        width: size + 'px',
        height: size + 'px',
    });
});

//#endregion Eraser 

//#region Pencil

const PatternBrushList = {
    vLine: null,
    hLine: null,
    square: null,
    diamond: null,
    texture: null
}

// Pattern Brush
if (PatternBrushList) {

    for (const key in PatternBrushList) {
        PatternBrushList[key] = new PatternBrush(canvas);
    }

    // Vertical Line Brush
    PatternBrushList.vLine.getPatternSrc = function () {

        var patternCanvas = document.createElement('canvas');
        patternCanvas.width = patternCanvas.height = 10;
        var ctx = patternCanvas.getContext('2d');

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.lineTo(10, 5);
        ctx.closePath();
        ctx.stroke();

        return patternCanvas;
    };

    // Horizontal Line Brush
    PatternBrushList.hLine.getPatternSrc = function () {
        var patternCanvas = document.createElement('canvas');
        patternCanvas.width = patternCanvas.height = 10;
        var ctx = patternCanvas.getContext('2d');

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(5, 10);
        ctx.closePath();
        ctx.stroke();

        return patternCanvas;
    };

    // Square Pattern Brush
    PatternBrushList.square.getPatternSrc = function () {

        var squareWidth = 10,
            squareDistance = 2;

        var patternCanvas = document.createElement('canvas');
        patternCanvas.width = patternCanvas.height = squareWidth + squareDistance;
        var ctx = patternCanvas.getContext('2d');

        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, squareWidth, squareWidth);

        return patternCanvas;
    };

    // Diamond Pattern Brush
    PatternBrushList.diamond.getPatternSrc = function () {
        var squareWidth = 10,
            squareDistance = 5,
            patternCanvas = document.createElement('canvas'),
            rect = new Rect({
                width: squareWidth,
                height: squareWidth,
                angle: 45,
                fill: this.color
            });

        var canvasWidth = rect.getBoundingRect().width;

        patternCanvas.width = patternCanvas.height = canvasWidth + squareDistance;
        rect.set({
            left: canvasWidth / 2,
            top: canvasWidth / 2
        });

        var ctx = patternCanvas.getContext('2d');
        rect.render(ctx);

        return patternCanvas;
    };

    // Texture Pattern Brush
    var img = new Image();
    img.src = '../assets/honey_im_subtle.png';
    PatternBrushList.texture.source = img;
}

// Brush Type
$pencil.find(".drawing-input[name='brush_type']").on('change', function () {
    let type = $(this).attr('value');
    canvas.freeDrawingBrush = PatternBrushList.hasOwnProperty(type) ? PatternBrushList[type] : new fabric[type + 'Brush'](canvas)

    let brush = canvas.freeDrawingBrush,
        size = $pencil.find('.drawing-input[name="size"]').val(),
        drawShadowWidth = $pencil.find('.drawing-input[name="shadow_width"]').val(),
        drawShadowColor = $pencil.find('.drawing-input[name="shadow_color"]').val();

    brush.color = $pencil.find('.drawing-input[name="color"]').val();

    if (brush.getPatternSrc) brush.source = brush.getPatternSrc.call(brush);

    // Size
    brush.width = parseInt(size, 10) || 1;
    brush.shadow = new Shadow({
        blur: parseInt(drawShadowWidth, 10) || 0,
        offsetX: 0,
        offsetY: 0,
        affectStroke: true,
        color: drawShadowColor,
    });

    canvas.freeDrawingBrush = brush;
    canvas.renderAll();
});

// Size
$pencil.find('.drawing-input[name="size"]').on("input change", function () {
    let size = $(this).val(),
        color = $pencil.find('.drawing-input[name="color"]').val(),
        opacity = $pencil.find('.drawing-input[name="opacity"]').val();
    color = rgbaColorGenerator(color, opacity)
    canvas.freeDrawingBrush.width = parseInt(size, 10) || 1;

    $pencil.find(".brush-view .background-image .draw-circle").css({
        width: size + 'px',
        height: size + 'px',
        'background-color': color,
    });
});

// Shadow Width
$pencil.find('.drawing-input[name="shadow_width"]').on("input change", function () {
    let shadowWidth = $(this).val();
    canvas.freeDrawingBrush.shadow.blur = parseInt(shadowWidth, 10) || 0;
});

// Shadow Offset X
$pencil.find('.drawing-input[name="shadow_offset_x"]').on("input change", function () {
    let offset = $(this).val();
    canvas.freeDrawingBrush.shadow.offsetX = parseInt(offset, 10) || 0;
});

// Shadow Offset Y
$pencil.find('.drawing-input[name="shadow_offset_y"]').on("input change", function () {
    let offset = $(this).val();
    canvas.freeDrawingBrush.shadow.offsetY = parseInt(offset, 10) || 0;
});

// Shadow Color
$pencil.find('.drawing-input[name="shadow_color"]').on("input change", function () {
    canvas.freeDrawingBrush.shadow.color = $(this).val();
});

// Drawing Color
$pencil.find('.drawing-input[name="color"]').on("input change", function () {
    let brush = canvas.freeDrawingBrush;
    brush.color = $(this).val();
    if (brush.getPatternSrc)
        brush.source = brush.getPatternSrc.call(brush);
});

//#endregion Pencil 


// Drawing Mode False
function stopDrawingMode() {
    // return false;
    // delete object id
    delete drawingPropObject.id;
    // all objects erasable true 
    canvas.forEachObject(obj => {
        if (!obj) return false;
        obj.set({ erasable: true });
        canvas.renderAll();
    });
    // drawing mode false
    canvas.isDrawingMode = false;
    canvas.renderAll();
    // Curser Event Change
    changeCurserEvent();
    // Drawing Group
    drawingPropertiesSet();
}

// Drawing Properties Set
function drawingPropertiesSet() {
    let id = createNewId(),
        drawingPaths = canvas._objects.filter(obj => obj.type == "path" && !obj.rendered && !obj.originalItem);
    if (!drawingPaths.length) return false;
    drawingPaths.map(obj => obj.set({
        rendered: true,
        dirty: true
    }));

    let group = new Group(drawingPaths);
    group.set({
        originalItem: {
            class: "shape",
            fileType: "path",
            id,
            src: "path",
            type: "drawing",
        },
        id,
        dirty: true,
        options: {
            centerObject: false
        }
    });
    canvas.add(group);
    addItemToEditorCallback(id);
}

export {
    stopDrawingMode
}