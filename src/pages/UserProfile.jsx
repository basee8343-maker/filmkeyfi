import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser, membershipActive } from '@/lib/useCurrentUser';
import { Image } from '@/components/ui/image';
import { ArrowLeft, Crown, Hash, MessageCircle, UserPlus, Copy, Flag } from 'lucide-react';
import ReportDialog from '@/components/ReportDialog';
import { useToast } from '@/components/ui/use-toast';

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useCurrentUser();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [relation, setRelation] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    base44.functions.invoke('user-profile', { user_id: id })
      .then((res) => setProfile(res.data))
      .catch((e) => setErr(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!me?.id || me.id === id) return;
    base44.entities.Friendship.list('-updated_date', 200)
      .then((items) => setRelation(items.find((item) => item.members?.includes(id)) || null));
  }, [id, me?.id]);

  const addFriend = async () => {
    setRequesting(true);
    try {
      const response = await base44.functions.invoke('friend-service', { action: 'request', user_id: id });
      setRelation(response.data.friendship);
      toast({ title: 'Arkadaşlık isteği gönderildi' });
    } catch (error) {
      toast({ title: 'İstek gönderilemedi', description: error.response?.data?.error || error.message, variant: 'destructive' });
    } finally { setRequesting(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const isSelf = me?.id === id;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Geri</button>
      {err ? <p className="text-center text-destructive py-10">{err}</p> : profile && (
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center text-center">
          {profile.avatar ? <Image src={profile.avatar} className="w-28 h-28 rounded-full object-cover" fittingType="fill" /> :
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-4xl font-bold">{(profile.username || profile.full_name || '?')[0]}</div>}
          <h1 className="text-2xl font-extrabold mt-4 flex items-center gap-2">{profile.title || profile.username || profile.full_name || 'Kullanıcı'} {(profile.role === 'admin' || profile.role === 'moderator') && <Crown className="w-5 h-5 text-amber-400" />}</h1>
          {profile.title && <p className="text-base font-semibold text-gradient mt-1">{profile.title}</p>}
          {profile.username && profile.username !== profile.title && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
          <div className="mt-4 inline-flex items-center gap-2 bg-secondary/60 rounded-full pl-4 pr-1.5 py-1.5">
            <Hash className="w-4 h-4 text-primary" />
            <span className="font-mono text-lg font-bold tracking-wider">{profile.member_id}</span>
            <button onClick={() => { navigator.clipboard?.writeText(profile.member_id || ''); toast({ title: 'Üye No kopyalandı' }); }} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 active:scale-95 transition"><Copy className="w-4 h-4" /></button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Üye No</p>
          {profile.created_date && <p className="text-xs text-muted-foreground mt-3">Katılım: {new Date(profile.created_date).toLocaleDateString('tr-TR')}</p>}
          {!isSelf && (!relation || ['removed', 'rejected'].includes(relation.status)) && <button onClick={addFriend} disabled={requesting} className="mt-5 inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"><UserPlus className="w-4 h-4" />{requesting ? 'Gönderiliyor...' : 'Arkadaş Ekle'}</button>}
          {!isSelf && relation?.status === 'pending' && <p className="mt-5 text-sm font-semibold text-amber-400">Arkadaşlık isteği bekliyor</p>}
          {!isSelf && relation?.status === 'accepted' && <div className="mt-5 flex flex-col items-center gap-3"><p className="text-sm font-semibold text-green-400">Arkadaşsınız</p><Link to={`/arkadaslar?view=chats&chat=${relation.id}`} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold"><MessageCircle className="w-4 h-4" /> Mesaj Yaz</Link></div>}
          {isSelf && <Link to="/profil" className="mt-5 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold">Profili Düzenle</Link>}
          {!isSelf && <button onClick={() => setReportOpen(true)} className="mt-3 inline-flex items-center gap-2 bg-destructive/10 text-destructive border border-destructive/20 px-4 py-2 rounded-lg text-sm font-semibold"><Flag className="w-4 h-4" /> Şikayet Et</button>}
        </div>
      )}
      {reportOpen && <ReportDialog targetId={id} targetName={profile?.username || profile?.full_name} context="profile" onClose={() => setReportOpen(false)} />}
    </div>
  );
}