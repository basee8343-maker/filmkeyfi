import { useState } from 'react';

// Bir PromoVideo'nun kliplerini arka arkaya, döngüsel oynatan oynatıcı.
// Tek klipte loop, çoklu klipte sırayla ilerleyip başa döner.
// muted + playsInline + autoplay => iOS Safari ve Android Chrome'da otomatik oynar.
export default function PromoPlaylist({ clips, controls, className, muted = true }) {
  const [idx, setIdx] = useState(0);
  if (!clips || !clips.length) return null;
  const src = clips[idx % clips.length];
  const single = clips.length <= 1;
  return (
    <video
      key={src}
      src={src}
      autoPlay
      muted={muted}
      loop={single}
      controls={controls}
      playsInline
      preload="auto"
      className={className}
      onEnded={() => { if (!single) setIdx((i) => (i + 1) % clips.length); }}
    />
  );
}