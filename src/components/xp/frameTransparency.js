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
        return Math.max(...rgb) - Math.min(...rgb) < 36 && palette.some((p) => colorDistance(rgb, p) < 58);
      };
      // Dama deseni JPEG içinde birbirinden kopuk karelere bölündüğü için tüm eşleşen
      // arka plan piksellerini doğrudan gerçek alpha şeffaflığına dönüştür.
      for (let i = 0; i < data.length; i += 4) {
        if (removable(i)) data[i + 3] = 0;
      }
      ctx.putImageData(pixels, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = reject;
    image.src = src;
  });
  cache.set(src, task);
  return task;
}