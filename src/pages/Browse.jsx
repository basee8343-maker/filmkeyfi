import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import MovieCard from '@/components/movie/MovieCard';
import EmptyState, { SkeletonRow } from '@/components/movie/EmptyState';
import { Film } from 'lucide-react';

export default function Browse({ type, title }) {
  const [movies, setMovies] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState('all');

  useEffect(() => {
    Promise.all([
      base44.entities.Movie.filter({ published: true, type }, '-views', 300).catch(() => []),
      base44.entities.Category.list('name', 200).catch(() => []),
    ]).then(([m, c]) => { setMovies(m); setCats(c); setLoading(false); });
  }, [type]);

  const catName = (id) => cats.find((c) => c.id === id)?.name;
  const filtered = activeCat === 'all' ? movies : movies.filter((m) => m.category_id === activeCat || m.category === catName(activeCat));

  return (
    <div className="min-h-screen bg-catalog px-4 py-6 text-white sm:px-6">
      <h1 className="text-2xl sm:text-3xl font-extrabold mb-4">{title}</h1>
      {cats.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-4">
          <button onClick={() => setActiveCat('all')} className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${activeCat === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>Tümü</button>
          {cats.map((c) => (
            <button key={c.id} onClick={() => setActiveCat(c.id)} className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${activeCat === c.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>{c.name}</button>
          ))}
        </div>
      )}
      {loading ? <SkeletonRow /> :
       filtered.length === 0 ? <EmptyState icon={Film} title="İçerik bulunamadı" description="Bu kategoride henüz içerik yok." /> :
       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
         {filtered.map((m) => <div key={m.id} className="w-full"><MovieCard movie={m} /></div>)}
       </div>}
    </div>
  );
}