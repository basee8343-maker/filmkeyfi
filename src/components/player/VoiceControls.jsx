import { Headphones, Mic, MicOff, Volume2 } from 'lucide-react';

export default function VoiceControls({ voice }) {
  const speaking = voice.localSpeaking && !voice.muted && !voice.remoteMuted;
  const control = 'flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-colors disabled:opacity-50';
  return <div className="flex items-center gap-1">
    <button onClick={voice.toggleMute} disabled={voice.remoteMuted || !voice.active} className={`${control} ${speaking ? 'text-green-400' : 'text-white/80'}`}>
      <span className={`flex h-7 w-7 items-center justify-center rounded-full border ${speaking ? 'border-green-400 speaking-glow' : 'border-white/20'}`}>{voice.muted || voice.remoteMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}</span>
      <span className="text-[8px] font-bold">{!voice.active ? 'HAZIRLANIYOR' : speaking ? 'KONUŞUYOR' : voice.muted || voice.remoteMuted ? 'MİKROFON KAPALI' : 'MİKROFON AÇIK'}</span>
    </button>
    <button onClick={voice.toggleDeafen} className={`${control} text-white/80`}>
      <span className={`flex h-7 w-7 items-center justify-center rounded-full ${voice.deafened ? 'bg-primary text-primary-foreground' : 'bg-white/10'}`}>{voice.deafened ? <Volume2 className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}</span>
      <span className="text-[8px] font-bold">{voice.deafened ? 'SADECE FİLM SESİ' : 'ODA SESİ AÇIK'}</span>
    </button>
  </div>;
}