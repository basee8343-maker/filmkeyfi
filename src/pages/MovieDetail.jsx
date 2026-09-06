import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { Play, Plus, Check, Heart, Share2, Star, Clock, Globe, Captions, Calendar } from 'lucide-react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import MovieCard from '@/components/movie/MovieCard';
import EmptyState from '@/components/movie/EmptyState';

export default function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inList, setInList] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [similar, setSimilar] = useState([]);

  useEffect(() => {
    setLoading(true);
    base44.entities.Movie.filter({ id }, '-created_date', 1).then(async (matches) => {
      const m = matches[0] || null;
      setMovie(m);
      if (m) {
        base44.entities.Movie.update(id, { views: (m.views || 0) + 1 }).catch(() => {});
        const sim = await base44.entities.Movie.filter({ published: true, category: m.category }, '-views', 12).catch(() => []);
        setSimilar(sim.filter((s) => s.id !== id).slice(0, 10));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user || !movie) return;
    base44.entities.Watchlist.filter({ user_id: user.id, movie_id: id }).then((r) => setInList(r.length > 0)).catch(() => {});
    base44.entities.Favorite.filter({ user_id: user.id, movie_id: id }).then((r) => setIsFav(r.length > 0)).catch(() => {});
  }, [user?.id, id, movie]);

  if (loading) return <div className="h-[60vh] bg-secondary animate-pulse rounded-xl m-4" />;
  if (!movie) return <EmptyState title="İçerik bulunamadı" />;

  const toggleList = async () => {
    if (inList) { await base44.entities.Watchlist.deleteMany({ user_id: user.id, movie_id: id }); setInList(false); }
    else { await base44.entities.Watchlist.create({ user_id: user.id, movie_id: id }); setInList(true); toast({ title: 'Listenize eklendi' }); }
  };
  const toggleFav = async () => {
    if (isFav) { await base44.entities.Favorite.deleteMany({ user_id: user.id, movie_id: id }); setIsFav(false); }
    else { await base44.entities.Favorite.create({ user_id: user.id, movie_id: id }); setIsFav(true); toast({ title: 'Favorilere eklendi' }); }
  };
  const share = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: movie.title, url }).catch(() => {});
    else { navigator.clipboard.writeText(url); toast({ title: 'Link kopyalandı' }); }
  };

  return (
    <div>
      <div className="relative h-[50vh] sm:h-[60vh] -mt-16 w-full overflow-hidden">
        <Image src={movie.backdrop || movie.poster} alt={movie.title} className="absolute inset-0 w-full h-full object-cover" fittingType="fill" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>
      <div className="px-4 sm:px-6 -mt-32 sm:-mt-40 relative">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="w-32 sm:w-48 shrink-0 rounded-xl overflow-hidden border border-border cinema-shadow">
            <Image src={movie.poster} alt={movie.title} className="w-full aspect-[2/3] object-cover" fittingType="fill" />
          </div>
          <div className="flex-1 space-y-4">
            <h1 className="text-2xl sm:text-4xl font-extrabold">{movie.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {movie.imdb && <span className="flex items-center gap-1 text-amber-300 font-semibold"><Star className="w-4 h-4 fill-amber-400" />{movie.imdb}</span>}
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{movie.year}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{movie.duration || 0} dk</span>
              <span className="flex items-center gap-1"><Globe className="w-4 h-4" />{movie.language || 'TR'}</span>
              <span className="flex items-center gap-1"><Captions className="w-4 h-4" />{movie.subtitle || 'Altyazılı'}</span>
              <span className="bg-secondary px-2 py-0.5 rounded text-xs font-bold">{movie.quality}</span>
              {movie.age_rating && <span className="border border-border px-1.5 rounded text-xs">{movie.age_rating}</span>}
            </div>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">{movie.description}</p>
            <div className="flex flex-wrap gap-2">
              {movie.genres?.map((g) => <span key={g} className="text-xs bg-secondary px-2 py-1 rounded">{g}</span>)}
            </div>
            <div className="space-y-1 text-sm">
              {movie.director && <p><span className="text-muted-foreground">Yönetmen:</span> {movie.director}</p>}
              {movie.cast?.length > 0 && <p><span className="text-muted-foreground">Oyuncular:</span> {movie.cast.join(', ')}</p>}
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button onClick={() => navigate(`/video/${movie.id}`)} className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-lg">
                <Play className="w-5 h-5 fill-white" /> İzle
              </button>
              <button onClick={toggleList} className="inline-flex items-center gap-2 glass border border-border hover:bg-secondary px-5 py-3 rounded-lg font-semibold">
                {inList ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />} {inList ? 'Listemde' : 'Listeme Ekle'}
              </button>
              <button onClick={toggleFav} className={`inline-flex items-center gap-2 glass border border-border hover:bg-secondary px-5 py-3 rounded-lg font-semibold ${isFav ? 'text-red-400' : ''}`}>
                <Heart className={`w-5 h-5 ${isFav ? 'fill-red-400' : ''}`} /> Favori
              </button>
              <button onClick={share} className="inline-flex items-center gap-2 glass border border-border hover:bg-secondary px-5 py-3 rounded-lg font-semibold">
                <Share2 className="w-5 h-5" /> Paylaş
              </button>
            </div>
          </div>
        </div>

        {movie.type === 'series' && <Seasons seriesId={movie.id} />}
        {movie.cast?.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold mb-3">Oyuncular</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {movie.cast.map((c) => (
                <div key={c} className="flex flex-col items-center w-24 shrink-0">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold">{c[0]}</div>
                  <span className="text-xs text-center mt-2">{c}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10 mb-10">
          <h2 className="text-xl font-bold mb-3">Benzer İçerikler</h2>
          {similar.length === 0 ? <p className="text-sm text-muted-foreground">Benzer içerik bulunamadı.</p> :
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">{similar.map((m) => <MovieCard key={m.id} movie={m} />)}</div>}
        </section>
      </div>
    </div>
  );
}

function Seasons({ seriesId }) {
  const [eps, setEps] = useState([]);
  useEffect(() => { base44.entities.Episode.filter({ series_id: seriesId }, 'season', 100).then(setEps).catch(() => {}); }, [seriesId]);
  const seasons = [...new Set(eps.map((e) => e.season))];
  if (eps.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold mb-3">Bölümler</h2>
      {seasons.map((s) => (
        <div key={s} className="mb-4">
          <h3 className="font-semibold mb-2">{s}. Sezon</h3>
          <div className="space-y-2">
            {eps.filter((e) => e.season === s).map((e) => (
              <Link to={`/video/${seriesId}?ep=${e.id}`} key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:bg-secondary transition-colors">
                <span className="w-8 h-8 rounded bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">{e.episode}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.duration || 0} dk</p>
                </div>
                <Play className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}