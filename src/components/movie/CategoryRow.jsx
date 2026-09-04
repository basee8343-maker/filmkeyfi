import { Link } from 'react-router-dom';
import { Film, Heart, Drama, Compass, Laugh, Ghost, Sparkles, Swords, Popcorn } from 'lucide-react';

const CATEGORIES = [
  { name: 'Tümü', icon: Film, path: '/filmler' },
  { name: 'Aksiyon', icon: Swords, path: '/filmler?genre=Aksiyon' },
  { name: 'Macera', icon: Compass, path: '/filmler?genre=Macera' },
  { name: 'Komedi', icon: Laugh, path: '/filmler?genre=Komedi' },
  { name: 'Dram', icon: Drama, path: '/filmler?genre=Dram' },
  { name: 'Romantik', icon: Heart, path: '/filmler?genre=Romantik' },
  { name: 'Korku', icon: Ghost, path: '/filmler?genre=Korku' },
  { name: 'Bilim Kurgu', icon: Sparkles, path: '/filmler?genre=Bilim Kurgu' },
  { name: 'Animasyon', icon: Popcorn, path: '/filmler?genre=Animasyon' },
];

export default function CategoryRow() {
  return (
    <section className="mb-6 mt-4">
      <div className="flex items-center justify-between px-4 sm:px-6 mb-3">
        <h2 className="text-lg sm:text-xl font-bold text-white">Kategoriler</h2>
        <Link to="/filmler" className="text-sm text-[#808080] hover:text-white">Tümü →</Link>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 sm:px-6 pb-2">
        {CATEGORIES.map((cat, i) => {
          const Icon = cat.icon;
          const isActive = i === 0;
          return (
            <Link
              key={cat.name}
              to={cat.path}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                isActive ? 'text-white' : 'bg-[#1a1a1a] text-[#a0a0a0] hover:text-white'
              }`}
              style={isActive ? { background: 'linear-gradient(135deg, #8B31FF, #5F24A1)' } : {}}
            >
              <Icon className="w-4 h-4" />
              {cat.name}
            </Link>
          );
        })}
      </div>
    </section>
  );
}