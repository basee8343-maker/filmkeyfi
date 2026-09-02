import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Image } from '@/components/ui/image';
import { Ban, Trash2, X, Loader2 } from 'lucide-react';

export default function ChatUserMenu({ userId, userName, userAvatar, roomId, onClose }) {
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'ban' | 'delete' | null
  const menuRef = useRef(null);

  useEffect(() => {
    base44.functions.invoke('user-profile', { user_id: userId }).then((response) => setProfile(response.data)).catch(() => {});
  }, [userId]);

  const suspendUser = async () => {
    setLoading(true);
    try {
      await base44.entities.User.update(userId, { role: 'banned', membership_status: 'suspended' });
      await base44.entities.Notification.create({ user_id: userId, title: 'Hesabınız askıya alındı', body: 'Hesabınız yönetici tarafından askıya alınmıştır. Giriş yapamazsınız.', type: 'suspended' }).catch(() => {});
      if (roomId) await base44.functions.invoke('room-presence', { action: 'kick', room_id: roomId, target_id: userId }).catch(() => {});
      toast({ title: 'Kullanıcı askıya alındı', description: `${userName} artık giriş yapamaz` });
      onClose();
    } catch (e) {
      toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const deleteUser = async () => {
    setLoading(true);
    try {
      if (roomId) await base44.functions.invoke('room-presence', { action: 'kick', room_id: roomId, target_id: userId }).catch(() => {});
      await base44.entities.User.delete(userId);
      toast({ title: 'Hesap silindi', description: `${userName} kalıcı olarak silindi` });
      onClose();
    } catch (e) {
      toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div ref={menuRef} className="w-full max-w-xs bg-card border border-border rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="font-bold text-sm">Kullanıcı Yönetimi</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-4 py-4 flex flex-col items-center text-center border-b border-border">
          {userAvatar ? <Image src={userAvatar} className="w-14 h-14 rounded-full object-cover mb-2" fittingType="fill" /> : <span className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-lg font-bold mb-2">{(userName || '?')[0]}</span>}
          <p className="font-semibold text-sm">{userName}</p>
          {profile?.member_id && <p className="text-xs text-muted-foreground">Üye #{profile.member_id}</p>}
          {profile?.title && <p className="text-xs text-amber-400 font-medium mt-0.5">{profile.title}</p>}
        </div>

        {!confirm ? (
          <div className="p-3 space-y-2">
            <button onClick={() => setConfirm('ban')} disabled={loading} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 text-sm font-semibold disabled:opacity-50">
              <Ban className="w-4 h-4" /> Askıya Al
            </button>
            <button onClick={() => setConfirm('delete')} disabled={loading} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 text-sm font-semibold disabled:opacity-50">
              <Trash2 className="w-4 h-4" /> Hesabı Sil
            </button>
          </div>
        ) : (
          <div className="p-4">
            <p className="text-sm text-center mb-3">
              {confirm === 'ban' ? `${userName} kullanıcısını askıya almak istediğinize emin misiniz? Giriş yapamaz.` : `${userName} kullanıcısının hesabını kalıcı olarak silmek istediğinize emin misiniz?`}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirm(null)} disabled={loading} className="flex-1 py-2 rounded-lg bg-secondary text-sm font-medium">İptal</button>
              <button onClick={confirm === 'ban' ? suspendUser : deleteUser} disabled={loading} className={`flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1.5 ${confirm === 'ban' ? 'bg-amber-500' : 'bg-red-500'}`}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (confirm === 'ban' ? <Ban className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />)}
                {confirm === 'ban' ? 'Askıya Al' : 'Sil'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}