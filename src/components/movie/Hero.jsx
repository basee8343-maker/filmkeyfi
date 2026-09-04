import { Link } from 'react-router-dom';
import { Play, Plus, Star, Info } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';

export default function Hero({ movie }) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [inList, setInList] = useState(false);

  useEffect(() => {
    if (!user || !movie) return;
    base44.entities.Watchlist.filter({ user_id: user.id, movie_id: movie.id }).then((r) => setInList(r.length > 0)).catch(() => {});
  }, [user?.id, movie?.id]);

  if (!movie) return <div className="h-[50vh] sm:h-[70vh] bg-gradient-to-b from-secondary to-background animate-pulse" />;
  const qualityColor = { 'HD': 'bg-blue-500/20 text-blue-300', 'Full HD': 'bg-purple-500/20 text-purple-300', '4K': 'bg-amber-500/20 text-amber-300' };

  const add = async () => {
    if (!user) return;
    if (inList) {
      await base44.entities.Watchlist.deleteMany({ user_id: user.id, movie_id: movie.id });
      setInList(false);
    } else {
      await base44.entities.Watchlist.create({ user_id: user.id, movie_id: movie.id });
      setInList(true);
      toast({ title: 'Listenize eklendi' });
    }
  };

  return (
    <div className="relative h-[55vh] min-h-[260px] sm:h-[78vh] w-full overflow-hidden bg-black">
      <Image src={movie.poster || movie.backdrop} alt={movie.title} className="absolute inset-0 w-full h-full sm:hidden" fittingType="fit" />
      <Image src={movie.backdrop || movie.poster} alt={movie.title} className="absolute inset-0 hidden w-full h-full sm:block" fittingType="fill" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
      <div className="relative h-full flex items-end pb-6 sm:pb-20 px-3 sm:px-10">
        <div className="max-w-2xl space-y-2 sm:space-y-4 min-w-0">
          <span className={`text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded inline-block ${qualityColor[movie.quality]}`}>{movie.quality} · {movie.type === 'series' ? 'DİZİ' : 'FİLM'}</span>
          <h1 className="text-xl sm:text-6xl font-extrabold tracking-tight leading-tight">{movie.title}</h1>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[11px] sm:text-sm text-muted-foreground">
            {movie.imdb && <span className="flex items-center gap-0.5 sm:gap-1 text-amber-300 font-semibold"><Star className="w-3 h-3 sm:w-4 sm:h-4 fill-amber-400 text-amber-400" />{movie.imdb}</span>}
            <span>{movie.year}</span>
            {movie.age_rating && <span className="border border-border rounded px-1 text-[10px] sm:text-xs">{movie.age_rating}</span>}
            <span>{movie.duration || 0} dk</span>
            {movie.genres?.slice(0, 3).map((g) => <span key={g} className="text-foreground/80">{g}</span>)}
          </div>
          <p className="text-xs sm:text-base text-muted-foreground line-clamp-2 sm:line-clamp-3 max-w-xl">{movie.description}</p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 pt-2 sm:pt-3">
            <Link to={`/izle/${movie.id}`} className="inline-flex items-center gap-1.5 sm:gap-2.5 text-white font-bold px-4 sm:px-7 py-2 sm:py-3.5 rounded-lg transition-all text-xs sm:text-base" style={{ background: 'linear-gradient(135deg, #8B31FF, #5F24A1)' }}>
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" /> İzlemeye Başla
            </Link>
            <button onClick={add} className="inline-flex items-center gap-1.5 sm:gap-2.5 bg-[#1a1a1a]/80 border border-white/20 hover:bg-[#2a2a2a] text-white px-3 sm:px-6 py-2 sm:py-3.5 rounded-lg font-semibold transition-colors text-xs sm:text-base">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> {inList ? 'Listemde' : '+ Listeme Ekle'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}