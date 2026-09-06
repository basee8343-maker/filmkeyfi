import { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { useFrameCatalog } from '@/lib/FrameCatalogContext';
import { Image } from '@/components/ui/image';
import PreparedFrameImage from '@/components/xp/PreparedFrameImage';
import { Minus, Plus, Upload, Save, RotateCcw, Move } from 'lucide-react';

// Profil fotoğrafını çerçeve içinde sürükleyerek kaydırma ve yakınlaştırma aracı.
// `targetUserId` verilirse admin modu (başka kullanıcının profilini düzenler), yoksa kendi profili.
export default function AvatarPositioner({ user, targetUserId, onSaved }) {
  const { toast } = useToast();
  const { frames } = useFrameCatalog();
  const frame = user.profile_frame;
  const info = frame ? frames[frame] : null;
  const isAdmin = !!targetUserId && targetUserId !== user?.id;
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [scale, setScale] = useState(user.profile_frame_scale || 100);
  const [panX, setPanX] = useState(user.profile_avatar_x || 0);
  const [panY, setPanY] = useState(user.profile_avatar_y || 0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const windowRef = useRef(null);
  const drag = useRef({ active: false, startX: 0, startY: 0, origX: 0, origY: 0, width: 1 });

  if (!info) return <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Çerçeve takılı değil. Önce bir çerçeve seçin, sonra fotoğrafı konumlandırabilirsiniz.</p>;

  const [ox, oy, ow, oh] = info.opening;
  const diameter = Math.min(ow, oh);
  const left = ox + (ow - diameter) / 2;
  const top = oy + (oh - diameter) / 2;

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { const { file_url } = await base44.integrations.Core.UploadFile({ file }); setAvatar(file_url); }
    catch { toast({ title: 'Yükleme hatası', variant: 'destructive' }); }
    finally { setUploading(false); }
  };

  const onPointerDown = (e) => {
    const rect = windowRef.current?.getBoundingClientRect();
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, origX: panX, origY: panY, width: rect?.width || 1 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current.active) return;
    const s = scale / 100;
    const dx = ((e.clientX - drag.current.startX) / drag.current.width) * 100 / s;
    const dy = ((e.clientY - drag.current.startY) / drag.current.width) * 100 / s;
    setPanX(Math.max(-100, Math.min(100, Math.round(drag.current.origX + dx))));
    setPanY(Math.max(-100, Math.min(100, Math.round(drag.current.origY + dy))));
  };
  const onPointerUp = (e) => { drag.current.active = false; try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {} };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { avatar, profile_frame_scale: Number(scale), profile_avatar_x: Number(panX), profile_avatar_y: Number(panY) };
      if (isAdmin) await base44.entities.User.update(targetUserId, payload);
      else await base44.functions.invoke('update-profile', payload);
      await onSaved?.();
      toast({ title: 'Profil fotoğrafı konumu kaydedildi' });
    } catch (e) { toast({ title: 'Kaydedilemedi', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  const reset = () => { setScale(100); setPanX(0); setPanY(0); };

  return <section className="rounded-2xl border border-border bg-card p-5">
    <div className="mb-3 flex items-center justify-between gap-2"><div><h2 className="font-bold">Fotoğraf Konumlandırma{isAdmin ? ' (Admin)' : ''}</h2><p className="text-xs text-muted-foreground">Sürükleyerek kaydır, yakınlaştır ile mükemmel yeri bul.</p></div><button onClick={reset} className="rounded-lg bg-secondary px-3 py-2 text-xs font-semibold flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" />Sıfırla</button></div>
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="relative h-56 w-56 shrink-0 select-none" style={{ touchAction: 'none' }}>
        <div ref={windowRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} className="absolute cursor-grab overflow-hidden rounded-full ring-1 ring-border/30 active:cursor-grabbing" style={{ left: `${left * 100}%`, top: `${top * 100}%`, width: `${diameter * 100}%`, height: `${diameter * 100}%` }}>
          {avatar ? <div className="h-full w-full" style={{ transform: `scale(${scale / 100}) translate(${panX}%, ${panY}%)` }}><Image src={avatar} alt="Profil" className="h-full w-full object-cover" fittingType="fill" /></div>
          : <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Fotoğraf yok</div>}
        </div>
        <div className="pointer-events-none absolute inset-0"><PreparedFrameImage src={info.image_url} opening={info.opening} /></div>
      </div>
      <div className="w-full max-w-xs space-y-3">
        <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 px-4 py-3 text-sm font-semibold cursor-pointer">
          <Upload className="w-4 h-4" /> {uploading ? 'Yükleniyor...' : 'Fotoğraf Yükle'}
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
        </label>
        <div>
          <div className="mb-1 flex justify-between text-xs font-semibold"><span className="flex items-center gap-1"><Move className="w-3 h-3" />Kaydır (X)</span><span>{panX}</span></div>
          <input type="range" min="-100" max="100" step="1" value={panX} onChange={(e) => setPanX(Number(e.target.value))} className="w-full accent-primary" />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs font-semibold"><span>Kaydır (Y)</span><span>{panY}</span></div>
          <input type="range" min="-100" max="100" step="1" value={panY} onChange={(e) => setPanY(Number(e.target.value))} className="w-full accent-primary" />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs font-semibold"><span>Yakınlaştır</span><span>%{scale}</span></div>
          <div className="flex items-center gap-2"><button onClick={() => setScale((s) => Math.max(80, s - 5))} className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary border border-border"><Minus className="w-4 h-4" /></button><input type="range" min="80" max="180" step="1" value={scale} onChange={(e) => setScale(Number(e.target.value))} className="flex-1 accent-primary" /><button onClick={() => setScale((s) => Math.min(180, s + 5))} className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary border border-border"><Plus className="w-4 h-4" /></button></div>
        </div>
        <button onClick={save} disabled={saving} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2"><Save className="w-4 h-4" />{saving ? 'Kaydediliyor...' : 'Konumu Kaydet'}</button>
      </div>
    </div>
  </section>;
}