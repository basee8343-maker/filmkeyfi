import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { Lock, Users, Play } from 'lucide-react';

export default function ActiveRooms() {
  const [rooms, setRooms] = useState([]);
  const [posters, setPosters] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const active = await base44.entities.Room.filter({ status: 'active' }, '-updated_date', 50);
        if (cancelled) return;
        const visible = active.filter((r) => (r.participants || []).length > 0);
        const unique = [...new Map(visible.map((r) => [r.id, r])).values()];
        setRooms(unique);
        const movieIds = [...new Set(unique.map((r) => r.movie_id).filter(Boolean))];
        if (movieIds.length) {
          const movies = await Promise.all(movieIds.map((id) => base44.entities.Movie.get(id).catch(() => null)));
          if (cancelled) return;
          const map = {};
          movieIds.forEach((id, i) => { if (movies[i]?.poster) map[id] = movies[i].poster; });
          setPosters(map);
        }
      } catch {} finally { if (!cancelled) setLoading(false); }
    };
    load();
    const unsub = base44.entities.Room.subscribe(() => load());
    return () => { cancelled = true; unsub(); };
  }, []);

  if (!loading && !rooms.length) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between px-4 sm:px-6 mb-3">
        <h2 className="text-lg sm:text-xl font-bold text-white">Aktif Odalar</h2>
        <Link to="/acik-odalar" className="text-sm text-[#808080] hover:text-white">Tümü →</Link>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 sm:px-6 pb-2">
        {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="shrink-0 w-56 h-40 rounded-xl bg-[#1a1a1a] animate-pulse" />) :
        rooms.map((room) => (
          <Link to={`/oda/${room.id}`} key={room.id} className="shrink-0 w-56 rounded-xl bg-[#1a1a1a] border border-white/10 overflow-hidden active:scale-95 transition-transform">
            <div className="relative h-28">
              {posters[room.movie_id] ? <Image src={posters[room.movie_id]} className="w-full h-full" fittingType="fill" /> : <div className="w-full h-full bg-gradient-to-br from-[#8B31FF]/40 to-[#5F24A1]/40 flex items-center justify-center text-2xl">🎬</div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-white">HD</span>
              {room.password && <span className="absolute top-2 right-2 bg-black/80 rounded-full p-1"><Lock className="w-3 h-3 text-amber-400" /></span>}
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-sm font-bold text-white truncate">{room.name}</p>
                <div className="flex items-center gap-2 text-[10px] text-[#a0a0a0] mt-0.5">
                  <span className="flex items-center gap-0.5"><Users className="w-3 h-3" /> {room.participants?.length || 0}/{room.max_users}</span>
                  <span>•</span>
                  <span className="truncate">{room.movie_title || 'Film'}</span>
                </div>
              </div>
            </div>
            <div className="text-center py-2 text-xs font-bold text-white flex items-center justify-center gap-1" style={{ background: 'rgba(139, 49, 255, 0.2)' }}>
              <Play className="w-3 h-3 fill-white" /> İZLİYOR
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}