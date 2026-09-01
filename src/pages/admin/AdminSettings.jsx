import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { useTheme } from '@/lib/ThemeContext';
import { Wrench, UserPlus, Palette, Sun, Moon, Monitor } from 'lucide-react';

export default function AdminSettings() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [cfg, setCfg] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const configs = await base44.entities.AppConfig.list(100).catch(() => []);
    const get = (k, f = '') => configs.find((c) => c.key === k)?.value ?? f;
    setCfg({
      maintenance_mode: get('maintenance_mode', 'false') === 'true',
      registration_open: get('registration_open', 'true') === 'true',
      app_theme: get('app_theme', 'auto'),
    });
  };
  useEffect(() => { load(); }, []);

  const save = async (key, value) => {
    setSaving(true);
    try {
      const configs = await base44.entities.AppConfig.list(100).catch(() => []);
      const existing = configs.find((c) => c.key === key);
      const val = typeof value === 'boolean' ? String(value) : value;
      if (existing) await base44.entities.AppConfig.update(existing.id, { value: val });
      else await base44.entities.AppConfig.create({ key, value: val });
      toast({ title: 'Ayar kaydedildi' });
      load();
    } catch { toast({ title: 'Hata', variant: 'destructive' }); }
    setSaving(false);
  };

  const Toggle = ({ on, onChange }) => (
    <button onClick={() => onChange(!on)} className={`relative w-14 h-7 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-secondary border border-border'}`}>
      <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-7' : 'translate-x-0.5'}`} />
    </button>
  );

  const card = 'bg-card border border-border rounded-xl p-5 space-y-3';

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">Ayarlar</h1>
      <div className="max-w-lg space-y-4">
        {/* Bakım Modu */}
        <div className={card}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-500"><Wrench className="w-5 h-5" /></div>
              <div>
                <h3 className="font-bold">Bakım Modu</h3>
                <p className="text-sm text-muted-foreground">Açıkken normal kullanıcılar siteye giremez. Adminler etkilenmez.</p>
              </div>
            </div>
            <Toggle on={cfg.maintenance_mode} onChange={(v) => { setCfg({ ...cfg, maintenance_mode: v }); save('maintenance_mode', v); }} />
          </div>
        </div>

        {/* Yeni Kayıt İzni */}
        <div className={card}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/15 text-blue-500"><UserPlus className="w-5 h-5" /></div>
              <div>
                <h3 className="font-bold">Yeni Kayıt İzni</h3>
                <p className="text-sm text-muted-foreground">Kapalıyken yeni kullanıcı kaydı engellenir. Mevcut kullanıcılar giriş yapabilir.</p>
              </div>
            </div>
            <Toggle on={cfg.registration_open} onChange={(v) => { setCfg({ ...cfg, registration_open: v }); save('registration_open', v); }} />
          </div>
        </div>

        {/* Tema */}
        <div className={card}>
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 rounded-lg bg-accent/15 text-accent"><Palette className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold">Tema / Görünüm</h3>
              <p className="text-sm text-muted-foreground">Varsayılan tema seçimi. Kullanıcılar kendi tercihlerini değiştirebilir.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 'auto', label: 'Otomatik', Icon: Monitor },
              { v: 'dark', label: 'Karanlık', Icon: Moon },
              { v: 'light', label: 'Aydınlık', Icon: Sun },
            ].map(({ v, label, Icon }) => (
              <button key={v} onClick={() => { setTheme(v); save('app_theme', v); }} className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border transition-colors ${(theme === v) ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-secondary'}`}>
                <Icon className="w-5 h-5" />
                <span className="text-xs font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}