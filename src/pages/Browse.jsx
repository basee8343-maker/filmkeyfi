import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import MovieCard from '@/components/movie/MovieCard';
import EmptyState, { SkeletonRow } from '@/components/movie/EmptyState';
import { Film, Search, SlidersHorizontal } from 'lucide-react';

export default function Browse({ type, title }) {
  const [movies, setMovies] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState('all');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [yearFilter, setYearFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      base44.entities.Movie.filter({ published: true, type }, '-views', 300).catch(() => []),
      base44.entities.Category.list('name', 200).catch(() => []),
    ]).then(([m, c]) => { setMovies(m); setCats(c); setLoading(false); });
  }, [type]);

  const catName = (id) => cats.find((c) => c.id === id)?.name;
  let filtered = activeCat === 'all' ? movies : movies.filter((m) => m.category_id === activeCat || m.category === catName(activeCat));
  if (query.trim()) filtered = filtered.filter((m) => m.title?.toLowerCase().includes(query.toLowerCase()));
  if (yearFilter !== 'all') filtered = filtered.filter((m) => String(m.year) === yearFilter);
  if (sortBy === 'popular') filtered = [...filtered].sort((a, b) => (b.views || 0) - (a.views || 0));
  if (sortBy === 'rating') filtered = [...filtered].sort((a, b) => (b.imdb || 0) - (a.imdb || 0));
  if (sortBy === 'newest') filtered = [...filtered].sort((a, b) => (b.year || 0) - (a.year || 0));

  const years = [...new Set(movies.map((m) => m.year).filter(Boolean))].sort((a, b) => b - a);
  const subtitle = type === 'movie' ? 'Binlerce film arasından seçim yap' : 'Binlerce dizi arasından seçim yap';

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-4 py-5 text-white max-w-3xl mx-auto">
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="text-sm text-gray-400 mt-1 mb-4">{subtitle}</p>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Film ara..." className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#16161e] border border-white/5 text-sm placeholder:text-gray-500 outline-none focus:border-purple-500/50" />
      </div>

      {cats.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-3">
          <button onClick={() => setActiveCat('all')} className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap font-medium transition-all ${activeCat === 'all' ? 'text-white' : 'bg-[#16161e] text-gray-400'}`} style={activeCat === 'all' ? { background: 'linear-gradient(135deg, #7c3aed, #6b21a8)' } : {}}>Tümü</button>
          {cats.map((c) => (
            <button key={c.id} onClick={() => setActiveCat(c.id)} className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap font-medium transition-all ${activeCat === c.id ? 'text-white' : 'bg-[#16161e] text-gray-400'}`} style={activeCat === c.id ? { background: 'linear-gradient(135deg, #7c3aed, #6b21a8)' } : {}}>{c.name}</button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="flex-1 bg-[#16161e] border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none cursor-pointer">
          <option value="popular">Sırala: En Popüler</option>
          <option value="rating">Sırala: En Yüksek Puan</option>
          <option value="newest">Sırala: En Yeni</option>
        </select>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="flex-1 bg-[#16161e] border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none cursor-pointer">
          <option value="all">Yıl: Tümü</option>
          {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        <button className="p-2.5 rounded-lg bg-[#16161e] border border-white/5 text-gray-400 hover:text-purple-400"><SlidersHorizontal className="w-4 h-4" /></button>
      </div>

      {loading ? <SkeletonRow /> :
        filtered.length === 0 ? <EmptyState icon={Film} title="İçerik bulunamadı" description="Bu kategoride henüz içerik yok." /> :
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((m) => <MovieCard key={m.id} movie={m} />)}
        </div>}
    </div>
  );
}