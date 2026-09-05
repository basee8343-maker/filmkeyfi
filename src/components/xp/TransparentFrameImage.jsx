import { useEffect, useState } from 'react';
import { getTransparentFrame, makeTransparentFrame } from '@/components/xp/frameTransparency';

export default function TransparentFrameImage({ src, animated, crop }) {
  const [transparentSrc, setTransparentSrc] = useState(() => getTransparentFrame(src, crop));

  useEffect(() => {
    let active = true;
    const cached = getTransparentFrame(src, crop);
    if (cached) setTransparentSrc(cached);
    else {
      setTransparentSrc('');
      makeTransparentFrame(src, crop).then((url) => active && setTransparentSrc(url));
    }
    return () => { active = false; };
  }, [src, crop]);

  if (!transparentSrc) return null;
  return (
    <img
      src={transparentSrc}
      alt=""
      aria-hidden="true"
      className={`w-full h-full max-w-none object-contain overflow-visible ${animated ? 'xp-frame-asset' : ''}`}
    />
  );
}