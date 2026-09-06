import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

// "Üstte profil ve çerçeve" — odaya girişte kompakt gösterim aç/kapa.
// LVL çerçevelerinde otomatik açıktır, kullanıcı kapatamaz.
export default function FrameEntranceToggle({ user, onSaved }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(true);
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
    <div className="flex items-center justify-between gap-3">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-sm font-semibold"><ChevronDown className={`w-4 h-4 transition-transform ${open ? '' : '-rotate-90'}`} />Üstten giriş animasyonu</button>
      <div className="flex items-center gap-2">
        <button disabled={saving || automatic} onClick={toggle} className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${enabled ? 'bg-green-500/20 text-green-400' : 'bg-secondary text-muted-foreground'}`}>{enabled ? 'AÇIK' : 'KAPALI'}</button>
        <button onClick={() => setOpen((o) => !o)} className="rounded-lg bg-secondary p-2 text-muted-foreground" aria-label={open ? 'Kapat' : 'Aç'}><X className="w-4 h-4" /></button>
      </div>
    </div>
    {open && <p className="mt-2 text-xs text-muted-foreground">{automatic ? 'LVL çerçevesinde otomatik açık.' : 'Odaya girişte profil+çerçeve üstten gösterilir. Kapalıysa gösterilmez.'}</p>}
  </section>;
}