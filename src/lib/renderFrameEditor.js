const sourceCanvas = (image) => {
  const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
  canvas.getContext('2d').putImageData(image, 0, 0); return canvas;
};

const maskCanvas = (mask, width, height, maskView) => {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(width, height);
  for (let i = 0; i < mask.length; i++) {
    const o = i * 4;
    if (maskView) { const selected = mask[i] ? 255 : 0; pixels.data[o] = selected; pixels.data[o + 1] = selected; pixels.data[o + 2] = selected; pixels.data[o + 3] = 255; }
    else if (mask[i]) { pixels.data[o] = 30; pixels.data[o + 1] = 130; pixels.data[o + 2] = 255; pixels.data[o + 3] = 125; }
  }
  ctx.putImageData(pixels, 0, 0); return canvas;
};

export function viewportTransform(canvas, image, zoom, pan) {
  const dpr = window.devicePixelRatio || 1, viewW = canvas.width / dpr, viewH = canvas.height / dpr;
  const scale = Math.min(viewW / image.width, viewH / image.height) * zoom;
  return { dpr, viewW, viewH, scale, x: (viewW - image.width * scale) / 2 + pan.x, y: (viewH - image.height * scale) / 2 + pan.y };
}

export function renderFrameEditor(canvas, image, mask, options) {
  if (!canvas || !image) return; const ctx = canvas.getContext('2d');
  const t = viewportTransform(canvas, image, options.zoom, options.pan); ctx.setTransform(t.dpr, 0, 0, t.dpr, 0, 0); ctx.clearRect(0, 0, t.viewW, t.viewH);
  if (!options.maskView) ctx.drawImage(sourceCanvas(image), t.x, t.y, image.width * t.scale, image.height * t.scale);
  if (options.showMask || options.maskView) ctx.drawImage(maskCanvas(mask, image.width, image.height, options.maskView), t.x, t.y, image.width * t.scale, image.height * t.scale);
  if (options.touch) {
    const { x, y } = options.touch; ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.stroke();
    const ix = Math.max(0, Math.min(image.width - 1, Math.round((x - t.x) / t.scale))), iy = Math.max(0, Math.min(image.height - 1, Math.round((y - t.y) / t.scale)));
    ctx.save(); ctx.beginPath(); ctx.arc(t.viewW - 58, 58, 48, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = '#111'; ctx.fillRect(t.viewW - 108, 8, 100, 100); ctx.imageSmoothingEnabled = false; ctx.drawImage(sourceCanvas(image), ix - 12, iy - 12, 24, 24, t.viewW - 108, 8, 100, 100); ctx.restore();
  }
}