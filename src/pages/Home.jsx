import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Hero from '@/components/movie/Hero';
import ContentRow from '@/components/movie/ContentRow';
import ActiveRooms from '@/components/movie/ActiveRooms';
import CategoryRow from '@/components/movie/CategoryRow';
import { SkeletonRow } from '@/components/movie/EmptyState';
import { MessageCircle } from 'lucide-react';


export default function Home() {
  const [featured, setFeatured] = useState(null);
  const [rows, setRows] = useState({ featured: [], popular: [], new: [], most: [], action: [], scifi: [], comedy: [], horror: [], drama: [], anim: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const all = await base44.entities.Movie.filter({ published: true }, '-views', 200);
        const feat = all.filter((m) => m.featured);
        setFeatured(feat[0] || all[0] || null);
        setRows({
          featured: feat.slice(0, 12),
          popular: all.filter((m) => m.popular).slice(0, 12),
          new: [...all].sort((a, b) => (b.year || 0) - (a.year || 0)).slice(0, 12),
          most: [...all].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 12),
          action: all.filter((m) => m.genres?.includes('Aksiyon')).slice(0, 12),
          scifi: all.filter((m) => m.genres?.includes('Bilim Kurgu')).slice(0, 12),
          comedy: all.filter((m) => m.genres?.includes('Komedi')).slice(0, 12),
          horror: all.filter((m) => m.genres?.includes('Korku')).slice(0, 12),
          drama: all.filter((m) => m.genres?.includes('Dram')).slice(0, 12),
          anim: all.filter((m) => m.genres?.includes('Animasyon')).slice(0, 12),
        });
      } finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  return (
    <div className="min-h-screen bg-catalog text-white">
      <Hero movie={featured} />
      <div className="px-4 sm:px-6 mt-4">
        <button
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('FILMKEYFİ\'ye katıl! 🎬🍿 https://flimkeyfii.base44.app')}`, '_blank', 'noopener,noreferrer')}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-white transition-transform active:scale-95"
          style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
        >
          <MessageCircle className="w-5 h-5" /> Arkadaşını Davet Et
        </button>
      </div>
      <CategoryRow />
      <div className="mt-4">
        {loading ? <><SkeletonRow /><SkeletonRow /><SkeletonRow /></> : (
          <>
            <ContentRow title="Popüler Filmler" movies={rows.popular} to="/filmler" />
            <ActiveRooms />
            <ContentRow title="Öne Çıkanlar" movies={rows.featured} to="/filmler" />
            <ContentRow title="Yeni Eklenenler" movies={rows.new} to="/filmler" />
            <ContentRow title="En Çok İzlenenler" movies={rows.most} to="/filmler" />
            <ContentRow title="Aksiyon" movies={rows.action} to="/filmler?genre=Aksiyon" />
            <ContentRow title="Bilim Kurgu" movies={rows.scifi} to="/filmler?genre=Bilim Kurgu" />
            <ContentRow title="Komedi" movies={rows.comedy} to="/filmler?genre=Komedi" />
            <ContentRow title="Korku" movies={rows.horror} to="/filmler?genre=Korku" />
            <ContentRow title="Dram" movies={rows.drama} to="/filmler?genre=Dram" />
            <ContentRow title="Animasyon" movies={rows.anim} to="/filmler?genre=Animasyon" />
          </>
        )}
      </div>

    </div>
  );
}