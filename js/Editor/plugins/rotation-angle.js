import { util, Point } from "fabric";
import { canvas } from "../app.js";

const RotationState = {
  lastAngleRotation: null,
  currentAngle: null,
  isRotating: false,
  cursorPos: new Point()
};

// Rotate Icon
function mouseRotateIcon(angle) {
  const relativeAngle = angle - 90,
    pos = {
      "-90": "9.25 5.25",
      "-75": "9.972 3.863",
      "-60": "10.84 1.756",
      "-45": "11.972 -1.716",
      "-30": "18.83 0.17",
      "-15": "28.49 -9.49",
      15: "-7.985 46.77",
      30: "-0.415 27.57",
      45: "2.32 21.713",
      60: "3.916 18.243",
      75: "4.762 16.135",
      90: "5.25 14.75",
      105: "5.84 13.617",
      120: "6.084 12.666",
      135: "6.317 12.01",
      150: "6.754 11.325",
      165: "7.06 10.653",
      180: "7.25 10",
      195: "7.597 9.43",
      210: "7.825 8.672",
      225: "7.974 7.99",
      240: "8.383 7.332",
      255: "8.83 6.441"
    },
    defaultPos = "7.25 10";

  const transform =
    relativeAngle === 0
      ? "translate(9.5 3.5)"
      : `rotate(${relativeAngle} ${pos[relativeAngle] || defaultPos})`;

  const imgCursor = encodeURIComponent(`
  <svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='24' height='24'>
    <defs>
      <filter id='a' width='266.7%' height='156.2%' x='-75%' y='-21.9%' filterUnits='objectBoundingBox'>
        <feOffset dy='1' in='SourceAlpha' result='shadowOffsetOuter1'/>
        <feGaussianBlur in='shadowOffsetOuter1' result='shadowBlurOuter1' stdDeviation='1'/>
        <feColorMatrix in='shadowBlurOuter1' result='shadowMatrixOuter1' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0'/>
        <feMerge>
          <feMergeNode in='shadowMatrixOuter1'/>
          <feMergeNode in='SourceGraphic'/>
        </feMerge>
      </filter>
      <path id='b' d='M1.67 12.67a7.7 7.7 0 0 0 0-9.34L0 5V0h5L3.24 1.76a9.9 9.9 0 0 1 0 12.48L5 16H0v-5l1.67 1.67z'/>
    </defs>
    <g fill='none' fill-rule='evenodd'><path d='M0 24V0h24v24z'/>
      <g fill-rule='nonzero' filter='url(#a)' transform='${transform}'>
        <use fill='#000' fill-rule='evenodd' xlink:href='#b'/>
        <path stroke='#FFF' d='M1.6 11.9a7.21 7.21 0 0 0 0-7.8L-.5 6.2V-.5h6.7L3.9 1.8a10.4 10.4 0 0 1 0 12.4l2.3 2.3H-.5V9.8l2.1 2.1z'/>
      </g>
    </g>
  </svg>`);
  return `url("data:image/svg+xml;charset=utf-8,${imgCursor}") 12 12, crosshair`;
}

// Treat Angle
function treatAngle(angle) {
  return angle - (angle % 15);
}


// Custom icon control
const RotateIconSVG = encodeURIComponent(`
<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g filter="url(#filter0_d)">
    <circle cx="9" cy="9" r="5" fill="white"/>
    <circle cx="9" cy="9" r="4.75" stroke="black" stroke-opacity="0.3" stroke-width="0.5"/>
  </g>
    <path d="M10.8047 11.1242L9.49934 11.1242L9.49934 9.81885" stroke="black" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M6.94856 6.72607L8.25391 6.72607L8.25391 8.03142" stroke="black" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9.69517 6.92267C10.007 7.03301 10.2858 7.22054 10.5055 7.46776C10.7252 7.71497 10.8787 8.01382 10.9517 8.33642C11.0247 8.65902 11.0148 8.99485 10.9229 9.31258C10.831 9.63031 10.6601 9.91958 10.4262 10.1534L9.49701 11.0421M8.25792 6.72607L7.30937 7.73554C7.07543 7.96936 6.90454 8.25863 6.81264 8.57636C6.72073 8.89408 6.71081 9.22992 6.78381 9.55251C6.8568 9.87511 7.01032 10.174 7.23005 10.4212C7.44978 10.6684 7.72855 10.8559 8.04036 10.9663" stroke="black" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"/>
  <defs>
  <filter id="filter0_d" x="0" y="0" width="18" height="18" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
    <feFlood flood-opacity="0" result="BackgroundImageFix"/>
    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
    <feOffset/>
    <feGaussianBlur stdDeviation="2"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.137674 0 0 0 0 0.190937 0 0 0 0 0.270833 0 0 0 0.15 0"/>
    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
  </filter>
  </defs>
</svg>
`);
const RotationIcon = document.createElement("img");
RotationIcon.src = `data:image/svg+xml;utf8,${RotateIconSVG}`;

// Defining how the rendering action will be
function renderIcon(ctx, left, top, styleOverride, fabricObject) {
  var size = this.cornerSize;
  ctx.save();
  ctx.translate(left, top);
  ctx.rotate(util.degreesToRadians(fabricObject.angle));
  ctx.drawImage(RotationIcon, -size / 2, -size / 2, size, size);
  ctx.restore();
}

// Define how the cursor will be
function rotationStyleHandler(eventData, control, fabricObject) {
  if (fabricObject.lockRotation) {
    return NOT_ALLOWED_CURSOR;
  }
  const angle = treatAngle(fabricObject.angle);
  RotationState.lastAngleRotation = angle;
  return mouseRotateIcon(angle);
}

// Render Rotate Label
function renderRotateLabel(ctx, canvas) {
  const angleText = `${RotationState.currentAngle.toFixed(0)}°`,
    borderRadius = 5,
    rectWidth = 35,
    rectHeight = 22,
    textWidth = 6.01 * angleText.length - 2.317,
    { tl, br } = canvas.vptCoords,
    obj = canvas.getActiveObject();

  if (!obj) return;

  const controlPos = obj.oCoords.mtr,
    pos = new Point(controlPos.x + 10, controlPos.y + 10);

  ctx.save();
  ctx.translate(
    Math.min(Math.max(pos.x, tl.x), br.x - rectWidth),
    Math.min(Math.max(pos.y, tl.y), br.y - rectHeight)
  );
  ctx.beginPath();
  ctx.fillStyle = "rgba(37,38,39,0.9)";
  ctx.roundRect(0, 0, rectWidth, rectHeight, borderRadius);
  ctx.fill();
  ctx.font = "400 13px sans-serif";
  ctx.fillStyle = "hsla(0,0%, 100%, 0.9)";
  ctx.fillText(angleText, rectWidth / 2 - textWidth / 2, rectHeight / 2 + 4);
  ctx.restore();
}

//#region Event Listeners

canvas.on("object:rotating", function (e) {
  const angle = treatAngle(e.target.angle);
  if (RotationState.lastAngleRotation !== angle) {
    canvas.setCursor(mouseRotateIcon(angle));
    RotationState.lastAngleRotation = angle;
  }
  RotationState.isRotating = true;
  RotationState.currentAngle = e.target.angle;
  RotationState.cursorPos.x = e.pointer.x;
  RotationState.cursorPos.y = e.pointer.y;
});

canvas.on("after:render", function (opt) {
  RotationState.isRotating && renderRotateLabel(opt.ctx, canvas);
});
//#endregion Event Listeners 


export {
  RotationState
}