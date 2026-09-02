import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';

export default function ActiveRooms() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [posters, setPosters] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const active = await base44.entities.Room.filter({ status: 'active' }, '-updated_date', 50);
        const publicRooms = active.filter((r) => !r.hidden && !r.password);
        setRooms(publicRooms);
        const movieIds = [...new Set(publicRooms.map((r) => r.movie_id).filter(Boolean))];
        if (movieIds.length) {
          const movies = await Promise.all(movieIds.map((id) => base44.entities.Movie.get(id).catch(() => null)));
          const map = {};
          movieIds.forEach((id, i) => { if (movies[i]?.poster) map[id] = movies[i].poster; });
          setPosters(map);
        }
      } catch {} finally { setLoading(false); }
    };
    load();
    const unsub = base44.entities.Room.subscribe(() => load());
    return () => unsub();
  }, []);

  if (!loading && !rooms.length) return null;

  return (
    <section className="px-4 mt-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-6 bg-primary rounded-full" />
        <h2 className="text-lg font-bold text-white">Aktif Odalar</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
        {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="shrink-0 w-24"><div className="w-24 h-24 rounded-full bg-secondary animate-pulse" /><div className="mt-2 h-3 w-20 bg-secondary rounded animate-pulse mx-auto" /><div className="mt-1 h-2.5 w-14 bg-secondary rounded animate-pulse mx-auto" /></div>) :
        rooms.map((room) => (
          <button key={room.id} onClick={() => navigate(`/oda/${room.id}`)} className="flex flex-col items-center shrink-0 w-24">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/40 shadow-[0_0_18px_-4px_rgba(229,9,20,0.6)]">
              {posters[room.movie_id] ? <Image src={posters[room.movie_id]} className="w-full h-full" fittingType="fill" /> : <div className="w-full h-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center text-2xl font-bold text-white">{(room.movie_title || '?')[0]}</div>}
            </div>
            <p className="text-xs font-medium text-white text-center truncate w-full mt-2">{room.movie_title || 'Film'}</p>
            <p className="text-[11px] text-muted-foreground text-center truncate w-full">{room.name}</p>
          </button>
        ))}
      </div>
    </section>
  );
}