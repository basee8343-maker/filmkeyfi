import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Lock, EyeOff } from 'lucide-react';

export default function ActiveRooms() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [posters, setPosters] = useState({});
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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const active = await base44.entities.Room.filter({ status: 'active' }, '-updated_date', 50);
        if (cancelled) return;
        const isAdmin = user?.role === 'admin';
        // Include locked rooms; hide hidden rooms unless admin; require at least 1 participant
        const visible = active
          .filter((r) => isAdmin || !r.hidden)
          .filter((r) => (r.participants || []).length > 0);
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
  }, [user?.role]);

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
            <motion.div
              key={room.id}
              layout
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -120, transition: { duration: 0.3 } }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative flex flex-col items-center shrink-0 w-16"
            >
              <button onClick={() => navigate(`/oda/${room.id}`)} className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary/40 shadow-[0_0_14px_-4px_rgba(229,9,20,0.6)] active:scale-95 transition">
                {posters[room.movie_id] ? <Image src={posters[room.movie_id]} className="w-full h-full" fittingType="fill" /> : <div className="w-full h-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center text-lg font-bold text-white">{(room.movie_title || '?')[0]}</div>}
                {room.password && <span className="absolute top-0.5 right-0.5 bg-black/80 rounded-full p-0.5 border border-amber-400/50"><Lock className="w-2.5 h-2.5 text-amber-400" /></span>}
                {room.hidden && <span className="absolute bottom-0.5 left-0.5 bg-black/80 rounded-full p-0.5 border border-blue-400/50"><EyeOff className="w-2.5 h-2.5 text-blue-400" /></span>}
              </button>
              <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center border-2 border-background">{room.room_number || idx + 1}</span>
              <p className="text-[10px] font-medium text-white text-center truncate w-full mt-1.5">{room.movie_title || 'Film'}</p>
            </motion.div>
          ))}
        </AnimatePresence>}
      </div>
    </section>
  );
}