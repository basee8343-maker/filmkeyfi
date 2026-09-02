import { Headphones, Mic, MicOff, Volume2 } from 'lucide-react';

export default function VoiceControls({ voice }) {
  const speaking = voice.localSpeaking && !voice.muted && !voice.remoteMuted;
  const permissionNeeded = voice.permissionState === 'prompt' || voice.permissionState === 'denied' || (!voice.permissionRemembered && voice.permissionState !== 'granted');
  const micLabel = voice.requesting ? 'HAZIRLANIYOR' : voice.permissionState === 'denied' ? 'İZİN KAPALI' : !voice.active && permissionNeeded ? '🎤 Mikrofon İzni Ver' : speaking ? 'KONUŞUYOR' : voice.active ? 'MİKROFON AÇIK' : 'MİKROFON KAPALI';
  const control = 'flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-colors disabled:opacity-50';
  return <div className="relative flex items-center gap-1">
    <button onClick={voice.toggleMute} disabled={voice.remoteMuted || voice.requesting} className={`${control} ${speaking ? 'text-green-400' : 'text-white/80'}`}>
      <span className={`flex h-7 w-7 items-center justify-center rounded-full border ${speaking ? 'border-green-400 speaking-glow' : 'border-white/20'}`}>{voice.active && !voice.remoteMuted ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}</span>
      <span className="max-w-24 text-center text-[8px] font-bold leading-tight">{micLabel}</span>
    </button>
    {voice.error && <div className="absolute bottom-16 left-0 w-72 rounded-lg border border-destructive/40 bg-black/95 p-2 text-[10px] leading-relaxed text-destructive-foreground shadow-xl">{voice.error}</div>}
    <button onClick={voice.toggleDeafen} className={`${control} text-white/80`}>
      <span className={`flex h-7 w-7 items-center justify-center rounded-full ${voice.deafened ? 'bg-primary text-primary-foreground' : 'bg-white/10'}`}>{voice.deafened ? <Volume2 className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}</span>
      <span className="text-[8px] font-bold">{voice.deafened ? 'SADECE FİLM SESİ' : 'ODA SESİ AÇIK'}</span>
    </button>
  </div>;
}