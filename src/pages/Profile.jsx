import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Image } from '@/components/ui/image';
import { User, Crown, Clock, Heart, List, Settings, RefreshCw, Camera, LogOut, Trash2, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';
import BlockedUsers from '@/components/profile/BlockedUsers';

export default function Profile() {
  const { user, setUser, reload } = useCurrentUser();
  const { toast } = useToast();
  const [tab, setTab] = useState('info');
  const [pkg, setPkg] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyMovies, setHistoryMovies] = useState([]);
  const [list, setList] = useState([]);
  const [favs, setFavs] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: '', full_name: '', phone: '', avatar: '' });

  useEffect(() => {
    if (!user) return;
    setForm({ username: user.username || '', full_name: user.full_name || '', phone: user.phone || '', avatar: user.avatar || '' });
    if (!user.member_id) base44.functions.invoke('ensure-member-id').then(() => reload()).catch(() => {});
    if (user.package_id) base44.entities.Package.get(user.package_id).then(setPkg).catch(() => {});
    base44.entities.WatchHistory.filter({ user_id: user.id }, '-created_date', 20).then(async (h) => {
      setHistory(h);
      const hm = await Promise.all(h.map((w) => base44.entities.Movie.get(w.movie_id).catch(() => null)));
      setHistoryMovies(hm.filter(Boolean));
    }).catch(() => {});
    loadList();
  }, [user?.id]);

  const loadList = async () => {
    const wl = await base44.entities.Watchlist.filter({ user_id: user.id }, '-created_date', 50).catch(() => []);
    const movies = await Promise.all(wl.map((w) => base44.entities.Movie.get(w.movie_id).catch(() => null)));
    setList(movies.filter(Boolean));
    const fl = await base44.entities.Favorite.filter({ user_id: user.id }, '-created_date', 50).catch(() => []);
    const fmovies = await Promise.all(fl.map((w) => base44.entities.Movie.get(w.movie_id).catch(() => null)));
    setFavs(fmovies.filter(Boolean));
  };

  const save = async () => {
    try {
      await base44.functions.invoke('update-profile', {
        username: form.username, phone: form.phone, avatar: form.avatar, full_name: form.full_name
      });
      await reload();
      setEditing(false);
      toast({ title: 'Profil güncellendi' });
    } catch (err) { toast({ title: 'Hata', description: err.message, variant: 'destructive' }); }
  };

  const onAvatar = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const { file_url } = await base44.integrations.Core.UploadFile({ file }); setForm((f) => ({ ...f, avatar: file_url })); }
    catch (err) { toast({ title: 'Yükleme hatası', variant: 'destructive' }); }
  };

  const clearHistory = async () => {
    try {
      await base44.entities.WatchHistory.deleteMany({ user_id: user.id });
      setHistory([]); setHistoryMovies([]);
      toast({ title: 'İzleme geçmişi temizlendi' });
    } catch (err) { toast({ title: 'Hata', description: err.message, variant: 'destructive' }); }
  };

  const renew = async () => {
    try {
      await base44.entities.MembershipRenewal.create({ user_id: user.id, user_name: user.username || user.full_name, current_package: pkg?.name || 'Yok', requested_package: pkg?.name || 'STANDARD', status: 'pending' });
      await base44.entities.Notification.create({ user_id: user.id, title: 'Yenileme talebiniz alındı', body: 'Talebiniz admin onayı bekliyor.', type: 'info' });
      toast({ title: 'Yenileme talebi gönderildi' });
    } catch (err) { toast({ title: 'Hata', variant: 'destructive' }); }
  };

  if (!user) return <div className="p-6">Yükleniyor...</div>;
  const expired = user.membership_end && new Date(user.membership_end) < new Date();

  const tabs = [
    { id: 'info', label: 'Bilgilerim', icon: User },
    { id: 'history', label: 'İzleme Geçmişi', icon: Clock },
    { id: 'list', label: 'Listem', icon: List },
    { id: 'favs', label: 'Favoriler', icon: Heart },
    { id: 'blocked', label: 'Engellenenler', icon: Ban },
  ];

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6">
        <div className="relative">
          {user.avatar ? <Image src={user.avatar} className="w-24 h-24 rounded-full object-cover" fittingType="fill" /> :
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl font-bold">{(user.username || user.full_name || '?')[0]}</div>}
          {editing && <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer"><Camera className="w-4 h-4" /><input type="file" accept="image/*" className="hidden" onChange={onAvatar} /></label>}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-extrabold flex items-center gap-2 justify-center sm:justify-start">{user.title || user.username || user.full_name} {(user.role === 'admin' || user.role === 'moderator') && <Crown className="w-5 h-5 text-amber-400" />}</h1>
          {user.title && <p className="text-base font-semibold text-gradient">{user.title}</p>}
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
            <span className={`text-xs px-2 py-1 rounded ${user.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : user.membership_status === 'active' && !expired ? 'bg-green-500/20 text-green-400' : 'bg-destructive/20 text-destructive'}`}>
              {user.role === 'admin' ? 'Kurucu · Süresiz' : user.membership_status === 'pending' ? 'Onay Bekliyor' : expired ? 'Süresi Doldu' : user.membership_status === 'active' ? 'Aktif Üyelik' : user.membership_status}
            </span>
            {pkg && <span className="text-xs px-2 py-1 rounded bg-accent/20 text-accent-foreground">{pkg.name}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {user.role === 'admin' && <Link to="/admin" className="bg-secondary px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1"><Crown className="w-4 h-4 text-amber-400" /> Admin Panel</Link>}
          <button onClick={() => base44.auth.logout('/login')} className="bg-secondary px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1"><LogOut className="w-4 h-4" /> Çıkış</button>
        </div>
      </div>

      {user.membership_status === 'pending' && (
        <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-center justify-between flex-wrap gap-2">
          <span>Aboneliğinizi aktif etmek için ödeme yapın. Ödeme sonrası aboneliğiniz otomatik aktif olur.</span>
          <Link to="/abonelik" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap">Abonelik Seç</Link>
        </div>
      )}
      {expired && (
        <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center justify-between flex-wrap gap-2">
          <span>Üyeliğinizin süresi doldu.</span>
          <button onClick={renew} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><RefreshCw className="w-4 h-4" /> Üyeliği Yenile</button>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
        {tabs.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap flex items-center gap-1.5 ${tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}><t.icon className="w-4 h-4" /> {t.label}</button>)}
      </div>

      {tab === 'info' && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          {editing ? (
            <>
              <Field label="Kullanıcı Adı" value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
              <Field label="Ad Soyad" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} disabled={user.role === 'moderator'} />
              <Field label="Telefon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <div className="flex gap-2 pt-2">
                <button onClick={save} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold">Kaydet</button>
                <button onClick={() => setEditing(false)} className="bg-secondary px-4 py-2 rounded-lg text-sm">İptal</button>
              </div>
            </>
          ) : (
            <>
              <Row label="Kullanıcı Adı" value={user.username || '-'} />
              <Row label="Ad Soyad" value={user.full_name || '-'} />
              <Row label="Üye No" value={user.member_id || '-'} />
              <Row label="E-posta" value={user.email} />
              <Row label="Telefon" value={user.phone || '-'} />
              <Row label="Paket" value={pkg?.name || '-'} />
              <Row label="Başlangıç" value={user.membership_start ? new Date(user.membership_start).toLocaleDateString('tr-TR') : '-'} />
              <Row label="Bitiş" value={user.role === 'admin' ? 'Süresiz' : (user.membership_end ? new Date(user.membership_end).toLocaleDateString('tr-TR') : '-')} />
              <button onClick={() => setEditing(true)} className="mt-2 bg-secondary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1"><Settings className="w-4 h-4" /> Düzenle</button>
            </>
          )}
        </div>
      )}
      {tab === 'history' && (
        <div>
          {historyMovies.length > 0 && (
            <button onClick={clearHistory} className="mb-3 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Tümünü Sil</button>
          )}
          <MovieGrid movies={historyMovies} empty="Henüz bir şey izlemediniz." />
        </div>
      )}
      {tab === 'list' && <MovieGrid movies={list} empty="Henüz listenize film eklemediniz." />}
      {tab === 'favs' && <MovieGrid movies={favs} empty="Henüz favori yok." />}
      {tab === 'blocked' && <BlockedUsers />}
    </div>
  );
}

function Field({ label, value, onChange, disabled }) {
  return <div><label className="text-sm text-muted-foreground">{label}</label><input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={`w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-ring ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} /></div>;
}
function Row({ label, value }) { return <div className="flex justify-between text-sm py-1.5 border-b border-border last:border-0"><span className="text-muted-foreground">{label}</span><span className="font-medium text-right">{value}</span></div>; }
function MovieGrid({ movies, empty }) {
  if (!movies.length) return <p className="text-center text-sm text-muted-foreground py-10">{empty}</p>;
  return <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">{movies.map((m) => <Link key={m.id} to={`/izle/${m.id}`} className="rounded-lg overflow-hidden border border-border bg-card"><img src={m.poster} alt={m.title} className="w-full aspect-[2/3] object-cover" /><p className="p-2 text-sm truncate">{m.title}</p></Link>)}</div>;
}