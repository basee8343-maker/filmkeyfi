import { Image } from '@/components/ui/image';

const SIZES = { sm: 'h-[4.25rem] w-[4.25rem] text-xs', md: 'h-20 w-20 text-sm', lg: 'h-56 w-56 text-3xl' };

export default function FramedPortrait({ info, avatar, name, size = 'md', className = '' }) {
  const [x, y, width, height] = info.opening;
  const mask = { maskImage: `url("${info.mask_url}")`, WebkitMaskImage: `url("${info.mask_url}")`, maskSize: '100% 100%', WebkitMaskSize: '100% 100%', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat', maskMode: 'alpha' };
  return <div className={`relative isolate shrink-0 ${SIZES[size] || SIZES.md} ${className}`} title={info.label}>
    <div className="absolute inset-0" style={mask}>
      <div className="absolute overflow-hidden bg-background" style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${width * 100}%`, height: `${height * 100}%` }}>
        {avatar ? <Image src={avatar} alt={name || 'Profil fotoğrafı'} className="h-full w-full object-cover object-center" fittingType="fill" focalPointX={0.5} focalPointY={0.5} />
          : <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-accent font-bold text-primary-foreground">{(name || '?')[0]}</span>}
      </div>
    </div>
    <Image src={info.image_url} alt={info.label} fittingType="fit" className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-contain" />
  </div>;
}