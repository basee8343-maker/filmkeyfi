const STORAGE_KEY = 'filmkeyfi_microphone_granted';

let currentStream = null;
let pendingRequest = null;
let permissionState = 'checking';
let permissionHandle = null;
const listeners = new Set();

const rememberGranted = () => {
  try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
};

export const wasMicrophoneGrantedBefore = () => {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
};

const publish = (state) => {
  permissionState = state;
  listeners.forEach((listener) => listener(state));
  return state;
};

export const subscribeToMicrophonePermission = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export async function checkMicrophonePermission() {
  if (!navigator.mediaDevices?.getUserMedia) return publish('unsupported');
  try {
    if (!navigator.permissions?.query) return publish('unknown');
    permissionHandle = await navigator.permissions.query({ name: 'microphone' });
    permissionHandle.onchange = () => publish(permissionHandle.state);
    return publish(permissionHandle.state);
  } catch {
    return publish('unknown');
  }
}

const hasLiveTrack = (stream) => stream?.getAudioTracks().some((track) => track.readyState === 'live');

export async function requestMicrophoneStream() {
  if (hasLiveTrack(currentStream)) return currentStream;
  if (pendingRequest) return pendingRequest;
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Mikrofon bu tarayıcıda desteklenmiyor.');

  pendingRequest = navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: false,
  }).then((stream) => {
    currentStream = stream;
    rememberGranted();
    publish('granted');
    return stream;
  }).catch(async (error) => {
    const checkedState = await checkMicrophonePermission();
    if (checkedState === 'denied' || error?.name === 'NotAllowedError') publish('denied');
    throw error;
  }).finally(() => {
    pendingRequest = null;
  });

  return pendingRequest;
}

export function stopMicrophoneStream(stream = currentStream) {
  stream?.getTracks().forEach((track) => track.stop());
  if (stream === currentStream) currentStream = null;
}

export function microphoneErrorMessage(error) {
  if (permissionState === 'denied' || error?.name === 'NotAllowedError') {
    return 'Mikrofon izni kapalı. Telefonunuzun Ayarlar bölümünden uygulamanın/tarayıcının Mikrofon iznini açabilirsiniz.';
  }
  return error?.message || 'Mikrofon başlatılamadı.';
}