const cache = new Map();
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const rgbAt = (data, pixel) => [data[pixel * 4], data[pixel * 4 + 1], data[pixel * 4 + 2]];

function palette(data, width, height, accepts) {
  const counts = new Map();
  for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) {
    if (!accepts(x, y)) continue;
    const key = rgbAt(data, y * width + x).map((v) => Math.round(v / 16) * 16).join(',');
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([key]) => key.split(',').map(Number));
}

export function makeTransparentFrame(src) {
  if (cache.has(src)) return cache.get(src);
  const task = new Promise((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data, width, height } = pixels;
      const cx = width / 2, cy = height / 2, unit = Math.min(width, height);
      const edge = palette(data, width, height, (x, y) => x < width * .06 || x > width * .94 || y < height * .06 || y > height * .94);
      const center = palette(data, width, height, (x, y) => Math.hypot(x - cx, y - cy) < unit * .25);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const pixel = y * width + x, rgb = rgbAt(data, pixel), radius = Math.hypot(x - cx, y - cy) / unit;
        const centerBg = radius < .235 && center.some((color) => distance(rgb, color) < 70);
        const edgeBg = radius > .34 && edge.some((color) => distance(rgb, color) < 48);
        if (radius < .185 || centerBg || edgeBg) data[pixel * 4 + 3] = 0;
      }
      ctx.putImageData(pixels, 0, 0);
      let minX = width, minY = height, maxX = -1, maxY = -1;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 24) {
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
      }
      if (maxX < minX || maxY < minY) return resolve(canvas.toDataURL('image/png'));
      const contentWidth = maxX - minX + 1, contentHeight = maxY - minY + 1;
      const outputSize = Math.ceil(Math.max(contentWidth, contentHeight) * 1.04);
      const output = document.createElement('canvas');
      output.width = outputSize; output.height = outputSize;
      const outputCtx = output.getContext('2d');
      outputCtx.drawImage(canvas, minX, minY, contentWidth, contentHeight, (outputSize - contentWidth) / 2, (outputSize - contentHeight) / 2, contentWidth, contentHeight);
      resolve(output.toDataURL('image/png'));
    };
    image.onerror = reject;
    image.src = src;
  });
  cache.set(src, task);
  return task;
}