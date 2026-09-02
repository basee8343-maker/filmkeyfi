import { Eye, EyeOff, Lock, MessageSquare, MessageSquareOff, Mic, MicOff, Unlock, X } from 'lucide-react';

export default function RoomSettingsMenu({ open, onClose, room, canMod, password, setPassword, passwordOpen, setPasswordOpen, onVoice, onChat, onHidden, onPassword, onRemovePassword }) {
  if (!open) return null;
  const button = 'w-full flex items-center gap-3 rounded-xl border border-border bg-secondary/60 px-3 py-3 text-sm font-semibold hover:bg-secondary transition-colors';
  return (
    <div className="absolute top-2 right-2 z-40 w-64 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between"><p className="font-bold">Oda Ayarları</p><button onClick={onClose} className="rounded-lg p-1.5 hover:bg-secondary"><X className="w-4 h-4" /></button></div>
      {!canMod ? <p className="text-sm text-muted-foreground">Bu ayarları yalnızca oda sahibi değiştirebilir.</p> : <div className="space-y-2">
        <button onClick={onVoice} className={button}>{room.voice_enabled ? <MicOff className="w-4 h-4 text-destructive" /> : <Mic className="w-4 h-4 text-green-400" />} {room.voice_enabled ? 'Sesli sohbeti kapat' : 'Sesli sohbeti aç'}</button>
        <button onClick={onChat} className={button}>{room.chat_enabled ? <MessageSquareOff className="w-4 h-4 text-destructive" /> : <MessageSquare className="w-4 h-4 text-green-400" />} {room.chat_enabled ? 'Sohbeti kapat' : 'Sohbeti aç'}</button>
        <button onClick={onHidden} className={button}>{room.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />} {room.hidden ? 'Odayı görünür yap' : 'Odayı gizle'}</button>
        <button onClick={() => room.password ? onRemovePassword() : setPasswordOpen(!passwordOpen)} className={button}>{room.password ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />} {room.password ? 'Şifreyi kaldır' : 'Şifre koy'}</button>
        {passwordOpen && !room.password && <div className="flex gap-2"><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Oda şifresi" className="min-w-0 flex-1 rounded-lg bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /><button onClick={onPassword} disabled={!password.trim()} className="rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50">KAYDET</button></div>}
      </div>}
    </div>
  );
}