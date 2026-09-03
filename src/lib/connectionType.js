// Bağlantı türü tespiti (Wi-Fi / Mobil Veri) — Network Information API.
// iOS Safari'de bu API yok; bu durumda 'unknown' döner.
export function detectConnectionType() {
  try {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (c) {
      if (c.type === 'wifi') return 'wifi';
      if (c.type === 'cellular') return 'cellular';
      if (c.type === 'ethernet') return 'ethernet';
      const et = c.effectiveType;
      if (et === 'slow-2g' || et === '2g' || et === '3g') return 'cellular';
    }
  } catch {}
  return 'unknown';
}