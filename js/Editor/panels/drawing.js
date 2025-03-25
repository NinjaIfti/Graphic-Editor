// js/Editor/panels/drawing.js
import * as fabric from "fabric";
import { PencilBrush, PatternBrush, Shadow, Rect, Group } from "fabric";
import { EraserBrush } from "@erase2d/fabric";
import {
  rgbaColorGenerator,
  changeCurserEvent,
  createNewId,
} from "../functions.js";
import { addItemToEditorCallback } from "../Editor.js";
import { canvas } from "../app.js";

// Create and export Alpine component for drawing functionality
export function drawingComponent() {
  return {
    // State management
    activeTab: "brush",
    patternBrushList: null,

    // Brush state
    brush: {
      size: 20,
      opacity: 1,
      color: "#000000",
    },

    // Eraser state
    eraser: {
      size: 20,
      invertEraser: false,
    },

    // Pencil state
    pencil: {
      size: 20,
      brushType: "Pencil",
      shadowWidth: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowColor: "#000000",
      color: "#333",
    },

    // Initialize the component
    init() {
      this.initPatternBrushes();

      // Set initial drawing mode based on default active tab
      this.$nextTick(() => {
        this.setDrawingMode(this.activeTab);
      });

      // Listen for path creation to mark objects as erasable
      canvas.on("path:created", (e) => {
        e.path.set({ erasable: true });
      });
    },

    // Initialize pattern brushes
    initPatternBrushes() {
      this.patternBrushList = {
        vLine: new PatternBrush(canvas),
        hLine: new PatternBrush(canvas),
        square: new PatternBrush(canvas),
        diamond: new PatternBrush(canvas),
        texture: new PatternBrush(canvas),
      };

      // Vertical Line Brush
      this.patternBrushList.vLine.getPatternSrc = function () {
        var patternCanvas = document.createElement("canvas");
        patternCanvas.width = patternCanvas.height = 10;
        var ctx = patternCanvas.getContext("2d");

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
      this.patternBrushList.hLine.getPatternSrc = function () {
        var patternCanvas = document.createElement("canvas");
        patternCanvas.width = patternCanvas.height = 10;
        var ctx = patternCanvas.getContext("2d");

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
      this.patternBrushList.square.getPatternSrc = function () {
        var squareWidth = 10,
          squareDistance = 2;

        var patternCanvas = document.createElement("canvas");
        patternCanvas.width = patternCanvas.height =
          squareWidth + squareDistance;
        var ctx = patternCanvas.getContext("2d");

        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, squareWidth, squareWidth);

        return patternCanvas;
      };

      // Diamond Pattern Brush
      this.patternBrushList.diamond.getPatternSrc = function () {
        var squareWidth = 10,
          squareDistance = 5,
          patternCanvas = document.createElement("canvas"),
          rect = new Rect({
            width: squareWidth,
            height: squareWidth,
            angle: 45,
            fill: this.color,
          });

        var canvasWidth = rect.getBoundingRect().width;

        patternCanvas.width = patternCanvas.height =
          canvasWidth + squareDistance;
        rect.set({
          left: canvasWidth / 2,
          top: canvasWidth / 2,
        });

        var ctx = patternCanvas.getContext("2d");
        rect.render(ctx);

        return patternCanvas;
      };

      // Texture Pattern Brush
      var img = new Image();
      img.src = "../assets/honey_im_subtle.png";
      this.patternBrushList.texture.source = img;
    },

    // Set the drawing mode based on the active tab
    setDrawingMode(tabName) {
      this.activeTab = tabName;

      if (tabName === "brush") {
        this.activateBrushMode();
      } else if (tabName === "eraser") {
        this.activateEraserMode();
      } else if (tabName === "pencil") {
        this.activatePencilMode();
      }
    },

    // Activate brush mode
    activateBrushMode() {
      canvas.isDrawingMode = true;
      const color = rgbaColorGenerator(this.brush.color, this.brush.opacity);

      canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingCursor = `url(${this.getBrushCursor()}) ${
        this.brush.size / 2
      } ${this.brush.size / 2}, crosshair`;
      canvas.freeDrawingBrush.width = parseInt(this.brush.size);
      canvas.renderAll();

      // Update brush circle display
      this.$nextTick(() => {
        this.updateBrushCircle("brush");
      });
    },

    // Activate eraser mode
    activateEraserMode() {
      let eraser = new EraserBrush(canvas);

      eraser.on("end", async (e) => {
        e.preventDefault();
        const { path, targets } = e.detail;
        await eraser.commit({ path, targets });
        canvas.renderAll();
      });

      eraser.width = parseInt(this.eraser.size);
      eraser.active = true;
      eraser.fill = "#ddd";
      canvas.freeDrawingBrush = eraser;
      canvas.freeDrawingCursor = `url(${this.getEraserCursor()}) ${
        this.eraser.size / 2
      } ${this.eraser.size / 2}, crosshair`;
      canvas.isDrawingMode = true;
      canvas.renderAll();

      // Update eraser circle display
      this.$nextTick(() => {
        this.updateBrushCircle("eraser");
      });
    },

    // Activate pencil mode
    activatePencilMode() {
      canvas.isDrawingMode = true;
      canvas.freeDrawingCursor = "crosshair";

      // Set brush type
      this.setPencilBrushType(this.pencil.brushType);
      canvas.renderAll();
    },

    // Set the pencil brush type
    setPencilBrushType(type) {
      // Determine brush type (pattern or regular)
      canvas.freeDrawingBrush = this.patternBrushList.hasOwnProperty(
        type.toLowerCase()
      )
        ? this.patternBrushList[type.toLowerCase()]
        : new fabric[`${type}Brush`](canvas);

      let brush = canvas.freeDrawingBrush;

      brush.color = this.pencil.color;

      if (brush.getPatternSrc) brush.source = brush.getPatternSrc.call(brush);

      // Set brush properties
      brush.width = parseInt(this.pencil.size);
      brush.shadow = new Shadow({
        blur: parseInt(this.pencil.shadowWidth),
        offsetX: parseInt(this.pencil.shadowOffsetX),
        offsetY: parseInt(this.pencil.shadowOffsetY),
        affectStroke: true,
        color: this.pencil.shadowColor,
      });

      canvas.freeDrawingBrush = brush;
      canvas.renderAll();

      // Update pencil circle display
      this.$nextTick(() => {
        this.updateBrushCircle("pencil");
      });
    },

    // Update brush size/color circle display
    updateBrushCircle(toolType) {
      const circleElement = document.querySelector(
        `.tab-panel#${toolType} .brush-view .background-image .draw-circle`
      );
      if (!circleElement) return;

      if (toolType === "brush") {
        circleElement.style.width = `${this.brush.size}px`;
        circleElement.style.height = `${this.brush.size}px`;
        circleElement.style.backgroundColor = rgbaColorGenerator(
          this.brush.color,
          this.brush.opacity
        );
      } else if (toolType === "eraser") {
        circleElement.style.width = `${this.eraser.size}px`;
        circleElement.style.height = `${this.eraser.size}px`;
      } else if (toolType === "pencil") {
        circleElement.style.width = `${this.pencil.size}px`;
        circleElement.style.height = `${this.pencil.size}px`;
        circleElement.style.backgroundColor = this.pencil.color;
      }
    },

    // Generate brush cursor
    getBrushCursor() {
      const circle = `
                <svg
                    height="${this.brush.size}"
                    fill="${rgbaColorGenerator(
                      this.brush.color,
                      this.brush.opacity
                    )}"
                    viewBox="0 0 ${this.brush.size * 2} ${this.brush.size * 2}"
                    width="${this.brush.size}"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <circle
                        cx="50%"
                        cy="50%"
                        r="${this.brush.size}" 
                    />
                </svg>
            `;

      return `data:image/svg+xml;base64,${window.btoa(circle)}`;
    },

    // Generate eraser cursor
    getEraserCursor() {
      const circle = `
                <svg
                    height="${this.eraser.size}"
                    fill="#2f3e50"
                    viewBox="0 0 ${this.eraser.size * 2} ${
        this.eraser.size * 2
      }"
                    width="${this.eraser.size}"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <circle
                        cx="50%"
                        cy="50%"
                        r="${this.eraser.size}" 
                    />
                </svg>
            `;

      return `data:image/svg+xml;base64,${window.btoa(circle)}`;
    },

    // Stop drawing mode
    stopDrawingMode() {
      // Make all objects erasable
      canvas.forEachObject((obj) => {
        if (!obj) return false;
        obj.set({ erasable: true });
      });

      // Disable drawing mode
      canvas.isDrawingMode = false;
      canvas.renderAll();

      // Change cursor
      changeCurserEvent();

      // Group drawn paths
      this.groupDrawingPaths();
    },

    // Group drawing paths into a single object
    groupDrawingPaths() {
      const id = createNewId();
      const drawingPaths = canvas._objects.filter(
        (obj) => obj.type == "path" && !obj.rendered && !obj.originalItem
      );

      if (!drawingPaths.length) return false;

      drawingPaths.forEach((obj) =>
        obj.set({
          rendered: true,
          dirty: true,
        })
      );

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
          centerObject: false,
        },
      });

      canvas.add(group);
      addItemToEditorCallback(id);
    },
  };
}

// Export stop drawing mode for other modules to use
export function stopDrawingMode() {
  // This function will be called from outside the component
  // We'll need to get the Alpine component and call its method
  const drawingPanel = document.querySelector("#drawing");
  if (drawingPanel && drawingPanel.__x) {
    drawingPanel.__x.$data.stopDrawingMode();
  }
}
