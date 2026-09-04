import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import VideoPlayer from '@/components/player/VideoPlayer';
import { useCurrentUser, membershipActive } from '@/lib/useCurrentUser';
import { Lock, ArrowLeft } from 'lucide-react';
import SubscriptionPrompt from '@/components/SubscriptionPrompt';

export default function Watch() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const epId = sp.get('ep');
  const { user, loading: ul } = useCurrentUser();
  const [movie, setMovie] = useState(null);
  const [episode, setEpisode] = useState(null);
  const [src, setSrc] = useState('');
  const [videoError, setVideoError] = useState('');
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Movie.get(id).then(async (m) => {
      setMovie(m);
      let ep = null;
      if (epId) {
        const eps = await base44.entities.Episode.filter({ series_id: id }, 'season', 100).catch(() => []);
        ep = eps.find((e) => e.id === epId) || eps[0] || null;
        setEpisode(ep);
      }
      try {
        const res = await base44.functions.invoke('authorize-video', { movie_id: id, episode_id: ep?.id });
        setSrc(res.data.url);
      } catch (e) {
        if (e.response?.data?.expired) setExpired(true);
        else setVideoError(e.response?.data?.error || 'Video yüklenemedi');
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, epId]);

  useEffect(() => {
    if (!user || !movie) return;
    base44.entities.WatchHistory.filter({ user_id: user.id, movie_id: id }).then((r) => {
      if (r.length === 0) base44.entities.WatchHistory.create({ user_id: user.id, movie_id: id, movie_title: movie.title, progress: 0 }).catch(() => {});
    }).catch(() => {});
  }, [user?.id, movie?.id]);

  if (ul || loading) return <div className="h-[60vh] flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  if (!membershipActive(user)) {
    return <SubscriptionPrompt />;
  }

  if (!movie) return <p className="p-6">İçerik bulunamadı.</p>;

  return (
    <div className="px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <Link to={`/izle/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Geri</Link>
      </div>
      <h1 className="text-xl sm:text-2xl font-bold mb-1">{movie.title}{episode ? ` · ${episode.title}` : ''}</h1>
      <p className="text-sm text-muted-foreground mb-4">{movie.year} · {movie.quality} · {movie.language || 'TR'}</p>
      {videoError ? <div className="aspect-video bg-card border border-border rounded-xl flex flex-col items-center justify-center text-center p-6">
          <Lock className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-semibold mb-1">{videoError}</p>
        </div> :
       src ? <VideoPlayer src={src} title={movie.title} watermark={user} /> :
        <div className="aspect-video bg-card border border-border rounded-xl flex flex-col items-center justify-center text-center p-6">
          <Lock className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-semibold mb-1">Video kaynağı bulunamadı</p>
          <p className="text-sm text-muted-foreground">Bu içeriğe ait video bağlantısı henüz eklenmemiş.</p>
        </div>}
      <p className="text-sm text-muted-foreground mt-4 max-w-3xl">{movie.description}</p>
    </div>
  );
}