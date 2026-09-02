import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { motion, AnimatePresence } from 'framer-motion';

export default function ActiveRooms() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [posters, setPosters] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const active = await base44.entities.Room.filter({ status: 'active' }, '-updated_date', 50);
        if (cancelled) return;
        // Sadece herkese açık odalar + en az 1 katılımcı + tekilleştir
        const publicRooms = active
          .filter((r) => !r.hidden && !r.password)
          .filter((r) => (r.participants || []).length > 0);
        const unique = [...new Map(publicRooms.map((r) => [r.id, r])).values()];
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
    <section className="px-4 mt-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-6 bg-primary rounded-full" />
        <h2 className="text-lg font-bold text-white">Aktif Odalar</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="shrink-0 w-16"><div className="w-16 h-16 rounded-full bg-secondary animate-pulse" /><div className="mt-1.5 h-2.5 w-12 bg-secondary rounded animate-pulse mx-auto" /></div>) :
        <AnimatePresence>
          {rooms.map((room, idx) => (
            <motion.button
              key={room.id}
              layout
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -120, transition: { duration: 0.3 } }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={() => navigate(`/oda/${room.id}`)}
              className="relative flex flex-col items-center shrink-0 w-16"
            >
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary/40 shadow-[0_0_14px_-4px_rgba(229,9,20,0.6)]">
                {posters[room.movie_id] ? <Image src={posters[room.movie_id]} className="w-full h-full" fittingType="fill" /> : <div className="w-full h-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center text-lg font-bold text-white">{(room.movie_title || '?')[0]}</div>}
              </div>
              <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center border-2 border-background">{idx + 1}</span>
              <p className="text-[10px] font-medium text-white text-center truncate w-full mt-1.5">{room.movie_title || 'Film'}</p>
            </motion.button>
          ))}
        </AnimatePresence>}
      </div>
    </section>
  );
}