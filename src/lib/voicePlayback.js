let audioContext = null;

function getContext() {
  if (audioContext) return audioContext;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  audioContext = new AudioContext();
  return audioContext;
}

export async function unlockVoicePlayback() {
  const context = getContext();
  if (!context) throw new Error('Ses çıkışı desteklenmiyor.');
  if (context.state === 'suspended') await context.resume();
  if (context.state !== 'running') throw new Error('Ses çıkışı kullanıcı etkileşimi bekliyor.');
  return true;
}

export function createVoiceOutput(track, roomId) {
  const context = getContext();
  const mediaTrack = track.mediaStreamTrack;
  if (!context || !mediaTrack) {
    const element = track.attach();
    element.autoplay = true;
    element.playsInline = true;
    element.style.display = 'none';
    document.body.appendChild(element);
    return element;
  }

  const stream = new MediaStream([mediaTrack]);
  const source = context.createMediaStreamSource(stream);
  const gain = context.createGain();
  source.connect(gain).connect(context.destination);

  return {
    dataset: { livekitVoice: roomId, livekitTrack: track.sid },
    play: unlockVoicePlayback,
    remove() {
      source.disconnect();
      gain.disconnect();
      mediaTrack.stop?.();
    },
    get muted() { return gain.gain.value === 0; },
    set muted(value) { gain.gain.value = value ? 0 : 1; },
  };
}

if (typeof window !== 'undefined') {
  const unlock = () => { unlockVoicePlayback().catch(() => {}); };
  window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  window.addEventListener('touchend', unlock, { capture: true, passive: true });
  window.addEventListener('keydown', unlock, { capture: true });
}