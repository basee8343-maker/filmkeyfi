import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { X, Copy, UserPlus, MessageSquare, Mic, MicOff, UserMinus, Flag } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { useToast } from '@/components/ui/use-toast';
import { useCurrentUser } from '@/lib/useCurrentUser';

export default function UserProfileCard({ userId, roomId, canMod, voiceEnabled, onClose, onKick, onToggleMute, muted }) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [isFriend, setIsFriend] = useState(false);
  const [friendshipId, setFriendshipId] = useState(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!userId) return;
    base44.functions.invoke('user-profile', { user_id: userId }).then((res) => setProfile(res.data)).catch(() => {});
    if (user?.id && userId !== user.id) {
      base44.entities.Friendship.filter({ members: userId, status: 'accepted' }, '-created_date', 50)
        .then((friendships) => {
          const f = friendships.find((x) => x.members.includes(user.id));
          if (f) { setIsFriend(true); setFriendshipId(f.id); }
        }).catch(() => {});
    }
  }, [userId, user?.id]);

  const copyMemberId = async () => {
    const mid = profile?.member_id || userId;
    try { await navigator.clipboard.writeText(mid); toast({ title: 'Kimlik kopyalandı', description: mid }); }
    catch { toast({ title: 'Kopyalanamadı', variant: 'destructive' }); }
  };

  const addFriend = async () => {
    try { await base44.functions.invoke('friend-service', { action: 'request', target_id: userId }); toast({ title: 'Arkadaşlık isteği gönderildi' }); }
    catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const openChat = () => { if (friendshipId) window.location.href = `/arkadaslar?chat=${friendshipId}`; };

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
          <Link to={`/kullanici/${userId}`} onClick={onClose}>
            {profile.avatar ? <Image src={profile.avatar} className="w-10 h-10 rounded-full" fittingType="fill" /> : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-sm">{(profile.username || '?')[0]}</div>}
          </Link>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>
        <Link to={`/kullanici/${userId}`} onClick={onClose} className="block font-semibold text-sm mb-1 truncate hover:underline">{profile.username || profile.full_name || 'Kullanıcı'}</Link>
        <div className="flex items-center gap-1 mb-2.5">
          <span className="text-[10px] text-muted-foreground font-mono truncate">#{profile.member_id || userId?.slice(-8)}</span>
          <button onClick={copyMemberId} className="p-0.5 rounded hover:bg-secondary"><Copy className="w-3 h-3 text-muted-foreground" /></button>
        </div>
        <div className="space-y-1">
          {userId !== user?.id && !isFriend && <button onClick={addFriend} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-semibold"><UserPlus className="w-3.5 h-3.5" /> Arkadaş Ekle</button>}
          {userId !== user?.id && isFriend && <button onClick={openChat} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary text-xs font-semibold"><MessageSquare className="w-3.5 h-3.5" /> Mesaj Yaz</button>}
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