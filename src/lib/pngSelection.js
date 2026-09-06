export async function readPng(file) {
  const url = URL.createObjectURL(file);
  const image = await new Promise((resolve, reject) => { const element = new window.Image(); element.onload = () => resolve(element); element.onerror = reject; element.src = url; });
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0); URL.revokeObjectURL(url);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

const similar = (data, a, b, tolerance) => {
  const dr = data[a] - data[b], dg = data[a + 1] - data[b + 1], db = data[a + 2] - data[b + 2], da = data[a + 3] - data[b + 3];
  return dr * dr + dg * dg + db * db + da * da * .25 <= tolerance * tolerance * 3;
};

export function connectedSelection(image, sx, sy, tolerance) {
  const { width, height, data } = image, mask = new Uint8Array(width * height), queue = new Int32Array(width * height);
  const seed = sy * width + sx, seedOffset = seed * 4; let head = 0, tail = 0; queue[tail++] = seed; mask[seed] = 255;
  while (head < tail) {
    const pixel = queue[head++], x = pixel % width;
    const visit = (next) => { if (next >= 0 && next < mask.length && !mask[next] && similar(data, next * 4, seedOffset, tolerance)) { mask[next] = 255; queue[tail++] = next; } };
    if (x) visit(pixel - 1); if (x < width - 1) visit(pixel + 1); visit(pixel - width); visit(pixel + width);
  }
  return mask;
}

export function colorSelection(image, sx, sy, tolerance) {
  const { width, height, data } = image, mask = new Uint8Array(width * height), seed = (sy * width + sx) * 4;
  for (let pixel = 0; pixel < mask.length; pixel++) if (similar(data, pixel * 4, seed, tolerance)) mask[pixel] = 255;
  return mask;
}

export function mergeSelection(current, incoming, mode) {
  const result = new Uint8Array(current.length);
  for (let i = 0; i < result.length; i++) result[i] = mode === 'new' ? incoming[i] : mode === 'add' ? Math.max(current[i], incoming[i]) : incoming[i] ? 0 : current[i];
  return result;
}

export function paintSelection(mask, width, height, x, y, radius, remove) {
  const result = new Uint8Array(mask), r2 = radius * radius;
  for (let py = Math.max(0, y - radius); py <= Math.min(height - 1, y + radius); py++) for (let px = Math.max(0, x - radius); px <= Math.min(width - 1, x + radius); px++) if ((px - x) ** 2 + (py - y) ** 2 <= r2) result[py * width + px] = remove ? 0 : 255;
  return result;
}

export function resizeSelection(mask, width, height, grow) {
  const result = new Uint8Array(mask);
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x, neighbors = [mask[i], mask[i - 1], mask[i + 1], mask[i - width], mask[i + width]];
    result[i] = grow ? (neighbors.some(Boolean) ? 255 : 0) : (neighbors.every(Boolean) ? 255 : 0);
  }
  return result;
}

function blurMask(mask, width, height, radius) {
  if (!radius) return mask; const result = new Uint8Array(mask.length), r = Math.min(20, radius);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { let sum = 0, count = 0; for (let d = -r; d <= r; d++) { const px = x + d; if (px >= 0 && px < width) { sum += mask[y * width + px]; count++; } } result[y * width + x] = sum / count; }
  const vertical = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { let sum = 0, count = 0; for (let d = -r; d <= r; d++) { const py = y + d; if (py >= 0 && py < height) { sum += result[py * width + x]; count++; } } vertical[y * width + x] = sum / count; }
  return vertical;
}

export function applyTransparency(image, mask, softness, feather) {
  const output = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), refined = blurMask(mask, image.width, image.height, Math.round((softness + feather) / 2));
  for (let i = 0; i < refined.length; i++) output.data[i * 4 + 3] = Math.round(output.data[i * 4 + 3] * (1 - refined[i] / 255));
  return output;
}

export function selectionBounds(mask, width, height) {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let i = 0; i < mask.length; i++) if (mask[i]) { const x = i % width, y = (i - x) / width; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  return maxX < 0 ? null : [minX / width, minY / height, (maxX - minX + 1) / width, (maxY - minY + 1) / height];
}

export async function imageDataFile(image, name) {
  const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height; canvas.getContext('2d').putImageData(image, 0, 0);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return new File([blob], `${name || 'cerceve'}-seffaf.png`, { type: 'image/png' });
}