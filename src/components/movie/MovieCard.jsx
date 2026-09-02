import { Link } from 'react-router-dom';
import { Star, Play, Plus, Check } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';

export default function MovieCard({ movie }) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [inList, setInList] = useState(false);
  const qualityColor = { 'HD': 'bg-blue-500/20 text-blue-300', 'Full HD': 'bg-purple-500/20 text-purple-300', '4K': 'bg-amber-500/20 text-amber-300' };

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
    <Link to={`/izle/${movie.id}`} className="group relative block w-[150px] sm:w-[180px] shrink-0 rounded-xl overflow-hidden bg-card border border-border transition-all duration-300 hover:scale-[1.04] hover:z-10 hover:cinema-shadow">
      <div className="relative aspect-[2/3] overflow-hidden bg-black">
        <Image src={movie.poster} alt={movie.title} className="w-full h-full" fittingType="fit" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />
        <span className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${qualityColor[movie.quality] || 'bg-secondary'}`}>{movie.quality}</span>
        {movie.imdb && (
          <span className="absolute top-2 right-2 flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-amber-300">
            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />{movie.imdb}
          </span>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
            <Play className="w-5 h-5 fill-white text-white" />
          </span>
        </div>
        <button onClick={addToList} className="absolute bottom-2 right-2 w-8 h-8 rounded-full glass border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary">
          {inList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
      <div className="p-2.5">
        <h3 className="text-sm font-semibold truncate">{movie.title}</h3>
        <p className="text-xs text-muted-foreground">{movie.year} · {movie.duration || 0} dk</p>
      </div>
    </Link>
  );
}