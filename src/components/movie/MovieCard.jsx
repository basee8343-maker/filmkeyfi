import { Link } from 'react-router-dom';
import { Star, Play, Bookmark, Check } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';

export default function MovieCard({ movie, className = '' }) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [inList, setInList] = useState(false);

  const addToList = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      if (inList) {
        await base44.entities.Watchlist.deleteMany({ user_id: user.id, movie_id: movie.id });
        setInList(false);
        toast({ title: 'Listenizden kaldırıldı' });
      } else {
        await base44.entities.Watchlist.create({ user_id: user.id, movie_id: movie.id });
        setInList(true);
        toast({ title: 'Listenize eklendi' });
      }
    } catch (err) { toast({ title: 'Hata', description: err.message, variant: 'destructive' }); }
  };

  return (
    <Link to={`/izle/${movie.id}`} className={`group block w-full rounded-xl overflow-hidden bg-[#16161e] border border-white/5 text-white transition-all duration-300 hover:scale-[1.02] hover:border-purple-500/30 ${className}`}>
      <div className="relative aspect-[2/3] overflow-hidden bg-black">
        <Image src={movie.poster} alt={movie.title} className="w-full h-full" fittingType="fill" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {movie.quality && <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-600/90 text-white">{movie.quality}</span>}
        {movie.imdb && (
          <span className="absolute top-2 right-2 flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-amber-300">
            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />{movie.imdb}
          </span>
        )}
      </div>
      <div className="p-2.5 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold truncate">{movie.title}</h3>
          <p className="text-xs text-gray-400 truncate">{movie.year} · {movie.duration || 0} dk</p>
        </div>
        <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}>
          <Play className="w-3.5 h-3.5 fill-white text-white" />
        </span>
        <button onClick={addToList} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white/5 hover:bg-white/10">
          {inList ? <Check className="w-4 h-4 text-purple-400" /> : <Bookmark className="w-4 h-4 text-gray-400" />}
        </button>
      </div>
    </Link>
  );
}