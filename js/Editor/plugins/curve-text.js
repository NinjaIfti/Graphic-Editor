//js/Editor/plugins/curve-text.js
import * as fabric from "fabric";
import { Textbox } from "fabric";
import { canvas } from "../app.js";
import Alpine from "alpinejs";

class CurvedText extends Textbox {
  static type = "curved-text";

  constructor(text, options = {}) {
    super(text, options);
    this.text = text || "";
    this.diameter = options.diameter || 250;
    this.kerning = options.kerning || 0;
    this.flipped = options.flipped || false;
    this.strokeStyle = options.strokeStyle || null;
    this.strokeWidth = options.strokeWidth || 0;
    this._cachedCanvas = null;
    this._needsRecalculate = true;
    this._refresh = true;

    this.set("lockUniScaling", true);
    this._initializeCanvas();
  }

  _initializeCanvas() {
    let canvas = this.getCircularText();
    canvas = this._trimCanvas(canvas);
    this.set({ width: canvas.width, height: canvas.height });
  }

  _getFontDeclaration() {
    return [
      fabric.isLikelyNode ? this.fontWeight : this.fontStyle,
      fabric.isLikelyNode ? this.fontStyle : this.fontWeight,
      `${this.fontSize}px`,
      fabric.isLikelyNode ? `"${this.fontFamily}"` : this.fontFamily,
    ].join(" ");
  }

  _trimCanvas(canvas) {
    try {
      var ctx = canvas.getContext("2d", { willReadFrequently: true }),
        w = canvas.width,
        h = canvas.height,
        pix = { x: [], y: [] },
        n,
        imageData = ctx.getImageData(0, 0, w, h),
        fn = function (a, b) {
          return a - b;
        };

      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          if (imageData.data[(y * w + x) * 4 + 3] > 0) {
            pix.x.push(x);
            pix.y.push(y);
          }
        }
      }
      pix.x.sort(fn);
      pix.y.sort(fn);
      n = pix.x.length - 1;

      w = pix.x[n] - pix.x[0];
      h = pix.y[n] - pix.y[0];
      var cut = ctx.getImageData(pix.x[0], pix.y[0], w, h);

      canvas.width = w;
      canvas.height = h;
      ctx.putImageData(cut, 0, 0);

      return canvas;
    } catch (err) {
      return false;
    }
  }

  getCircularText() {
    if (this._cachedCanvas && !this._needsRecalculate)
      return this._cachedCanvas;

    var text =
        this.text.trim().length > 1
          ? this.text
          : "You don't set empty value in curved text",
      diameter = this.diameter,
      flipped = this.flipped,
      kerning = this.kerning,
      fill = this.fill,
      inwardFacing = true,
      startAngle = 0,
      canvas = fabric.util.createCanvasElement(),
      ctx = canvas.getContext("2d", { willReadFrequently: true }),
      cw, // character-width
      x, // iterator
      clockwise = -1; // draw clockwise for aligned right. Else Anticlockwise

    if (flipped) {
      startAngle = 180;
      inwardFacing = false;
    }

    startAngle *= Math.PI / 180; // convert to radians

    // Calc heigt of text in selected font:
    var d = document.createElement("div");
    d.style.fontFamily = this.fontFamily;
    d.style.whiteSpace = "nowrap";
    d.style.fontSize = this.fontSize + "px";
    d.style.fontWeight = this.fontWeight;
    d.style.fontStyle = this.fontStyle;
    d.textContent = text;
    document.body.appendChild(d);
    var textHeight = d.offsetHeight;
    document.body.removeChild(d);

    canvas.width = canvas.height = diameter;
    ctx.font = this._getFontDeclaration();

    // Reverse letters for center inward.
    if (inwardFacing) text = text.split("").reverse().join("");

    // Setup letters and positioning
    ctx.translate(diameter / 2, diameter / 2); // Move to center
    startAngle += Math.PI * !inwardFacing; // Rotate 180 if outward
    ctx.textBaseline = "middle"; // Ensure we draw in exact center
    ctx.textAlign = "center"; // Ensure we draw in exact center

    // rotate 50% of total angle for center alignment
    for (x = 0; x < text.length; x++) {
      cw = ctx.measureText(text[x]).width;
      startAngle +=
        ((cw + (x == text.length - 1 ? 0 : kerning)) /
          (diameter / 2 - textHeight) /
          2) *
        -clockwise;
    }

    // Phew... now rotate into final start position
    ctx.rotate(startAngle);

    // Now for the fun bit: draw, rotate, and repeat
    for (x = 0; x < text.length; x++) {
      cw = ctx.measureText(text[x]).width; // half letter
      // rotate half letter
      ctx.rotate((cw / 2 / (diameter / 2 - textHeight)) * clockwise);
      // draw the character at "top" or "bottom"
      // depending on inward or outward facing

      // Stroke
      if (this.strokeStyle && this.strokeWidth) {
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.strokeWidth;
        ctx.miterLimit = 2;
        ctx.strokeText(
          text[x],
          0,
          (inwardFacing ? 1 : -1) * (0 - diameter / 2 + textHeight / 2)
        );
      }

      // Actual text
      ctx.fillStyle = fill;
      ctx.fillText(
        text[x],
        0,
        (inwardFacing ? 1 : -1) * (0 - diameter / 2 + textHeight / 2)
      );

      ctx.rotate(
        ((cw / 2 + kerning) / (diameter / 2 - textHeight)) * clockwise
      ); // rotate half letter
    }

    this._cachedCanvas = canvas;
    this._needsRecalculate = false;
    return this._cachedCanvas;
  }

  _measureTextHeight(text) {
    const d = document.createElement("div");
    d.style.fontFamily = this.fontFamily;
    d.style.whiteSpace = "nowrap";
    d.style.fontSize = `${this.fontSize}px`;
    d.style.fontWeight = this.fontWeight;
    d.style.fontStyle = this.fontStyle;
    d.textContent = text;
    document.body.appendChild(d);
    const textHeight = d.offsetHeight;
    document.body.removeChild(d);
    return textHeight;
  }

  _set(key, value) {
    super._set(key, value);
    this._needsRecalculate = true;
  }

  _updateObj(key, value) {
    switch (key) {
      case "scaleX":
        this.fontSize *= value;
        this.diameter *= value;
        this.width *= value;
        this.scaleX = 1;
        this.width = Math.max(this.width, 1);
        break;

      case "scaleY":
        this.height *= value;
        this.scaleY = 1;
        this.height = Math.max(this.height, 1);
        break;

      default:
        super._set(key, value);
        break;
    }
    this._needsRecalculate = true;
  }

  refreshCtx(bool = false) {
    this._refresh = bool;
  }

  _render(ctx) {
    if (!this._refresh && this._cachedCanvas) {
      ctx.drawImage(
        this._cachedCanvas,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
      return;
    }

    if (!this._cachedCanvas || this._needsRecalculate) {
      var canvas = this.getCircularText();
      canvas = this._trimCanvas(canvas);

      this.set("width", canvas.width);
      this.set("height", canvas.height);
    }

    ctx.drawImage(
      canvas,
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height
    );

    this.setCoords();
  }

  toObject(propertiesToInclude = []) {
    return {
      ...super.toObject(propertiesToInclude),
      text: this.text,
      diameter: this.diameter,
      kerning: this.kerning,
      flipped: this.flipped,
      fill: this.fill,
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      fontWeight: this.fontWeight,
      fontStyle: this.fontStyle,
      strokeStyle: this.strokeStyle,
      strokeWidth: this.strokeWidth,
    };
  }
}

// Add Curve Text
const addCurveText = (obj, diameter, percentage = null) => {
  let options = {
    ...obj,
    originalItem: {
      text: obj.text,
      type: "curved-text",
      class: "text",
      fileType: "curved-text",
    },
    left: obj.left,
    top: obj.top,
    caching: false,
    scaleX: obj.scaleX,
    scaleY: obj.scaleY,
    diameter: parseInt(diameter),
    fill: obj.fill,
    shadow: obj.shadow,
    shadowCheck: obj?.shadowCheck,
    percentage,
    rotateAngle: 0,
    strokeStyle: obj.stroke,
    strokeWidth: obj.strokeWidth,
    fontSize: obj.fontSize,
    objectCaching: false,
    ownCaching: false,
  };

  // Set Letter Spacing
  let letterSpacing = (parseInt(obj.charSpacing) / 100) * 3;
  letterSpacing = letterSpacing.toFixed(1);
  if (letterSpacing < -1) letterSpacing = -1;

  options.kerning = parseInt(letterSpacing);

  const curvedText = new CurvedText(obj.text, options);
  let index = canvas.getObjects().indexOf(obj);

  canvas.remove(obj);
  canvas.moveObjectTo(curvedText, index);
  canvas.setActiveObject(curvedText);
  canvas.requestRenderAll();
};

// Get Range From Percentage
function getRangeFromPercentage(percentage) {
  percentage = parseInt(percentage) || 0;
  let rangeValue = 2500;
  if (percentage > 0) rangeValue = 2500 + percentage * 25;
  else if (percentage < 0) rangeValue = 2500 - Math.abs(percentage) * 25;

  return rangeValue;
}

// Initialize curved text functionality
function initCurveText(value) {
  let obj = canvas.getActiveObject();
  if (!obj) return 0;

  let percentage = value >= 2500 ? (value - 2500) / 25 : -((2500 - value) / 25);

  percentage = percentage.toFixed(0);
  if (percentage == -0 || percentage == "-0") percentage = 0;

  if (percentage > 90) {
    percentage = 90;
    value = getRangeFromPercentage(percentage);
  }

  if (percentage < -90) {
    percentage = -90;
    value = getRangeFromPercentage(percentage);
  }

  let isFlipped = percentage < 0,
    hasCurveApply = parseInt(percentage) != 0;

  if (value >= 2500) value = 2500 - (value - 2500);
  const angle = (percentage * 3.6).toFixed(0);

  let isCurvedText = obj.type == "curved-text";
  if (hasCurveApply && !isCurvedText) {
    addCurveText(obj, value, percentage);
  } else if (!hasCurveApply) {
    obj.stroke = obj.strokeStyle;
    const text = new Textbox(obj.text, {
      ...obj,
      percentage,
    });

    let index = canvas.getObjects().indexOf(obj);

    canvas.remove(obj);
    canvas.add(text);

    canvas.setActiveObject(text);
    canvas.moveObjectTo(text, index);
  } else if (hasCurveApply && isCurvedText) {
    obj.set("_cachedCanvas", null);
    obj.set("diameter", value);
    obj.set("flipped", isFlipped);
    obj.set("percentage", percentage);
    obj.set("rotateAngle", angle);
    obj._updateObj("scaleX", obj.scaleX);
    obj._updateObj("scaleY", obj.scaleY);
  }

  canvas.requestRenderAll();

  // Notify Alpine components about curve text update
  document.dispatchEvent(
    new CustomEvent("curve-text-updated", {
      detail: {
        percentage,
        angle,
      },
    })
  );

  return angle;
}

// Create Alpine component for curved text
document.addEventListener("alpine:init", () => {
  Alpine.data("curvedTextPanel", () => ({
    curveValue: 2500,
    curveAngle: 0,

    init() {
      // Listen for active object changes to update curve text panel
      document.addEventListener("active-object-changed", (e) => {
        if (e.detail.object?.type === "curved-text") {
          this.updateFromObject(e.detail.object);
        }
      });

      document.addEventListener("curved-text-updated", (e) => {
        this.curveValue = getRangeFromPercentage(e.detail.percentage);
        this.curveAngle = e.detail.angle;
      });
    },

    updateFromObject(obj) {
      if (obj.percentage) {
        this.curveValue = getRangeFromPercentage(obj.percentage);
        this.curveAngle = obj.rotateAngle || 0;
      }
    },

    updateCurveFromRange() {
      const angle = initCurveText(this.curveValue);
      this.curveAngle = angle;
    },

    updateCurveFromAngle() {
      let val = parseInt(this.curveAngle);

      // Validate angle input
      if (val > 360) this.curveAngle = 360;
      else if (val < -360) this.curveAngle = -360;

      // Convert angle to percentage
      let value = (val / 360) * 100;

      if (value > 90) value = 90;
      else if (value < -90) value = -90;

      // Get range value from percentage
      let rangeValue = getRangeFromPercentage(value);

      // Apply curve with calculated value
      this.curveValue = rangeValue;
      initCurveText(rangeValue);
    },
  }));
});

// Export the function for use in other modules
export { getRangeFromPercentage, initCurveText };
