import { useEffect, useRef, useState } from 'react';

// Rol bazlı tam ekran AI video overlay'i.
// Her rol için özel üretilmiş video dosyası oynatılır.
export default function RoleVideoOverlay({ url, isEntry, title, color = '#ff4500' }) {
  const videoRef = useRef(null);
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
    const fadeTimer = setTimeout(() => setFadeOut(true), 5500);
    const hideTimer = setTimeout(() => setVisible(false), 6000);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  if (!visible) return null;

  const displayTitle = title || (isEntry ? 'ODAYA KATILDI' : 'ODADAN AYRILDI');

  return (
    <div
      className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center overflow-hidden bg-black"
      style={{ animation: fadeOut ? 'founder-video-fade-out 0.5s ease-out forwards' : 'founder-video-fade-in 0.3s ease-out forwards' }}
    >
      <video
        ref={videoRef}
        src={url}
        className="w-full h-full object-cover"
        autoPlay
        muted
        playsInline
        preload="auto"
        onCanPlay={() => videoRef.current?.play().catch(() => {})}
        onLoadedData={() => videoRef.current?.play().catch(() => {})}
      />
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div style={{ animation: 'founder-text-appear 0.8s ease-out 0.3s forwards', opacity: 0 }}>
          <p
            className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-center leading-tight"
            style={{
              color: '#ffcc00',
              textShadow: `0 0 12px ${color}, 0 0 24px ${color}, 0 0 48px ${color}, 0 2px 4px rgba(0,0,0,0.9)`,
              letterSpacing: '0.05em',
            }}
          >
            {displayTitle}
          </p>
        </div>
      </div>
    </div>
  );
}