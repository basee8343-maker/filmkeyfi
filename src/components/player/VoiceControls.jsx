import { AlertCircle, Headphones, Mic, MicOff, Volume2 } from 'lucide-react';

export default function VoiceControls({ voice }) {
  const speaking = voice.localSpeaking && !voice.muted && !voice.remoteMuted;
  return (
    <div className="shrink-0 px-4 py-3 bg-background/95 border-t border-border" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
      <div className="flex items-center gap-5">
        <button onClick={voice.toggleMute} disabled={voice.remoteMuted || !voice.active} className="flex flex-col items-center gap-1.5 disabled:opacity-50">
          <span className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all ${speaking ? 'border-green-400 bg-green-500/15 text-green-400 speaking-glow' : voice.muted || voice.remoteMuted ? 'border-border bg-secondary text-muted-foreground' : 'border-green-500/50 bg-green-500/10 text-green-400'}`}>
            {voice.muted || voice.remoteMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
          </span>
          <span className={`text-[10px] font-bold ${speaking ? 'text-green-400' : 'text-muted-foreground'}`}>{!voice.active ? 'HAZIRLANIYOR' : voice.remoteMuted ? 'SUSTURULDUNUZ' : speaking ? 'KONUŞUYOR' : voice.muted ? 'MİKROFON KAPALI' : 'MİKROFON AÇIK'}</span>
        </button>
        <button onClick={voice.toggleDeafen} className="flex flex-col items-center gap-1.5">
          <span className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${voice.deafened ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
            {voice.deafened ? <Volume2 className="w-7 h-7" /> : <Headphones className="w-7 h-7" />}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground">{voice.deafened ? 'SADECE FİLM SESİ' : 'ODA SESİ AÇIK'}</span>
        </button>
        <div className="h-12 w-px bg-border" />
        <span className="text-xs text-muted-foreground">{voice.active ? 'Bağlı' : 'Bağlanıyor...'}</span>
      </div>
      {voice.error && <p className="mt-2 text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {voice.error}</p>}
    </div>
  );
}