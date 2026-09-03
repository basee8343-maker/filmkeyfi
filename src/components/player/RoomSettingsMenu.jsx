import { useState } from 'react';
import { Eye, EyeOff, Instagram, Lock, MessageCircle, MessageSquare, MessageSquareOff, Mic, MicOff, Unlock, X, Ban, UserX } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function RoomSettingsMenu({ open, onClose, room, canMod, password, setPassword, passwordOpen, setPasswordOpen, onVoice, onChat, onHidden, onPassword, onRemovePassword, onUnban }) {
  const { toast } = useToast();
  const [showBanned, setShowBanned] = useState(false);
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
    <div className="absolute bottom-24 right-3 z-[60] max-h-[calc(100dvh-7rem-max(env(safe-area-inset-top),1rem))] w-64 overflow-y-auto rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between"><p className="font-bold">Oda Ayarları</p><button onClick={onClose} className="rounded-lg p-1.5 hover:bg-secondary"><X className="w-4 h-4" /></button></div>
      {!canMod ? <p className="text-sm text-muted-foreground">Bu ayarları yalnızca oda sahibi değiştirebilir.</p> : <div className="space-y-2">
        <button onClick={onVoice} className={button}>{room.voice_enabled ? <MicOff className="w-4 h-4 text-destructive" /> : <Mic className="w-4 h-4 text-green-400" />} {room.voice_enabled ? 'Sesli sohbeti kapat' : 'Sesli sohbeti aç'}</button>
        <button onClick={onChat} className={button}>{room.chat_enabled ? <MessageSquareOff className="w-4 h-4 text-destructive" /> : <MessageSquare className="w-4 h-4 text-green-400" />} {room.chat_enabled ? 'Sohbeti kapat' : 'Sohbeti aç'}</button>
        <button onClick={onHidden} className={button}>{room.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />} {room.hidden ? 'Odayı görünür yap' : 'Odayı gizle'}</button>
        <button onClick={() => room.password ? onRemovePassword() : setPasswordOpen(!passwordOpen)} className={button}>{room.password ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />} {room.password ? 'Şifreyi kaldır' : 'Şifre koy'}</button>
        {passwordOpen && !room.password && <div className="flex gap-2"><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Oda şifresi" className="min-w-0 flex-1 rounded-lg bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /><button onClick={onPassword} disabled={!password.trim()} className="rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50">KAYDET</button></div>}
        <button onClick={() => setShowBanned(!showBanned)} className={button}><UserX className="w-4 h-4 text-red-400" /> Atılan Kullanıcılar ({bannedUsers.length})</button>
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
      <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-2"><button onClick={shareWhatsApp} className={button}><MessageCircle className="w-4 h-4 text-green-500" /> WhatsApp</button><button onClick={shareInstagram} className={button}><Instagram className="w-4 h-4 text-pink-500" /> Instagram</button></div>
    </div>
  );
}