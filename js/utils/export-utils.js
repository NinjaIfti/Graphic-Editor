// src/utils/export-utils.js
export function downloadPNG() {
  if (!window.canvas) return;
  const dataURL = window.canvas.toDataURL({
    format: "png",
    quality: 1,
  });
  const link = document.createElement("a");
  link.download = "canvas-export.png";
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadJPG() {
  if (!window.canvas) return;
  const dataURL = window.canvas.toDataURL({
    format: "jpeg",
    quality: 0.8,
  });
  const link = document.createElement("a");
  link.download = "canvas-export.jpg";
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
