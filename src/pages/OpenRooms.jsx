import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { DoorOpen, Users, Lock, Loader2, Instagram, EyeOff, Star } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';

export default function OpenRooms() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [movies, setMovies] = useState({});
  const [owners, setOwners] = useState({});
  const [loading, setLoading] = useState(true);

  const shareRoom = useCallback(async (e, room) => {
    e.stopPropagation();
    e.preventDefault();
    const shareUrl = `${window.location.origin}/oda/${room.id}`;
    const shareText = `🎬 ${room.name} - FilmKeyfi Watch Party'ne katıl!`;
    if (navigator.share) {
      try { await navigator.share({ title: room.name, text: shareText, url: shareUrl }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        toast({ title: 'Bağlantı kopyalandı', description: 'Instagram veya başka platformda paylaşabilirsiniz.' });
      } catch {
        window.open(shareUrl, '_blank');
      }
    }
  }, [toast]);

  const fetchOwners = async (rs) => {
    const ids = [...new Set(rs.map((r) => r.owner_id).filter(Boolean))];
    const profiles = await Promise.all(ids.map((uid) => base44.functions.invoke('user-profile', { user_id: uid }).catch(() => null)));
    const map = {};
    profiles.forEach((p, i) => { if (p) map[ids[i]] = p; });
    setOwners((prev) => ({ ...prev, ...map }));
  };

  useEffect(() => {
    const isAdmin = user?.role === 'admin';
    const load = async () => {
      try {
        const [r, m] = await Promise.all([
          base44.entities.Room.filter({ status: 'active' }, '-created_date', 200).catch(() => []),
          base44.entities.Movie.list(500).catch(() => []),
        ]);
        const visible = r.filter((x) => (isAdmin || !x.hidden) && (x.participants?.length || 0) > 0);
        setRooms(visible);
        const map = {}; m.forEach((mv) => { map[mv.id] = mv; });
        setMovies(map);
        fetchOwners(visible);
      } finally { setLoading(false); }
    };
    load();
    const unsub = base44.entities.Room.subscribe((ev) => {
      const isAdmin2 = user?.role === 'admin';
      if (ev.type === 'create' && ev.data?.status === 'active' && (isAdmin2 || !ev.data.hidden) && (ev.data.participants?.length || 0) > 0) {
        setRooms((p) => [ev.data, ...p.filter((x) => x.id !== ev.data.id)]);
        fetchOwners([ev.data]);
      }
      if (ev.type === 'update') setRooms((p) => p.map((x) => (x.id === ev.data.id ? ev.data : x)).filter((x) => x.status === 'active' && (isAdmin2 || !x.hidden) && (x.participants?.length || 0) > 0));
      if (ev.type === 'delete') setRooms((p) => p.filter((x) => x.id !== ev.id));
    });
    return unsub;
  }, [user?.role]);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-extrabold mb-1 flex items-center gap-2"><DoorOpen className="w-6 h-6 text-primary" /> Açık Odalar</h1>
      <p className="text-sm text-muted-foreground mb-6">Aktif Watch Party odalarına katıl.</p>
      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> :
       rooms.length === 0 ? (
         <div className="text-center py-20 text-muted-foreground">
           <DoorOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
           <p className="mb-2">Açık oda yok.</p>
           <Link to="/oda-kur" className="text-primary text-sm hover:underline">İlk odayı sen kur</Link>
         </div>
       ) : (
         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
           {rooms.map((r, i) => {
             const mv = movies[r.movie_id];
             return (
               <div key={r.id} className="flex flex-col items-center">
                 <div className={`relative w-36 h-36 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 ${r.is_personal ? 'border-accent' : 'border-primary/40'} shadow-lg group`}>
                   {mv?.poster ? <Image src={mv.poster} className="w-full h-full" fittingType="fill" /> :
                     <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-3xl">🎬</div>}
                   <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
                   {r.password && (
                     <span className="absolute top-1 right-1 bg-black/80 rounded-full p-1.5 border border-amber-400/60 flex items-center gap-1">
                       <Lock className="w-3.5 h-3.5 text-amber-400" />
                       <span className="text-[9px] text-amber-400 font-bold">KİLİTLİ</span>
                     </span>
                   )}
                   {r.is_personal && (
                     <span className="absolute top-1 left-1 bg-accent text-accent-foreground text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 z-10"><Star className="w-2.5 h-2.5" /> Kişisel</span>
                   )}
                   {r.hidden && (
                     <span className="absolute top-1 left-1 bg-black/80 rounded-full p-1.5 border border-blue-400/60 flex items-center gap-1">
                       <EyeOff className="w-3.5 h-3.5 text-blue-400" />
                       <span className="text-[9px] text-blue-400 font-bold">GİZLİ</span>
                     </span>
                   )}
                   <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">Oda {r.room_number || i + 1}</span>
                   <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1"><Users className="w-3 h-3" /> {r.participants?.length || 0}/{r.max_users}</div>
                 </div>
                 <p className="mt-2 text-sm font-semibold text-center truncate max-w-full">{r.name}</p>
                 <p className="text-xs text-muted-foreground truncate max-w-full mb-1">{r.movie_title || mv?.title || 'İçerik'}</p>
                 {(() => {
                   const o = owners[r.owner_id];
                   return (
                     <Link to={`/kullanici/${r.owner_id}`} className="flex items-center justify-center gap-1.5 mb-2 group">
                       {o?.avatar ? <img src={o.avatar} className="w-5 h-5 rounded-full object-cover" alt="" /> : <span className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-bold">{(r.owner_name || '?')[0]}</span>}
                       <span className="text-xs text-muted-foreground group-hover:text-foreground truncate max-w-full">{r.owner_name || o?.username || 'Kullanıcı'}{r.owner_name ? ' odası' : ''}</span>
                     </Link>
                   );
                 })()}
                 <div className="flex gap-2 items-center">
                   <Link to={`/oda/${r.id}`} className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-1.5 rounded-full hover:bg-primary/90">Katıl</Link>
                   <button onClick={(e) => shareRoom(e, r)} className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary hover:bg-primary/20 text-foreground hover:text-primary transition-colors border border-border" title="Instagram'da paylaş"><Instagram className="w-4 h-4" /></button>
                 </div>
               </div>
             );
           })}
         </div>
       )}
    </div>
  );
}