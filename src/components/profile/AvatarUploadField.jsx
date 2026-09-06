import { Camera, Loader2 } from 'lucide-react';
import { Image } from '@/components/ui/image';

export default function AvatarUploadField({ avatar, name, uploading, onChange }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <p className="mb-3 text-sm font-medium text-foreground">Profil Fotoğrafı</p>
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-secondary">
          {avatar ? <Image src={avatar} className="h-full w-full" fittingType="fill" alt="Profil fotoğrafı önizlemesi" /> : <span className="flex h-full w-full items-center justify-center text-xl font-bold">{(name || '?')[0]}</span>}
          {uploading && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><Loader2 className="h-5 w-5 animate-spin text-white" /></div>}
        </div>
        <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {uploading ? 'Yükleniyor...' : 'Fotoğraf Seç'}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploading} onChange={onChange} />
        </label>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">PNG, JPG veya WebP seçin; ardından Kaydet'e dokunun.</p>
    </div>
  );
}