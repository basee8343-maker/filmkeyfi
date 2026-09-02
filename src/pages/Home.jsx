import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Hero from '@/components/movie/Hero';
import ContentRow from '@/components/movie/ContentRow';
import { SkeletonRow } from '@/components/movie/EmptyState';


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
      <div className="mt-6">
        {loading ? <><SkeletonRow /><SkeletonRow /><SkeletonRow /></> : (
          <>
            <ContentRow title="Öne Çıkanlar" movies={rows.featured} />
            <ContentRow title="Popüler Filmler" movies={rows.popular} />
            <ContentRow title="Yeni Eklenenler" movies={rows.new} />
            <ContentRow title="En Çok İzlenenler" movies={rows.most} />
            <ContentRow title="Aksiyon" movies={rows.action} />
            <ContentRow title="Bilim Kurgu" movies={rows.scifi} />
            <ContentRow title="Komedi" movies={rows.comedy} />
            <ContentRow title="Korku" movies={rows.horror} />
            <ContentRow title="Dram" movies={rows.drama} />
            <ContentRow title="Animasyon" movies={rows.anim} />
          </>
        )}
      </div>

    </div>
  );
}