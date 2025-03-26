// js/Editor/panels/drawing.js
import * as fabric from "fabric";
import { PencilBrush, PatternBrush, Shadow, Rect, Group } from "fabric";
import Alpine from "alpinejs";

// Replace the @erase2d/fabric import with a custom implementation
import {
  rgbaColorGenerator,
  changeCurserEvent,
  createNewId,
} from "../functions.js";
import { addItemToEditorCallback } from "../Editor.js";
import { canvas } from "../app.js";

// Create a custom EraserBrush implementation
// This is a basic implementation that simulates eraser functionality
// without requiring the external package
class CustomEraserBrush extends fabric.PencilBrush {
  constructor(canvas) {
    super(canvas);
    this.width = 20;
    this.color = "rgba(255,255,255,0.8)";
    this.fill = "#ddd";
    this.active = true;
  }

  // Override _render to implement eraser-like behavior
  _render() {
    const ctx = this.canvas.contextTop;
    ctx.globalCompositeOperation = "destination-out";
    super._render();
    ctx.globalCompositeOperation = "source-over";
  }

  // Handle erasing when path is complete
  commit(options) {
    const path = options?.path;
    const targets =
      options?.targets ||
      this.canvas.getObjects().filter((obj) => obj.erasable !== false);

    // Simulate erasing - this won't actually erase parts of objects
    // But for UI purposes it can work as a placeholder
    targets.forEach((target) => {
      // Instead of partial erasing, we'll just set opacity to simulate eraser effect
      if (path && path.intersectsWithObject(target)) {
        target.set("opacity", target.opacity * 0.7);
      }
    });

    return Promise.resolve();
  }
}

// Create and export Alpine component for drawing functionality
export function drawingPanel() {
  return {
    isActive: false,
    activeTab: "brush",
    patternBrushList: null,
    showDistortion: false,
    showShadow: false,

    // Brush settings
    brushSettings: {
      size: 20,
      opacity: 1,
      color: "#000000",
    },

    // Eraser settings
    eraserSettings: {
      size: 20,
      invert: false,
    },

    // Pencil settings
    pencilSettings: {
      size: 20,
      brushType: "Pencil",
      shadowWidth: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowColor: "#000000",
      color: "#333333",
    },

    init() {
      // Initialize component
      this.initPatternBrushes();

      // Listen for tool panel changes
      window.addEventListener("change-tool", (event) => {
        this.isActive = event.detail.type === "drawing";

        if (this.isActive) {
          // Activate drawing mode with the active tab
          this.$nextTick(() => {
            this.setDrawingMode(this.activeTab);
          });
        } else {
          // Stop drawing mode when switching away
          this.stopDrawingMode();
        }
      });

      // Listen for drawing tab activation
      window.addEventListener("activate-drawing-tab", (event) => {
        if (event.detail && event.detail.tab) {
          this.setDrawingMode(event.detail.tab);
        }
      });

      // Listen for path creation to mark objects as erasable
      if (typeof canvas !== "undefined") {
        canvas.on("path:created", (e) => {
          e.path.set({ erasable: true });
        });
      }
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
        const patternCanvas = document.createElement("canvas");
        patternCanvas.width = patternCanvas.height = 10;
        const ctx = patternCanvas.getContext("2d");

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
        const patternCanvas = document.createElement("canvas");
        patternCanvas.width = patternCanvas.height = 10;
        const ctx = patternCanvas.getContext("2d");

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
        const squareWidth = 10;
        const squareDistance = 2;

        const patternCanvas = document.createElement("canvas");
        patternCanvas.width = patternCanvas.height =
          squareWidth + squareDistance;
        const ctx = patternCanvas.getContext("2d");

        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, squareWidth, squareWidth);

        return patternCanvas;
      };

      // Diamond Pattern Brush
      this.patternBrushList.diamond.getPatternSrc = function () {
        const squareWidth = 10;
        const squareDistance = 5;
        const patternCanvas = document.createElement("canvas");
        const rect = new Rect({
          width: squareWidth,
          height: squareWidth,
          angle: 45,
          fill: this.color,
        });

        const canvasWidth = rect.getBoundingRect().width;

        patternCanvas.width = patternCanvas.height =
          canvasWidth + squareDistance;
        rect.set({
          left: canvasWidth / 2,
          top: canvasWidth / 2,
        });

        const ctx = patternCanvas.getContext("2d");
        rect.render(ctx);

        return patternCanvas;
      };

      // Texture Pattern Brush
      const img = new Image();
      img.src = "../assets/honey_im_subtle.png";
      this.patternBrushList.texture.source = img;
    },

    // Set drawing mode based on tab
    setDrawingMode(tabName) {
      this.activeTab = tabName;

      switch (tabName) {
        case "brush":
          this.activateBrushMode();
          break;
        case "eraser":
          this.activateEraserMode();
          break;
        case "pencil":
          this.activatePencilMode();
          break;
      }
    },

    // Activate brush mode
    activateBrushMode() {
      if (typeof canvas === "undefined") return;

      canvas.isDrawingMode = true;
      const color = rgbaColorGenerator(
        this.brushSettings.color,
        this.brushSettings.opacity
      );

      canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingCursor = `url(${this.getBrushCursor()}) ${
        this.brushSettings.size / 2
      } ${this.brushSettings.size / 2}, crosshair`;
      canvas.freeDrawingBrush.width = parseInt(this.brushSettings.size);
      canvas.renderAll();

      // Update brush preview
      this.updateBrushPreview();
    },

    // Activate eraser mode
    activateEraserMode() {
      if (typeof canvas === "undefined") return;

      const eraser = new CustomEraserBrush(canvas);
      eraser.width = parseInt(this.eraserSettings.size);
      eraser.active = true;
      eraser.fill = "#ddd";

      canvas.freeDrawingBrush = eraser;
      canvas.freeDrawingCursor = `url(${this.getEraserCursor()}) ${
        this.eraserSettings.size / 2
      } ${this.eraserSettings.size / 2}, crosshair`;
      canvas.isDrawingMode = true;
      canvas.renderAll();

      // Update eraser preview
      this.updateBrushPreview();
    },

    // Activate pencil mode
    activatePencilMode() {
      if (typeof canvas === "undefined") return;

      canvas.isDrawingMode = true;
      canvas.freeDrawingCursor = "crosshair";

      // Set brush type
      this.setPencilBrushType(this.pencilSettings.brushType);
      canvas.renderAll();
    },

    // Set pencil brush type
    setPencilBrushType(type) {
      if (typeof canvas === "undefined") return;

      // Determine brush type (pattern or regular)
      canvas.freeDrawingBrush = this.patternBrushList.hasOwnProperty(
        type.toLowerCase()
      )
        ? this.patternBrushList[type.toLowerCase()]
        : new fabric[`${type}Brush`](canvas);

      const brush = canvas.freeDrawingBrush;

      brush.color = this.pencilSettings.color;

      if (brush.getPatternSrc) brush.source = brush.getPatternSrc.call(brush);

      // Set brush properties
      brush.width = parseInt(this.pencilSettings.size);
      brush.shadow = new Shadow({
        blur: parseInt(this.pencilSettings.shadowWidth),
        offsetX: parseInt(this.pencilSettings.shadowOffsetX),
        offsetY: parseInt(this.pencilSettings.shadowOffsetY),
        affectStroke: true,
        color: this.pencilSettings.shadowColor,
      });

      canvas.freeDrawingBrush = brush;
      canvas.renderAll();

      // Update pencil preview
      this.updateBrushPreview();
    },

    // Update brush preview
    updateBrushPreview() {
      // This will be handled by Alpine's reactivity in the HTML
    },

    // Generate brush cursor
    getBrushCursor() {
      const circle = `
        <svg
          height="${this.brushSettings.size}"
          fill="${rgbaColorGenerator(
            this.brushSettings.color,
            this.brushSettings.opacity
          )}"
          viewBox="0 0 ${this.brushSettings.size * 2} ${
        this.brushSettings.size * 2
      }"
          width="${this.brushSettings.size}"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="50%"
            cy="50%"
            r="${this.brushSettings.size}" 
          />
        </svg>
      `;

      return `data:image/svg+xml;base64,${window.btoa(circle)}`;
    },

    // Generate eraser cursor
    getEraserCursor() {
      const circle = `
        <svg
          height="${this.eraserSettings.size}"
          fill="#2f3e50"
          viewBox="0 0 ${this.eraserSettings.size * 2} ${
        this.eraserSettings.size * 2
      }"
          width="${this.eraserSettings.size}"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="50%"
            cy="50%"
            r="${this.eraserSettings.size}" 
          />
        </svg>
      `;

      return `data:image/svg+xml;base64,${window.btoa(circle)}`;
    },

    // Stop drawing mode
    stopDrawingMode() {
      if (typeof canvas === "undefined") return;

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

    // Group drawing paths
    groupDrawingPaths() {
      if (typeof canvas === "undefined") return;

      const id = createNewId();
      const drawingPaths = canvas._objects.filter(
        (obj) => obj.type === "path" && !obj.rendered && !obj.originalItem
      );

      if (!drawingPaths.length) return false;

      drawingPaths.forEach((obj) =>
        obj.set({
          rendered: true,
          dirty: true,
        })
      );

      const group = new Group(drawingPaths);
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
  const drawingPanelEl = document.querySelector('[x-data="drawingPanel"]');
  if (drawingPanelEl && drawingPanelEl.__x) {
    drawingPanelEl.__x.dataStack[0].stopDrawingMode();
  }
}
