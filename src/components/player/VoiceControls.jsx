import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

const connectionLabels = {
  connected: '🟢 Bağlandı',
  reconnecting: '🟡 Yeniden bağlanıyor…',
  connecting: '🟡 Bağlanıyor…',
  disconnected: '🔴 Bağlantı kesildi',
};

export default function VoiceControls({ voice }) {
  const speaking = voice.localSpeaking && voice.active && !voice.remoteMuted;
  const micLabel = voice.requesting ? 'HAZIRLANIYOR' : voice.remoteMuted ? 'YÖNETİCİ KAPATTI' : speaking ? 'KONUŞUYOR' : voice.active ? 'MİKROFONU KAPAT' : 'MİKROFONU AÇ';
  const control = 'flex min-w-[44px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-colors disabled:opacity-50';
  return <div className="flex flex-col gap-1 w-full">
    <div className="flex items-center gap-2">
      <button onClick={voice.toggleMute} disabled={voice.remoteMuted || voice.requesting || voice.connectionState !== 'connected' || voice.voiceEnabled === false} className={`${control} ${voice.active ? 'text-green-400' : 'text-white/80'}`}>
        <span className={`flex h-7 w-7 items-center justify-center rounded-full border ${voice.active ? 'border-green-400' : 'border-white/20'} ${speaking ? 'speaking-glow' : ''}`}>{voice.active ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}</span>
        <span className="max-w-24 text-center text-[8px] font-bold leading-tight">{micLabel}</span>
        <span className="text-[7px] leading-tight text-white/60">{connectionLabels[voice.connectionState]}</span>
      </button>
      <button onClick={voice.toggleDeafen} className={`${control} ${voice.deafened ? 'text-red-400' : 'text-white/80'}`}>
        <span className={`flex h-7 w-7 items-center justify-center rounded-full ${voice.deafened ? 'bg-primary text-primary-foreground' : 'bg-white/10'}`}>{voice.deafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</span>
        <span className="text-[8px] font-bold">{voice.deafened ? 'HOPARLÖR KAPALI' : 'HOPARLÖR AÇIK'}</span>
      </button>
    </div>
    {voice.error && <button onClick={voice.audioBlocked ? voice.retryAudio : undefined} className="w-full rounded-lg border border-destructive/40 bg-black/95 p-2 text-left text-[10px] leading-relaxed text-destructive-foreground shadow-xl">{voice.error}</button>}
  </div>;
}