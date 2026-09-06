import { useEffect, useState } from 'react';
import { getPreparedTransparent, makePreparedTransparent } from '@/components/xp/frameTransparency';

// Hazır çerçeveler için: açıklık koordinatlarını kullanarak orta daireyi şeffaf yapar.
// Görsel boyutu değişmez, kırpılmaz — sadece orta dairesel alan şeffaf olur.
export default function PreparedFrameImage({ src, opening, className = '' }) {
  const [transparentSrc, setTransparentSrc] = useState(() => getPreparedTransparent(src, opening));

  useEffect(() => {
    let active = true;
    const cached = getPreparedTransparent(src, opening);
    if (cached) {
      setTransparentSrc(cached);
    } else {
      setTransparentSrc('');
      makePreparedTransparent(src, opening).then((url) => {
        if (active) setTransparentSrc(url);
      });
    }
    return () => { active = false; };
  }, [src, opening]);

  if (!transparentSrc) return null;
  return (
    <img
      src={transparentSrc}
      alt=""
      aria-hidden="true"
      className={`pointer-events-none h-full w-full object-contain ${className}`}
    />
  );
}