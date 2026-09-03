import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PromoPlaylist from '@/components/PromoPlaylist';

// Giriş ekranında yayınlanmış tanıtım videosunu arka plan oynatır.
// Klipler sırayla oynar, bitince başa döner. Yayınlanan video yoksa null.
export default function LoginPromoVideo() {
  const [video, setVideo] = useState(null);

  useEffect(() => {
    let active = true;
    base44.entities.PromoVideo.filter({ status: 'published' }, '-created_date', 1)
      .then((list) => { if (active) setVideo(list[0] || null); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const clips = video?.clips?.length ? video.clips : (video?.file_url ? [video.file_url] : null);
  if (!clips) return null;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none">
      <PromoPlaylist
        clips={clips}
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/35" />
    </div>
  );
}