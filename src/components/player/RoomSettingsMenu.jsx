import { useState, useRef } from 'react';
import { Eye, EyeOff, Instagram, Lock, MessageCircle, MessageSquare, MessageSquareOff, Mic, MicOff, Unlock, X, Ban, UserX, Film, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function RoomSettingsMenu({ open, onClose, room, canMod, participants, roomModerators, onAssignMod, onRemoveMod, roomName, setRoomName, onSaveName, password, setPassword, passwordOpen, setPasswordOpen, onVoice, onChat, onHidden, onPassword, onRemovePassword, onUnban, onPickMovie }) {
  const { toast } = useToast();
  const [showBanned, setShowBanned] = useState(false);
  const [showMods, setShowMods] = useState(false);
  const touchStart = useRef({ x: 0, y: 0 });
  if (!open) return null;
  const button = 'w-full flex items-center gap-3 rounded-xl border border-border bg-secondary/60 px-3 py-3 text-sm font-semibold hover:bg-secondary transition-colors';
  const shareText = `FILMKEYFİ odasına katıl: ${window.location.href}`;
  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
  const shareInstagram = async () => {
    if (navigator.share) await navigator.share({ title: room.name, text: 'FILMKEYFİ odasına katıl', url: window.location.href }).catch(() => {});
    else { await navigator.clipboard?.writeText(window.location.href); window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer'); }
  };
  const bannedUsers = room.banned_users || [];

  const handleUnban = async (userId, name) => {
    try { await onUnban(userId); toast({ title: `${name} için yasak kaldırıldı` }); }
    catch (e) { toast({ title: 'İşlem başarısız', variant: 'destructive' }); }
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 z-[65] flex w-full max-w-sm flex-col border-l border-border bg-card/95 pt-[max(env(safe-area-inset-top),0.75rem)] pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-2xl backdrop-blur-xl slide-in-left"
      onTouchStart={(e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touchStart.current.x; const dy = e.changedTouches[0].clientY - touchStart.current.y; if (dx > 80 && dx > Math.abs(dy) * 1.5) onClose(); }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border"><p className="font-bold">Oda Ayarları</p><button onClick={onClose} className="rounded-lg p-1.5 hover:bg-secondary"><X className="w-4 h-4" /></button></div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}>
      {!canMod ? <p className="text-sm text-muted-foreground">Bu ayarları yalnızca oda sahibi değiştirebilir.</p> : <div className="space-y-2">
        <div className="flex gap-2">
          <input value={roomName || ''} onChange={(e) => setRoomName(e.target.value)} placeholder="Oda adı" className="min-w-0 flex-1 rounded-lg bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" maxLength={80} />
          <button onClick={onSaveName} disabled={!roomName?.trim()} className="rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50 shrink-0">KAYDET</button>
        </div>
        <button onClick={onPickMovie} className={button}><Film className="w-4 h-4 text-primary" /> Film Değiştir</button>
        <button onClick={onVoice} className={button}>{room.voice_enabled ? <MicOff className="w-4 h-4 text-destructive" /> : <Mic className="w-4 h-4 text-green-400" />} {room.voice_enabled ? 'Sesli sohbeti kapat' : 'Sesli sohbeti aç'}</button>
        <button onClick={onChat} className={button}>{room.chat_enabled ? <MessageSquareOff className="w-4 h-4 text-destructive" /> : <MessageSquare className="w-4 h-4 text-green-400" />} {room.chat_enabled ? 'Sohbeti kapat' : 'Sohbeti aç'}</button>
        <button onClick={onHidden} className={button}>{room.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />} {room.hidden ? 'Odayı görünür yap' : 'Odayı gizle'}</button>
        <button onClick={() => room.password ? onRemovePassword() : setPasswordOpen(!passwordOpen)} className={button}>{room.password ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />} {room.password ? 'Şifreyi kaldır' : 'Şifre koy'}</button>
        {passwordOpen && !room.password && <div className="flex gap-2"><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Oda şifresi" className="min-w-0 flex-1 rounded-lg bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /><button onClick={onPassword} disabled={!password.trim()} className="rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50">KAYDET</button></div>}
        <button onClick={() => setShowBanned(!showBanned)} className={button}><UserX className="w-4 h-4 text-red-400" /> Atılan Kullanıcılar ({bannedUsers.length})</button>
        {canMod && participants && participants.length > 1 && (
          <>
            <button onClick={() => setShowMods(!showMods)} className={button}><Shield className="w-4 h-4 text-blue-400" /> Moderatörler ({roomModerators.length})</button>
            {showMods && (
              <div className="rounded-xl border border-border bg-secondary/40 p-2 space-y-1.5 max-h-40 overflow-y-auto">
                {participants.filter((p) => p.user_id !== room.owner_id).map((p) => {
                  const isMod = roomModerators.includes(p.user_id);
                  return (
                    <div key={p.user_id} className="flex items-center justify-between gap-2">
                      <span className="text-xs truncate flex-1">{p.name}</span>
                      <button onClick={() => isMod ? onRemoveMod(p.user_id) : onAssignMod(p.user_id)} className={`text-[10px] px-2 py-1 rounded-lg font-bold shrink-0 ${isMod ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'}`}>{isMod ? 'Mod Kaldır' : 'Mod Yap'}</button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        {showBanned && (
          <div className="rounded-xl border border-border bg-secondary/40 p-2 space-y-1.5 max-h-40 overflow-y-auto">
            {bannedUsers.length === 0 ? <p className="text-xs text-muted-foreground text-center py-2">Atılmış kullanıcı yok.</p> :
              bannedUsers.map((b) => (
                <div key={b.user_id} className="flex items-center justify-between gap-2">
                  <span className="text-xs truncate flex-1">{b.name || 'Kullanıcı'}</span>
                  <button onClick={() => handleUnban(b.user_id, b.name)} className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded-lg font-bold hover:bg-green-500/30 shrink-0">Yasağı Kaldır</button>
                </div>
              ))
            }
          </div>
        )}
      </div>}
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-border p-3"><button onClick={shareWhatsApp} className={button}><MessageCircle className="w-4 h-4 text-green-500" /> WhatsApp</button><button onClick={shareInstagram} className={button}><Instagram className="w-4 h-4 text-pink-500" /> Instagram</button></div>
    </div>
  );
}