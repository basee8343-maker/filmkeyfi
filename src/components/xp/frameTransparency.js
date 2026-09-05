const cache = new Map();
const resolvedCache = new Map();
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const rgbAt = (data, pixel) => [data[pixel * 4], data[pixel * 4 + 1], data[pixel * 4 + 2]];

function palette(data, width, height, accepts) {
  const counts = new Map();
  for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) {
    if (!accepts(x, y)) continue;
    const key = rgbAt(data, y * width + x).map((v) => Math.round(v / 16) * 16).join(',');
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 24).map(([key]) => key.split(',').map(Number));
}

const frameCacheKey = (src, crop) => `${src}|${crop ? `${crop.col},${crop.row},${crop.columns},${crop.rows}` : 'full'}`;
export const getTransparentFrame = (src, crop) => resolvedCache.get(frameCacheKey(src, crop)) || '';

export function makeTransparentFrame(src, crop) {
  const cacheKey = frameCacheKey(src, crop);
  if (resolvedCache.has(cacheKey)) return Promise.resolve(resolvedCache.get(cacheKey));
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const task = new Promise((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const columns = crop?.columns || 1, rows = crop?.rows || 1;
      const sourceWidth = image.naturalWidth / columns, sourceHeight = image.naturalHeight / rows;
      canvas.width = Math.round(sourceWidth); canvas.height = Math.round(sourceHeight);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, (crop?.col || 0) * sourceWidth, (crop?.row || 0) * sourceHeight, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data, width, height } = pixels;
      const unit = Math.min(width, height);
      const guessX = width / 2, guessY = height * (crop?.centerY || .5);
      const edge = palette(data, width, height, (x, y) => x < width * .08 || x > width * .92 || y < height * .08 || y > height * .92);
      const center = palette(data, width, height, (x, y) => Math.hypot(x - guessX, y - guessY) < unit * .28);
      const edgeBackground = edge.slice(0, 8), centerBackground = center.slice(0, 6);
      let sumX = 0, sumY = 0, centerCount = 0;
      for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) {
        if (Math.hypot(x - guessX, y - guessY) > unit * .34) continue;
        const rgb = rgbAt(data, y * width + x);
        if (centerBackground.some((color) => distance(rgb, color) < 84)) { sumX += x; sumY += y; centerCount++; }
      }
      const cx = centerCount ? sumX / centerCount : guessX;
      const cy = centerCount ? sumY / centerCount : guessY;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const pixel = y * width + x, rgb = rgbAt(data, pixel), radius = Math.hypot(x - cx, y - cy) / unit;
        const innerRadius = crop?.innerRadius || .185;
        const centerDistance = Math.min(...centerBackground.map((color) => distance(rgb, color)));
        const edgeDistance = Math.min(...edgeBackground.map((color) => distance(rgb, color)));
        if (edgeDistance < 82 || radius < innerRadius || (radius < innerRadius + .12 && centerDistance < 92)) data[pixel * 4 + 3] = 0;
        else if (edgeDistance < 112) data[pixel * 4 + 3] = Math.min(data[pixel * 4 + 3], Math.round((edgeDistance - 82) * 8.5));
      }
      ctx.putImageData(pixels, 0, 0);
      if (crop) return resolve(canvas.toDataURL('image/png'));
      let minX = width, minY = height, maxX = -1, maxY = -1;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 24) {
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
      }
      if (maxX < minX || maxY < minY) return resolve(canvas.toDataURL('image/png'));
      const halfExtent = Math.max(cx - minX, maxX - cx, cy - minY, maxY - cy);
      const outputSize = Math.ceil(halfExtent * 2 * 1.04);
      const output = document.createElement('canvas');
      output.width = outputSize; output.height = outputSize;
      const outputCtx = output.getContext('2d');
      outputCtx.drawImage(canvas, outputSize / 2 - cx, outputSize / 2 - cy);
      resolve(output.toDataURL('image/png'));
    };
    image.onerror = reject;
    image.src = src;
  });
  cache.set(cacheKey, task);
  task.then((url) => resolvedCache.set(cacheKey, url));
  return task;
}