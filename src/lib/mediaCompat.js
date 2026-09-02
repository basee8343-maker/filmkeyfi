// Eski tarayıcılar için srcObject polyfill
// Bazı eski Android/iOS sürümleri srcObject desteklemez
export function setMediaStream(element, stream) {
  if (!element) return;
  try {
    if ('srcObject' in element) {
      element.srcObject = stream;
    } else if (stream) {
      // Eski API: URL.createObjectURL
      element.src = window.URL?.createObjectURL(stream) || '';
    }
  } catch {}
}