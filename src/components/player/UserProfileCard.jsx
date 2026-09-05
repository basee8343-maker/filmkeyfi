import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Copy, UserPlus, MessageSquare, Mic, MicOff, UserMinus, Flag, Ban } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { useToast } from '@/components/ui/use-toast';
import { useCurrentUser } from '@/lib/useCurrentUser';
import ProfileFrame from '@/components/ProfileFrame';

export default function UserProfileCard({ userId, roomId, canMod, voiceEnabled, onClose, onKick, onToggleMute, onMessage, muted }) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [isFriend, setIsFriend] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!userId) return;
    base44.functions.invoke('user-profile', { user_id: userId }).then((res) => setProfile(res.data)).catch(() => {});
    if (user?.id && userId !== user.id) {
      base44.entities.Friendship.filter({ members: userId }, '-created_date', 50)
        .then((friendships) => {
          const relation = friendships.find((item) => item.members.includes(user.id));
          setIsFriend(relation?.status === 'accepted');
          setRequestSent(relation?.status === 'pending');
        }).catch(() => {});
    }
  }, [userId, user?.id]);

  const copyMemberId = async () => {
    const mid = profile?.member_id || userId;
    try { await navigator.clipboard.writeText(mid); toast({ title: 'Kimlik kopyalandı', description: mid }); }
    catch { toast({ title: 'Kopyalanamadı', variant: 'destructive' }); }
  };

  const addFriend = async () => {
    try { await base44.functions.invoke('friend-service', { action: 'request', user_id: userId }); setRequestSent(true); toast({ title: 'Arkadaşlık isteği gönderildi' }); }
    catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const openChat = () => { onMessage?.(userId); onClose?.(); };
  const blockUser = async () => {
    try {
      const blocked = [...new Set([...(user?.blocked_users || []), userId])];
      await base44.auth.updateMe({ blocked_users: blocked });
      toast({ title: 'Kullanıcı engellendi' }); onClose?.();
    } catch (e) { toast({ title: 'Engellenemedi', description: e.message, variant: 'destructive' }); }
  };

  const submitReport = (reason) => {
    base44.entities.Report.create({
      reporter_id: user.id, reporter_name: user.username || user.full_name,
      target_id: userId, target_name: profile?.username || profile?.full_name || 'Kullanıcı',
      context: 'room', context_id: roomId, reason, status: 'pending'
    }).then(() => { toast({ title: 'Şikayet gönderildi' }); setShowReport(false); })
      .catch(() => toast({ title: 'Şikayet başarısız', variant: 'destructive' }));
  };

  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-3 w-full max-w-[220px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div>{profile.profile_frame ? <ProfileFrame frame={profile.profile_frame} avatar={profile.avatar} name={profile.username || profile.full_name} size="sm" /> : profile.avatar ? <Image src={profile.avatar} className="w-10 h-10 rounded-full" fittingType="fill" /> : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-sm">{(profile.username || '?')[0]}</div>}</div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>
        <p className="font-semibold text-sm mb-1 truncate">{profile.username || profile.full_name || 'Kullanıcı'}</p>
        <div className="flex items-center gap-1 mb-2.5">
          <span className="text-[10px] text-muted-foreground font-mono truncate">#{profile.member_id || userId?.slice(-8)}</span>
          <button onClick={copyMemberId} className="p-0.5 rounded hover:bg-secondary"><Copy className="w-3 h-3 text-muted-foreground" /></button>
        </div>
        <div className="space-y-1">
          {userId !== user?.id && !isFriend && <button onClick={addFriend} disabled={requestSent} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-semibold disabled:opacity-50"><UserPlus className="w-3.5 h-3.5" /> {requestSent ? 'İstek Gönderildi' : 'Arkadaş Ekle'}</button>}
          {userId !== user?.id && (isFriend || user?.role === 'admin' || profile?.role === 'admin') && <button onClick={openChat} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary text-xs font-semibold"><MessageSquare className="w-3.5 h-3.5" /> Mesaj Yaz</button>}
          {userId !== user?.id && <button onClick={blockUser} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary text-xs font-semibold"><Ban className="w-3.5 h-3.5 text-red-400" /> Engelle</button>}
          {canMod && userId !== user?.id && voiceEnabled && <button onClick={() => onToggleMute?.(userId)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary text-xs font-semibold">{muted ? <><MicOff className="w-3.5 h-3.5 text-red-400" /> Mikrofonu Aç</> : <><Mic className="w-3.5 h-3.5 text-green-400" /> Mikrofonu Kapat</>}</button>}
          {canMod && userId !== user?.id && <button onClick={() => { onKick?.(userId); onClose(); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold"><UserMinus className="w-3.5 h-3.5" /> Odadan At</button>}
          {userId !== user?.id && <button onClick={() => setShowReport(!showReport)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary text-xs font-semibold"><Flag className="w-3.5 h-3.5" /> Şikayet Et</button>}
        </div>
        {showReport && (
          <div className="mt-2 pt-2 border-t border-border space-y-1">
            {['Spam', 'Taciz', 'Uygunsuz İçerik', 'Diğer'].map((r) => (
              <button key={r} onClick={() => submitReport(r)} className="w-full text-left px-2 py-1 rounded text-xs hover:bg-secondary">{r}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}