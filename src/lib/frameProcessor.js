const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new window.Image();
  image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
  image.onerror = reject;
  image.src = url;
});

const colorDistance = (data, index, color) => Math.hypot(
  data[index] - color[0], data[index + 1] - color[1], data[index + 2] - color[2]
);

function removeEdgeBackground(data, width, height) {
  const corners = [0, width - 1, (height - 1) * width, width * height - 1];
  if (corners.every((pixel) => data[pixel * 4 + 3] < 32)) return;
  const color = [0, 1, 2].map((channel) => Math.round(corners.reduce((sum, pixel) => sum + data[pixel * 4 + channel], 0) / 4));
  const seen = new Uint8Array(width * height);
  const queue = [];
  const add = (pixel) => { if (pixel >= 0 && pixel < width * height && !seen[pixel]) { seen[pixel] = 1; queue.push(pixel); } };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const pixel = queue[cursor];
    const offset = pixel * 4;
    if (data[offset + 3] === 0 || colorDistance(data, offset, color) <= 72) {
      data[offset + 3] = 0;
      const x = pixel % width;
      if (x > 0) add(pixel - 1);
      if (x < width - 1) add(pixel + 1);
      add(pixel - width); add(pixel + width);
    }
  }
}

export async function processFrameFile(file, opening) {
  const image = await loadImage(file);
  const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  removeEdgeBackground(pixels.data, canvas.width, canvas.height);
  context.putImageData(pixels, 0, 0);
  const [x, y, width, height] = opening;
  context.globalCompositeOperation = 'destination-out';
  context.beginPath();
  context.ellipse((x + width / 2) * canvas.width, (y + height / 2) * canvas.height, width * canvas.width / 2, height * canvas.height / 2, 0, 0, Math.PI * 2);
  context.fill();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-seffaf.png`, { type: 'image/png' });
}