import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FRAME_DEFINITIONS } from '@/lib/roles';
import ProfileFrame from '@/components/ProfileFrame';
import { useToast } from '@/components/ui/use-toast';

export default function ProfileFrames({ user, onUpdated }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState('');
  const [zoom, setZoom] = useState(user.profile_frame_scale || 100);
  const [zoomSaving, setZoomSaving] = useState(false);
  const keys = [...new Set([...(user.unlocked_profile_frames || []), user.profile_frame].filter((key) => FRAME_DEFINITIONS[key]))];
  const choose = async (key) => {
    setSaving(key || 'remove');
    try {
      await base44.functions.invoke('update-profile', { profile_frame: key });
      await onUpdated?.();
      toast({ title: key ? 'Çerçeve takıldı' : 'Çerçeve kaldırıldı' });
    } catch (error) { toast({ title: 'Çerçeve değiştirilemedi', description: error.response?.data?.error || error.message, variant: 'destructive' }); }
    finally { setSaving(''); }
  };
  const saveZoom = async () => {
    setZoomSaving(true);
    try {
      await base44.functions.invoke('update-profile', { profile_frame_scale: Number(zoom) });
      await onUpdated?.();
      toast({ title: 'Profil yakınlaştırma kaydedildi' });
    } catch (error) { toast({ title: 'Kaydedilemedi', description: error.response?.data?.error || error.message, variant: 'destructive' }); }
    finally { setZoomSaving(false); }
  };
  return <section className="rounded-2xl border border-border bg-card p-5">
    <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-bold">Çerçevelerim</h2><p className="text-xs text-muted-foreground">Adminin verdiği ve LVL ile açtığın çerçeveler.</p></div><button disabled={!!saving || !user.profile_frame} onClick={() => choose('')} className="rounded-lg bg-secondary px-3 py-2 text-xs font-semibold disabled:opacity-50">Kaldır</button></div>
    {!keys.length ? <p className="text-sm text-muted-foreground">Henüz açılmış çerçeven yok.</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {keys.map((key) => { const info = FRAME_DEFINITIONS[key]; return <button key={key} disabled={!!saving} onClick={() => choose(key)} className={`rounded-xl border p-2 text-center disabled:opacity-50 ${user.profile_frame === key ? 'border-primary bg-primary/10' : 'border-border bg-secondary/30'}`}><div className="mx-auto flex h-28 items-center justify-center"><ProfileFrame frame={key} avatar={user.avatar} name={user.username || user.full_name} size="md" frameScale={zoom} /></div><span className="text-xs font-semibold">{info.label}{user.profile_frame === key ? ' · Takılı' : ''}</span></button>; })}
    </div>}
    {user.profile_frame && <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-secondary/30 p-3">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-visible"><ProfileFrame frame={user.profile_frame} avatar={user.avatar} name={user.username || user.full_name} size="sm" frameScale={zoom} /></div>
      <div className="min-w-[180px] flex-1"><div className="mb-1 flex justify-between text-xs font-semibold"><span>Profil yakınlaştırma</span><span>%{zoom}</span></div><input type="range" min="80" max="180" step="1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-primary" /><p className="mt-1 text-[10px] text-muted-foreground">Çerçeve sabit kalır, sadece fotoğrafın yakınlaşır.</p><button disabled={zoomSaving} onClick={saveZoom} className="mt-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">{zoomSaving ? 'Kaydediliyor...' : 'Yakınlaştırmayı Kaydet'}</button></div>
    </div>}
  </section>;
}