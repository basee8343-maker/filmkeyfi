import { Eye, Settings, MessageSquare, MessagesSquare, X } from 'lucide-react';
import VoiceControls from '@/components/player/VoiceControls';

export default function RoomControlPanel({ open, onClose, voice, voiceEnabled, unread, directUnread, settingsOpen, chatOpen, directOpen, viewersCount, onViewers, onSettings, onChat, onDirect }) {
  if (!open) return null;
  const btn = 'relative flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-white/80 hover:bg-white/10 hover:text-white transition-colors active:scale-95';
  const iconWrap = 'flex h-10 w-10 items-center justify-center rounded-full bg-white/10';
  return (
    <>
      <div onClick={onClose} className="absolute inset-0 z-[44] bg-black/40" />
      <div className="absolute left-0 top-0 bottom-0 z-[45] flex w-[260px] max-w-[80vw] flex-col bg-card/95 backdrop-blur-xl border-r border-border slide-in-left">
        <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-3 border-b border-border">
          <p className="font-bold text-sm">Kontroller</p>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1" />
        <div className="px-4 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-4 border-t border-border space-y-3">
          {voiceEnabled && (
            <div className="flex items-center justify-center gap-3 pb-3 border-b border-border">
              <VoiceControls voice={voice} />
            </div>
          )}
          <div className="grid grid-cols-4 gap-1">
            <button onClick={onViewers} className={btn}>
              <span className={iconWrap}><Eye className="w-5 h-5" /></span>
              <span className="text-[9px] font-bold leading-tight text-center">İZLEYİCİLER<br />({viewersCount})</span>
            </button>
            <button onClick={onSettings} className={`${btn} ${settingsOpen ? 'bg-white/15 text-white' : ''}`}>
              <span className={iconWrap}><Settings className="w-5 h-5" /></span>
              <span className="text-[9px] font-bold">AYARLAR</span>
            </button>
            <button onClick={onChat} className={`${btn} ${chatOpen ? 'bg-white/15 text-white' : ''}`}>
              <span className={iconWrap}><MessageSquare className="w-5 h-5" /></span>
              <span className="text-[9px] font-bold">SOHBET</span>
              {unread > 0 && <span className="absolute right-0 top-0 min-w-4 h-4 rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground flex items-center justify-center">{unread > 99 ? '99+' : unread}</span>}
            </button>
            <button onClick={onDirect} className={`${btn} ${directOpen ? 'bg-white/15 text-white' : ''}`}>
              <span className={iconWrap}><MessagesSquare className="w-5 h-5" /></span>
              <span className="text-[9px] font-bold">MESAJ</span>
              {directUnread > 0 && <span className="absolute right-0 top-0 min-w-4 h-4 rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground flex items-center justify-center">{directUnread > 99 ? '99+' : directUnread}</span>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}