import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import ProfileFrame from '@/components/ProfileFrame';

export default function FrameDisplaySettings({ user, onUpdated }) {
  const { toast } = useToast();
  const [scale, setScale] = useState(user.profile_frame_scale || 100);
  const [saving, setSaving] = useState(false);
  const automatic = (user.profile_frame || '').startsWith('lvl_');
  useEffect(() => setScale(user.profile_frame_scale || 100), [user.profile_frame_scale]);
  const save = async (entrance = user.profile_frame_entrance_enabled) => {
    setSaving(true);
    try {
      await base44.functions.invoke('role-management', { action: 'set_frame_display', user_id: user.id, scale: Number(scale), entrance_enabled: !!entrance });
      toast({ title: 'Profil yakınlaştırma güncellendi' }); onUpdated?.();
    } catch (error) { toast({ title: 'Ayar kaydedilemedi', description: error.response?.data?.error || error.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  return <div className="w-full rounded-xl border border-border bg-secondary/30 p-3">
    <div className="flex flex-wrap items-center gap-4"><div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-visible">{user.profile_frame ? <ProfileFrame frame={user.profile_frame} avatar={user.avatar} name={user.username || user.full_name} size="md" frameScale={scale} /> : <span className="text-xs text-muted-foreground">Çerçeve yok</span>}</div><div className="min-w-[190px] flex-1"><div className="mb-1 flex justify-between text-xs font-semibold"><span>Profil yakınlaştırma</span><span>%{scale}</span></div><input type="range" min="80" max="180" step="1" value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full accent-primary" /><p className="mt-1 text-[10px] text-muted-foreground">Çerçeve sabit kalır, sadece profil fotoğrafı yakınlaşır.</p><button disabled={saving} onClick={() => save()} className="mt-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">Yakınlaştırmayı Kaydet</button></div></div>
    <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3"><div><p className="text-sm font-semibold">Üstte profil ve çerçeve</p><p className="text-xs text-muted-foreground">{automatic ? 'LVL çerçevesinde otomatik açık.' : 'Odaya girişte kompakt gösterilir.'}</p></div><button disabled={saving || automatic || !user.profile_frame} onClick={() => save(!user.profile_frame_entrance_enabled)} className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${(automatic || user.profile_frame_entrance_enabled) ? 'bg-green-500/20 text-green-400' : 'bg-secondary text-muted-foreground'}`}>{automatic || user.profile_frame_entrance_enabled ? 'AÇIK' : 'KAPALI'}</button></div>
  </div>;
}