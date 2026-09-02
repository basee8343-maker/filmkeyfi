import { ArrowLeft, Eye, MessagesSquare, MessageSquare, Settings } from 'lucide-react';
import VoiceControls from '@/components/player/VoiceControls';

export default function PartyControlBar({ voice, voiceEnabled, viewerCount, unread, directUnread, settingsOpen, chatOpen, directOpen, onBack, onViewers, onSettings, onChat, onDirect }) {
  const control = 'relative flex min-w-[44px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors';
  return (
    <div className="absolute inset-x-0 bottom-0 z-50 flex w-full items-center justify-between border-t border-white/10 bg-black/95 px-3 py-2 backdrop-blur-xl sm:px-4" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
      <div className="flex items-center gap-2">
        <button onClick={onBack} className={control}><ArrowLeft className="w-5 h-5" /><span className="text-[8px] font-bold">GERİ</span></button>
        {voiceEnabled && <VoiceControls voice={voice} />}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onViewers} className={control} aria-label={`${viewerCount} izleyici`}><span className="flex items-center gap-1"><Eye className="w-5 h-5" /><b className="text-xs">{viewerCount}</b></span></button>
        <button onClick={onSettings} className={`${control} ${settingsOpen ? 'bg-white/15 text-white' : ''}`}><Settings className="w-5 h-5" /><span className="text-[8px] font-bold">AYARLAR</span></button>
        <button onClick={onChat} className={`${control} ${chatOpen ? 'bg-white/15 text-white' : ''}`}><MessageSquare className="w-5 h-5" /><span className="text-[8px] font-bold">CHAT</span>{unread > 0 && <span className="absolute right-0 top-0 min-w-4 rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">{unread > 99 ? '99+' : unread}</span>}</button>
        <button onClick={onDirect} className={`${control} ${directOpen ? 'bg-white/15 text-white' : ''}`}><MessagesSquare className="w-5 h-5" /><span className="text-[8px] font-bold">MESAJ</span>{directUnread > 0 && <span className="absolute right-0 top-0 min-w-4 rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">{directUnread > 99 ? '99+' : directUnread}</span>}</button>
      </div>
    </div>
  );
}