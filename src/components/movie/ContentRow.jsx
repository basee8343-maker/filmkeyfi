import { Link } from 'react-router-dom';
import MovieCard from '@/components/movie/MovieCard';

export default function ContentRow({ title, movies, to }) {
  if (!movies?.length) return null;
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between px-4 sm:px-6 mb-3">
        <h2 className="text-lg sm:text-xl font-bold text-white">{title}</h2>
        {to && <Link to={to} className="text-sm text-gray-400 hover:text-purple-400">Tümü →</Link>}
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 sm:px-6 pb-2">
        {movies.map((m) => <MovieCard key={m.id} movie={m} className="w-[150px] sm:w-[180px] shrink-0" />)}
      </div>
    </section>
  );
}