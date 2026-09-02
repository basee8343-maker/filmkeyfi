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

  if (!movie) return <div className="h-[60vh] sm:h-[70vh] bg-gradient-to-b from-secondary to-background animate-pulse" />;
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
    <div className="relative min-h-[620px] h-[calc(100svh-4rem)] sm:h-[78vh] sm:min-h-0 w-full overflow-hidden bg-black">
      <Image src={movie.poster || movie.backdrop} alt={movie.title} className="absolute inset-0 w-full h-full sm:hidden" fittingType="fit" />
      <Image src={movie.backdrop || movie.poster} alt={movie.title} className="absolute inset-0 hidden w-full h-full sm:block" fittingType="fill" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
      <div className="relative h-full flex items-end pb-10 sm:pb-20 px-4 sm:px-10">
        <div className="max-w-2xl space-y-4">
          <span className={`text-xs font-bold px-2 py-1 rounded inline-block ${qualityColor[movie.quality]}`}>{movie.quality} · {movie.type === 'series' ? 'DİZİ' : 'FİLM'}</span>
          <h1 className="text-3xl sm:text-6xl font-extrabold tracking-tight leading-tight">{movie.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {movie.imdb && <span className="flex items-center gap-1 text-amber-300 font-semibold"><Star className="w-4 h-4 fill-amber-400 text-amber-400" />{movie.imdb}</span>}
            <span>{movie.year}</span>
            {movie.age_rating && <span className="border border-border rounded px-1.5 text-xs">{movie.age_rating}</span>}
            <span>{movie.duration || 0} dk</span>
            {movie.genres?.slice(0, 3).map((g) => <span key={g} className="text-foreground/80">{g}</span>)}
          </div>
          <p className="text-sm sm:text-base text-muted-foreground line-clamp-3 max-w-xl">{movie.description}</p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link to={`/izle/${movie.id}`} className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-lg transition-colors">
              <Play className="w-5 h-5 fill-white" /> İzlemeye Başla
            </Link>
            <button onClick={add} className="inline-flex items-center gap-2 glass border border-border hover:bg-secondary px-5 py-3 rounded-lg font-semibold transition-colors">
              <Plus className="w-5 h-5" /> {inList ? 'Listemde' : 'Listeme Ekle'}
            </button>
            <Link to={`/izle/${movie.id}`} className="inline-flex items-center gap-2 glass border border-border hover:bg-secondary px-5 py-3 rounded-lg font-semibold transition-colors">
              <Info className="w-5 h-5" /> Detay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}