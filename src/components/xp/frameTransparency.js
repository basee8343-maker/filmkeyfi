const cache = new Map();
const resolvedCache = new Map();
const metricsCache = new Map();
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const rgbAt = (data, pixel) => [data[pixel * 4], data[pixel * 4 + 1], data[pixel * 4 + 2]];

function palette(data, width, height, accepts) {
  const counts = new Map();
  for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) {
    if (!accepts(x, y)) continue;
    const pixel = y * width + x;
    if (data[pixel * 4 + 3] < 200) continue;
    const key = rgbAt(data, pixel).map((value) => Math.round(value / 16) * 16).join(',');
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([key]) => key.split(',').map(Number));
}

function findOpening(data, width, height) {
  const unit = Math.min(width, height);
  let best = { x: width / 2, y: height * .48, radius: unit * .25 };
  const step = Math.max(4, Math.round(unit / 42));
  const rayCount = 40;
  for (let cy = height * .34; cy <= height * .61; cy += step) {
    for (let cx = width * .36; cx <= width * .64; cx += step) {
      if (data[(Math.round(cy) * width + Math.round(cx)) * 4 + 3] > 48) continue;
      const rays = [];
      for (let ray = 0; ray < rayCount; ray++) {
        const angle = (ray / rayCount) * Math.PI * 2;
        let radius = 2;
        for (; radius < unit * .44; radius += 3) {
          const x = Math.round(cx + Math.cos(angle) * radius);
          const y = Math.round(cy + Math.sin(angle) * radius);
          if (x < 0 || x >= width || y < 0 || y >= height || data[(y * width + x) * 4 + 3] > 56) break;
        }
        rays.push(radius);
      }
      rays.sort((a, b) => a - b);
      const radius = rays[Math.floor(rayCount * .22)];
      if (radius > best.radius) best = { x: cx, y: cy, radius };
    }
  }
  return best;
}

const frameCacheKey = (src, crop) => `v3|${src}|${crop ? `${crop.col},${crop.row},${crop.columns},${crop.rows}` : 'full'}`;
export const getTransparentFrame = (src, crop) => resolvedCache.get(frameCacheKey(src, crop)) || '';
export const getFrameMetrics = (src, crop) => metricsCache.get(frameCacheKey(src, crop)) || null;

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
      let transparentSamples = 0, totalSamples = 0;
      for (let y = 0; y < height; y += 4) for (let x = 0; x < width; x += 4) {
        totalSamples++;
        if (data[(y * width + x) * 4 + 3] < 200) transparentSamples++;
      }

      if (transparentSamples / totalSamples < .01) {
        const guessX = width / 2, guessY = height * (crop?.centerY || .5);
        const edgeBackground = palette(data, width, height, (x, y) => x < width * .06 || x > width * .94 || y < height * .06 || y > height * .94).slice(0, 5);
        const centerBackground = palette(data, width, height, (x, y) => Math.hypot(x - guessX, y - guessY) < unit * .2).slice(0, 4);
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
          const pixel = y * width + x;
          const rgb = rgbAt(data, pixel);
          const radius = Math.hypot(x - guessX, y - guessY) / unit;
          const edgeDistance = edgeBackground.length ? Math.min(...edgeBackground.map((color) => distance(rgb, color))) : 999;
          const centerDistance = centerBackground.length ? Math.min(...centerBackground.map((color) => distance(rgb, color))) : 999;
          const nearEdge = x < width * .13 || x > width * .87 || y < height * .13 || y > height * .87;
          if ((nearEdge && edgeDistance < 42) || radius < (crop?.innerRadius || .18) || (radius < .31 && centerDistance < 48)) data[pixel * 4 + 3] = 0;
        }
        ctx.putImageData(pixels, 0, 0);
      }

      const opening = findOpening(data, width, height);
      let minX = width, minY = height, maxX = -1, maxY = -1;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 24) {
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
      }
      if (maxX < minX || maxY < minY || crop) {
        metricsCache.set(cacheKey, { avatarScale: 1, openingX: .5, openingY: .5 });
        return resolve(canvas.toDataURL('image/png'));
      }
      const halfExtent = Math.max(opening.x - minX, maxX - opening.x, opening.y - minY, maxY - opening.y);
      const outputSize = Math.ceil(halfExtent * 2 * 1.04);
      const output = document.createElement('canvas');
      output.width = outputSize; output.height = outputSize;
      output.getContext('2d').drawImage(canvas, outputSize / 2 - opening.x, outputSize / 2 - opening.y);
      const avatarScale = Math.min(1.34, Math.max(.68, (opening.radius * 2 / outputSize) * 1.68 * .94));
      metricsCache.set(cacheKey, { avatarScale, openingX: .5, openingY: .5 });
      resolve(output.toDataURL('image/png'));
    };
    image.onerror = reject;
    image.src = src;
  });
  cache.set(cacheKey, task);
  task.then((url) => resolvedCache.set(cacheKey, url));
  return task;
}