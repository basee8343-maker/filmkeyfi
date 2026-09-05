import { useEffect, useState } from 'react';
import { getFrameMetrics, getTransparentFrame, makeTransparentFrame } from '@/components/xp/frameTransparency';

export default function TransparentFrameImage({ src, animated, crop, onMetrics }) {
  const [transparentSrc, setTransparentSrc] = useState(() => getTransparentFrame(src, crop));

  useEffect(() => {
    let active = true;
    const cached = getTransparentFrame(src, crop);
    if (cached) {
      setTransparentSrc(cached);
      onMetrics?.(getFrameMetrics(src, crop));
    } else {
      setTransparentSrc('');
      makeTransparentFrame(src, crop).then((url) => {
        if (!active) return;
        setTransparentSrc(url);
        onMetrics?.(getFrameMetrics(src, crop));
      });
    }
    return () => { active = false; };
  }, [src, crop, onMetrics]);

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