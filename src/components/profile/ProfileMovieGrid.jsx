import { Link } from 'react-router-dom';
import { Image } from '@/components/ui/image';

export default function ProfileMovieGrid({ movies, empty }) {
  if (!movies.length) return <p className="py-12 text-center text-sm text-muted-foreground">{empty}</p>;
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{movies.map((movie) => <Link key={movie.id} to={`/izle/${movie.id}`} className="overflow-hidden rounded-xl border border-border bg-card"><Image src={movie.poster} alt={movie.title} className="w-full aspect-[2/3]" fittingType="fill" /><p className="p-2.5 text-sm font-medium truncate">{movie.title}</p></Link>)}</div>;
}