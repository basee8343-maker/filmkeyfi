import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Giriş ekranında yayınlanmış tanıtım videosunu arka plan oynatır.
// Yayınlanmış video yoksa hiçbir şey render etmez (statik arka plan kalır).
export default function LoginPromoVideo() {
  const [video, setVideo] = useState(null);

  useEffect(() => {
    let active = true;
    base44.entities.PromoVideo.filter({ status: 'published' }, '-created_date', 1)
      .then((list) => { if (active) setVideo(list[0] || null); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!video?.file_url) return null;

  return (
    <video
      src={video.file_url}
      autoPlay
      muted
      loop
      playsInline
      className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
    />
  );
}