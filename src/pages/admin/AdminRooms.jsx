import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Image } from '@/components/ui/image';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import UserBadge from '@/components/admin/UserBadge';
import { Trash2, DoorClosed, MessageSquareOff, MicOff, Crown, Users, Lock, Unlock, Calendar, Search, Plus, Folder, MessageSquare, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';

const PAGE_SIZE = 8;

export default function AdminRooms() {
  const { user: admin } = useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [movies, setMovies] = useState({});
  const [owners, setOwners] = useState({});
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);

  const load = () => {
    base44.entities.Room.list(500).then(async (r) => {
      setRooms(r);
      const movieIds = [...new Set(r.map((rm) => rm.movie_id).filter(Boolean))];
      const ownerIds = [...new Set(r.map((rm) => rm.owner_id).filter(Boolean))];
      const mv = await Promise.all(movieIds.map((id) => base44.entities.Movie.get(id).catch(() => null)));
      const ow = await Promise.all(ownerIds.map((id) => base44.functions.invoke('user-profile', { user_id: id }).catch(() => null)));
      setMovies(Object.fromEntries(mv.filter(Boolean).map((m) => [m.id, m])));
      setOwners(Object.fromEntries(ownerIds.map((id, i) => [id, ow[i]])));
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const log = async (action, target) => { await base44.entities.AdminLog.create({ admin_id: admin?.id, admin_name: admin?.username, action, target }).catch(() => {}); };
  const close = async (r) => { await base44.entities.Room.update(r.id, { status: 'closed' }); await log('Oda kapatıldı', r.name); toast({ title: 'Kapatıldı' }); load(); };
  const toggleChat = async (r) => { await base44.entities.Room.update(r.id, { chat_enabled: !r.chat_enabled }); await log('Sohbet durumu değişti', r.name); load(); };
  const toggleVoice = async (r) => { await base44.entities.Room.update(r.id, { voice_enabled: !r.voice_enabled }); await log('Sesli sohbet durumu değişti', r.name); load(); };
  const reopen = async (r) => { await base44.entities.Room.update(r.id, { status: 'active' }); toast({ title: 'Oda açıldı' }); load(); };
  const del = async () => { await base44.entities.RoomMessage.deleteMany({ room_id: confirm.id }).catch(() => {}); await base44.entities.Room.delete(confirm.id); toast({ title: 'Silindi' }); setConfirm(null); load(); };
  const delAll = async () => { await Promise.all(rooms.map((r) => base44.entities.RoomMessage.deleteMany({ room_id: r.id }).catch(() => {}))); await base44.entities.Room.deleteMany({}); setConfirmAll(false); toast({ title: 'Tüm odalar silindi' }); load(); };

  const filtered = rooms.filter((r) => r.name?.toLowerCase().includes(search.toLowerCase()) || r.owner_name?.toLowerCase().includes(search.toLowerCase()) || r.movie_title?.toLowerCase().includes(search.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'recent') return new Date(b.created_date) - new Date(a.created_date);
    if (sort === 'active') return (b.status === 'active' ? 1 : 0) - (a.status === 'active' ? 1 : 0);
    if (sort === 'viewers') return (b.participants?.length || 0) - (a.participants?.length || 0);
    return 0;
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total: rooms.length,
    active: rooms.filter((r) => r.status === 'active').length,
    viewers: rooms.reduce((s, r) => s + (r.participants?.length || 0), 0),
    chats: rooms.filter((r) => r.chat_enabled).length,
  };

  if (loading) return <p className="text-muted-foreground">Yükleniyor...</p>;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div>
          <h1 className="text-2xl font-extrabold">Odalar</h1>
          <p className="text-sm text-muted-foreground">Tüm odaları görüntüleyin ve yönetin.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Oda ara..." className="bg-secondary/60 rounded-full pl-4 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-ring w-48" />
          </div>
          <button onClick={() => navigate('/oda-kur')} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold"><Plus className="w-4 h-4" /> Yeni Oda</button>
          {rooms.length > 0 && <button onClick={() => setConfirmAll(true)} className="inline-flex items-center gap-1.5 bg-red-500/20 text-red-400 px-4 py-2 rounded-full text-sm font-semibold"><Trash2 className="w-4 h-4" /> Tümünü Sil</button>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-4">
        <StatCard icon={Folder} label="Toplam Oda" value={stats.total} sub="Tüm odalar" />
        <StatCard icon={Users} label="Aktif Odalar" value={stats.active} sub="Şu anda aktif" dot />
        <StatCard icon={Users} label="Toplam İzleyici" value={stats.viewers} sub="Tüm odalarda" />
        <StatCard icon={MessageSquare} label="Açık Sohbet" value={stats.chats} sub="Toplam" />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sırala:</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-secondary/60 rounded-lg px-3 py-1.5 text-sm outline-none border border-border">
            <option value="recent">Son oluşturulan</option>
            <option value="active">Önce aktif</option>
            <option value="viewers">İzleyici sayısı</option>
          </select>
        </div>
        <span className="text-xs text-muted-foreground">{sorted.length} oda</span>
      </div>

      {/* Room Cards */}
      {paged.length === 0 ? <p className="text-muted-foreground text-sm text-center py-10">Oda yok.</p> :
        <div className="space-y-3">
          {paged.map((r, idx) => {
            const movie = movies[r.movie_id];
            const owner = owners[r.owner_id];
            return (
              <div key={r.id} className="bg-card border border-border rounded-2xl p-3 flex gap-3">
                {/* Poster */}
                <div className="w-16 sm:w-20 shrink-0 rounded-lg overflow-hidden bg-secondary">
                  {movie?.poster ? <Image src={movie.poster} className="w-full h-24 sm:h-28 object-cover" fittingType="fill" /> : <div className="w-full h-24 sm:h-28 flex items-center justify-center"><DoorClosed className="w-6 h-6 text-muted-foreground" /></div>}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full shrink-0">Oda #{(idx + 1 + (page - 1) * PAGE_SIZE).toString().padStart(4, '0')}</span>{r.is_personal && <span className="text-xs font-bold bg-accent/20 text-accent px-2 py-0.5 rounded-full shrink-0">Kişisel</span>}
                      <p className="font-semibold truncate">{r.name}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${r.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{r.status === 'active' ? 'Aktif' : 'Kapalı'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 truncate">{r.movie_title || 'İçerik yok'}</p>
                  {/* Data Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    <div className="col-span-2 sm:col-span-1"><p className="text-[10px] text-muted-foreground mb-0.5">Oda Sahibi</p><UserBadge userId={r.owner_id} name={r.owner_name || '-'} avatar={owner?.avatar} memberId={owner?.member_id} size="sm" /></div>
                    <DataItem icon={Users} label="İzleyici" value={`${r.participants?.length || 0}/${r.max_users || 10}`} />
                    <DataItem icon={r.password ? Lock : Unlock} label="Oda Türü" value={r.password ? 'Şifreli' : 'Şifresiz'} />
                    <DataItem icon={Calendar} label="Oluşturulma" value={new Date(r.created_date).toLocaleDateString('tr-TR')} />
                  </div>
                  {/* Actions */}
                  <div className="flex flex-wrap gap-1.5">
                    {r.status === 'active' ? <button onClick={() => navigate(`/oda/${r.id}`)} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold inline-flex items-center gap-1"><DoorClosed className="w-3.5 h-3.5" /> Katıl</button> : <button onClick={() => reopen(r)} className="px-3 py-1.5 rounded-lg border border-green-500/30 text-green-400 text-xs font-semibold inline-flex items-center gap-1"><DoorClosed className="w-3.5 h-3.5" /> Aç</button>}
                    <button onClick={() => toggleChat(r)} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold inline-flex items-center gap-1"><MessageSquareOff className="w-3.5 h-3.5" /> {r.chat_enabled ? 'Sohbet' : 'Sohbet Kapalı'}</button>
                    <button onClick={() => toggleVoice(r)} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold inline-flex items-center gap-1"><MicOff className="w-3.5 h-3.5" /> {r.voice_enabled ? 'Sesli' : 'Kapalı'}</button>
                    {r.status === 'active' && <button onClick={() => close(r)} className="px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-400 text-xs font-semibold inline-flex items-center gap-1"><DoorClosed className="w-3.5 h-3.5" /> Kapat</button>}
                    <button onClick={() => setConfirm(r)} className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-xs font-semibold inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Sil</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">Toplam {sorted.length} oda</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            {Array.from({ length: totalPages }, (_, i) => {
              if (i === 0 || i === totalPages - 1 || Math.abs(i + 1 - page) <= 1) return <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 rounded-lg text-xs font-medium ${page === i + 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}>{i + 1}</button>;
              if (Math.abs(i + 1 - page) === 2) return <span key={i} className="px-1 text-muted-foreground text-xs">...</span>;
              return null;
            })}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title="Odayı sil?" description={`${confirm?.name} ve tüm mesajları kalıcı olarak silinecek.`} onConfirm={del} />
      <ConfirmDialog open={confirmAll} onOpenChange={(o) => !o && setConfirmAll(false)} title="Tüm odaları sil?" description={`${rooms.length} oda ve tüm mesajları kalıcı olarak silinecek.`} confirmText="Tümünü Sil" onConfirm={delAll} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, dot }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        {dot ? <span className="w-2 h-2 rounded-full bg-green-500" /> : <Icon className="w-4 h-4 text-muted-foreground" />}
      </div>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function DataItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-medium truncate">{value}</p>
      </div>
    </div>
  );
}