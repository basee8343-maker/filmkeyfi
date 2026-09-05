import { Image } from '@/components/ui/image';

const SIZES = { xs: 'h-12 w-12 text-[10px]', sm: 'h-[4.25rem] w-[4.25rem] text-xs', md: 'h-20 w-20 text-sm', lg: 'h-56 w-56 text-3xl' };

export default function FramedPortrait({ info, avatar, name, size = 'md', className = '', scale = 100 }) {
  const [x, y, width, height] = info.opening;
  const diameter = Math.min(width, height);
  const left = x + (width - diameter) / 2;
  const top = y + (height - diameter) / 2;
  const safeScale = Math.min(130, Math.max(70, Number(scale) || 100));
  return <div className={`relative isolate shrink-0 ${SIZES[size] || SIZES.md} ${className}`} title={info.label} style={{ transform: `scale(${safeScale / 100})`, transformOrigin: 'center' }}>
    <div className="absolute z-0 overflow-hidden rounded-full bg-background" style={{ left: `${left * 100}%`, top: `${top * 100}%`, width: `${diameter * 100}%`, height: `${diameter * 100}%` }}>
      {avatar ? <Image src={avatar} alt={name || 'Profil fotoğrafı'} className="h-full w-full scale-[1.12] object-cover object-center" fittingType="fill" focalPointX={0.5} focalPointY={0.5} />
        : <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-accent font-bold text-primary-foreground">{(name || '?')[0]}</span>}
    </div>
    <Image src={info.image_url} alt={info.label} fittingType="fit" className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-contain" />
  </div>;
}