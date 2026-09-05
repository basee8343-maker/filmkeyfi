import { useEffect, useState } from 'react';
import { makeTransparentFrame } from '@/components/xp/frameTransparency';

export default function TransparentFrameImage({ src, animated }) {
  const [transparentSrc, setTransparentSrc] = useState('');

  useEffect(() => {
    let active = true;
    setTransparentSrc('');
    makeTransparentFrame(src).then((url) => active && setTransparentSrc(url));
    return () => { active = false; };
  }, [src]);

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