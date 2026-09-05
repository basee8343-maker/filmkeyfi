const cache = new Map();
const colorDistance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export function makeTransparentFrame(src) {
  if (cache.has(src)) return cache.get(src);
  const task = new Promise((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data, width, height } = pixels;
      const paletteCounts = new Map();
      const cx = width / 2, cy = height / 2, radius = Math.min(width, height) * .22;
      for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) {
        const edge = x < width * .08 || x > width * .92 || y < height * .08 || y > height * .92;
        const center = Math.hypot(x - cx, y - cy) < radius;
        if (!edge && !center) continue;
        const i = (y * width + x) * 4, rgb = [data[i], data[i + 1], data[i + 2]];
        if (Math.max(...rgb) - Math.min(...rgb) > 20) continue;
        const key = rgb.map((v) => Math.round(v / 12) * 12).join(',');
        paletteCounts.set(key, (paletteCounts.get(key) || 0) + 1);
      }
      const palette = [...paletteCounts].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k.split(',').map(Number));
      const removable = (i) => {
        const rgb = [data[i], data[i + 1], data[i + 2]];
        return Math.max(...rgb) - Math.min(...rgb) < 24 && palette.some((p) => colorDistance(rgb, p) < 38);
      };
      const seen = new Uint8Array(width * height), queue = [];
      const seed = (x, y) => { const p = y * width + x; if (!seen[p] && removable(p * 4)) { seen[p] = 1; queue.push(p); } };
      for (let x = 0; x < width; x++) { seed(x, 0); seed(x, height - 1); }
      for (let y = 0; y < height; y++) { seed(0, y); seed(width - 1, y); }
      for (let y = Math.floor(cy - radius); y <= cy + radius; y++) for (let x = Math.floor(cx - radius); x <= cx + radius; x++) if (Math.hypot(x - cx, y - cy) < radius) seed(x, y);
      for (let q = 0; q < queue.length; q++) { const p = queue[q], x = p % width, y = Math.floor(p / width); data[p * 4 + 3] = 0; if (x) seed(x - 1, y); if (x + 1 < width) seed(x + 1, y); if (y) seed(x, y - 1); if (y + 1 < height) seed(x, y + 1); }
      ctx.putImageData(pixels, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = reject;
    image.src = src;
  });
  cache.set(src, task);
  return task;
}