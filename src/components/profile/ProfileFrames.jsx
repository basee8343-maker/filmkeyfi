import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FRAME_DEFINITIONS } from '@/lib/roles';
import ProfileFrame from '@/components/ProfileFrame';
import { useToast } from '@/components/ui/use-toast';

export default function ProfileFrames({ user, onUpdated }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState('');
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
  return <section className="rounded-2xl border border-border bg-card p-5">
    <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-bold">Çerçevelerim</h2><p className="text-xs text-muted-foreground">Adminin verdiği ve LVL ile açtığın çerçeveler.</p></div><button disabled={!!saving || !user.profile_frame} onClick={() => choose('')} className="rounded-lg bg-secondary px-3 py-2 text-xs font-semibold disabled:opacity-50">Kaldır</button></div>
    {!keys.length ? <p className="text-sm text-muted-foreground">Henüz açılmış çerçeven yok.</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {keys.map((key) => { const info = FRAME_DEFINITIONS[key]; return <button key={key} disabled={!!saving} onClick={() => choose(key)} className={`rounded-xl border p-2 text-center disabled:opacity-50 ${user.profile_frame === key ? 'border-primary bg-primary/10' : 'border-border bg-secondary/30'}`}><div className="mx-auto flex h-28 items-center justify-center"><ProfileFrame frame={key} avatar={user.avatar} name={user.username || user.full_name} size="md" /></div><span className="text-xs font-semibold">{info.label}{user.profile_frame === key ? ' · Takılı' : ''}</span></button>; })}
    </div>}
  </section>;
}