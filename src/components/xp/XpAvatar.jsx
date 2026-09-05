import { Image } from '@/components/ui/image';

const SIZES = { xs: 'h-8 w-8 text-[10px]', sm: 'h-10 w-10 text-xs', md: 'h-14 w-14 text-sm', lg: 'h-24 w-24 text-3xl' };

// Unassigned users display only their profile photo, never an automatic XP frame.
export default function XpAvatar({ avatar, name, size = 'sm', className = '' }) {
  return <div className={`relative shrink-0 overflow-hidden rounded-full bg-background ${SIZES[size] || SIZES.sm} ${className}`}>
    {avatar ? <Image src={avatar} alt={name || 'Profil fotoğrafı'} className="h-full w-full object-cover" fittingType="fill" focalPointX={0.5} focalPointY={0.5} />
      : <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-accent font-bold text-primary-foreground">{(name || '?')[0]}</span>}
  </div>;
}