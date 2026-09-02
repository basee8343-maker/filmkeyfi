import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import MembershipNotice from '@/components/profile/MembershipNotice';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileInfoCard from '@/components/profile/ProfileInfoCard';
import ProfileMovieGrid from '@/components/profile/ProfileMovieGrid';
import ProfileSettings from '@/components/profile/ProfileSettings';
import ProfileTabs from '@/components/profile/ProfileTabs';

export default function Profile() {
  const { user, reload } = useCurrentUser(); const { toast } = useToast(); const location = useLocation(); const navigate = useNavigate();
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') === 'settings' ? 'settings' : 'info'); const [pkg, setPkg] = useState(null); const [historyMovies, setHistoryMovies] = useState([]); const [list, setList] = useState([]); const [favs, setFavs] = useState([]); const [editing, setEditing] = useState(false); const [form, setForm] = useState({ username: '', full_name: '', phone: '', avatar: '' });
  useEffect(() => {
    if (new URLSearchParams(location.search).get('tab') === 'settings') setTab('settings');
  }, [location.search]);
  useEffect(() => {
    if (!user) return;
    setForm({ username: user.username || '', full_name: user.full_name || '', phone: user.phone || '', avatar: user.avatar || '' });
    if (!user.member_id) base44.functions.invoke('ensure-member-id').then(reload).catch(() => {});
    if (user.package_id) base44.entities.Package.get(user.package_id).then(setPkg).catch(() => {});
    loadMovies();
  }, [user?.id]);
  const loadMovies = async () => {
    const [history, watchlist, favorites] = await Promise.all([base44.entities.WatchHistory.filter({ user_id: user.id }, '-created_date', 20).catch(() => []), base44.entities.Watchlist.filter({ user_id: user.id }, '-created_date', 50).catch(() => []), base44.entities.Favorite.filter({ user_id: user.id }, '-created_date', 50).catch(() => [])]);
    const resolve = (items) => Promise.all(items.map((item) => base44.entities.Movie.get(item.movie_id).catch(() => null))).then((movies) => movies.filter(Boolean));
    const [historyItems, listItems, favoriteItems] = await Promise.all([resolve(history), resolve(watchlist), resolve(favorites)]); setHistoryMovies(historyItems); setList(listItems); setFavs(favoriteItems);
  };
  const save = async () => {
    try { await base44.functions.invoke('update-profile', form); await reload(); setEditing(false); toast({ title: 'Profil güncellendi' }); }
    catch (error) { toast({ title: 'Hata', description: error.message, variant: 'destructive' }); }
  };
  const onAvatar = async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const { file_url } = await base44.integrations.Core.UploadFile({ file }); setForm((current) => ({ ...current, avatar: file_url })); } catch { toast({ title: 'Yükleme hatası', variant: 'destructive' }); } };
  const clearHistory = async () => { await base44.entities.WatchHistory.deleteMany({ user_id: user.id }); setHistoryMovies([]); toast({ title: 'İzleme geçmişi temizlendi' }); };
  const renew = async () => { try { await base44.entities.MembershipRenewal.create({ user_id: user.id, user_name: user.username || user.full_name, current_package: pkg?.name || 'Yok', requested_package: pkg?.name || 'STANDARD', status: 'pending' }); await base44.entities.Notification.create({ user_id: user.id, title: 'Yenileme talebiniz alındı', body: 'Talebiniz admin onayı bekliyor.', type: 'info' }); toast({ title: 'Yenileme talebi gönderildi' }); } catch { toast({ title: 'Hata', variant: 'destructive' }); } };
  if (!user) return <div className="p-6">Yükleniyor...</div>;
  const expired = user.membership_end && new Date(user.membership_end) < new Date();
  return <div className="mx-auto max-w-3xl px-4 py-7 sm:px-6">
    <ProfileHeader user={user} pkg={pkg} expired={expired} editing={editing} avatar={form.avatar} onAvatar={onAvatar} />
    <MembershipNotice user={user} expired={expired} onRenew={renew} />
    <ProfileTabs active={tab} onChange={(nextTab) => { setTab(nextTab); navigate(nextTab === 'settings' ? '/profil?tab=settings' : '/profil', { replace: true }); }} />
    {tab === 'info' && <ProfileInfoCard user={user} pkg={pkg} editing={editing} form={form} setForm={setForm} onSave={save} onEdit={() => setEditing(true)} onCancel={() => setEditing(false)} />}
    {tab === 'history' && <div>{historyMovies.length > 0 && <button onClick={clearHistory} className="mb-3 flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground"><Trash2 className="w-4 h-4" />Tümünü Sil</button>}<ProfileMovieGrid movies={historyMovies} empty="Henüz bir şey izlemediniz." /></div>}
    {tab === 'list' && <ProfileMovieGrid movies={list} empty="Henüz listenize film eklemediniz." />}
    {tab === 'favs' && <ProfileMovieGrid movies={favs} empty="Henüz favori yok." />}
    {tab === 'settings' && <ProfileSettings user={user} />}
  </div>;
}