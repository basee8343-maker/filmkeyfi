import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

// "Üstte profil ve çerçeve" — odaya girişte kompakt gösterim aç/kapa.
// LVL çerçevelerinde otomatik açıktır, kullanıcı kapatamaz.
export default function FrameEntranceToggle({ user, onSaved }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const automatic = (user.profile_frame || '').startsWith('lvl_');
  const enabled = automatic || !!user.profile_frame_entrance_enabled;
  const toggle = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('update-profile', { profile_frame_entrance_enabled: !user.profile_frame_entrance_enabled });
      await onSaved?.();
      toast({ title: 'Giriş ayarı güncellendi' });
    } catch (error) { toast({ title: 'Ayar kaydedilemedi', description: error.response?.data?.error || error.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  return <section className="rounded-2xl border border-border bg-card p-4">
    <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">Üstte profil ve çerçeve</p><p className="text-xs text-muted-foreground">{automatic ? 'LVL çerçevesinde otomatik açık.' : 'Odaya girişte kompakt gösterilir.'}</p></div><button disabled={saving || automatic} onClick={toggle} className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${enabled ? 'bg-green-500/20 text-green-400' : 'bg-secondary text-muted-foreground'}`}>{enabled ? 'AÇIK' : 'KAPALI'}</button></div>
  </section>;
}