// Eski tarayıcılar için srcObject polyfill
// Bazı eski Android/iOS sürümleri srcObject desteklemez
export function setMediaStream(element, stream) {
  if (!element) return;
  try {
    if ('srcObject' in element) {
      element.srcObject = stream || null;
    } else if (stream) {
      element.src = window.URL?.createObjectURL(stream) || '';
    } else {
      element.removeAttribute('src');
    }
  } catch (error) {
    console.error('[WebRTC] Ses akışı audio elementine bağlanamadı', error);
  }
}