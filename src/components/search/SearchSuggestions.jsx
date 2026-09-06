import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function SearchSuggestions({ query, onSelect }) {
  const [movies, setMovies] = useState([]);
  useEffect(() => {
    base44.entities.Movie.filter({ published: true }, '-views', 300).then(setMovies).catch(() => setMovies([]));
  }, []);
  const results = useMemo(() => {
    const value = query.trim().toLocaleLowerCase('tr-TR');
    if (value.length < 2) return [];
    return movies.filter((movie) => movie.title?.toLocaleLowerCase('tr-TR').includes(value)).slice(0, 6);
  }, [movies, query]);
  if (!results.length) return null;
  return <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#16161e] py-1 shadow-2xl">
    {results.map((movie) => <Link key={movie.id} to={`/izle/${movie.id}`} onClick={onSelect} className="block truncate px-4 py-2.5 text-sm text-white hover:bg-purple-500/15">
      {movie.title}
    </Link>)}
  </div>;
}