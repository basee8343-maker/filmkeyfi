import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { ROLE_DEFINITIONS, setRoleLabelOverrides } from '@/lib/roles';

export default function RoleLabelEditor({ onUpdated }) {
  const { toast } = useToast();
  const [labels, setLabels] = useState({});
  const [editing, setEditing] = useState({});
  const [savingKey, setSavingKey] = useState(null);

  const load = async () => {
    try {
      const res = await base44.functions.invoke('role-labels', { action: 'get' });
      if (res.data?.labels) {
        setLabels(res.data.labels);
        setRoleLabelOverrides(res.data.labels);
      }
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const saveLabel = async (roleKey) => {
    setSavingKey(roleKey);
    try {
      const res = await base44.functions.invoke('role-labels', {
        action: 'save',
        role_key: roleKey,
        label: editing[roleKey] ?? '',
      });
      if (res.data?.labels) {
        setLabels(res.data.labels);
        setRoleLabelOverrides(res.data.labels);
      }
      delete editing[roleKey];
      setEditing({ ...editing });
      toast({ title: 'Rol ismi kaydedildi' });
      onUpdated?.();
    } catch (e) {
      toast({ title: 'Kaydetme başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' });
    }
    setSavingKey(null);
  };

  const roles = Object.entries(ROLE_DEFINITIONS).filter(([k]) => k);

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div>
        <h3 className="font-bold">Rol İsimlerini Düzenle</h3>
        <p className="text-sm text-muted-foreground">Rollerin görünen adlarını değiştirebilirsiniz. Değişiklikler tüm platformda anlık uygulanır.</p>
      </div>
      <div className="space-y-2">
        {roles.map(([key, info]) => {
          const currentLabel = labels[key] || info.label;
          const isEditing = key in editing;
          const isOverridden = !!labels[key];
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-lg shrink-0">{info.icon}</span>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    value={editing[key]}
                    onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                    placeholder={info.label}
                    maxLength={40}
                    className="w-full bg-secondary/60 rounded-lg px-3 py-1.5 text-sm outline-none border border-border focus:ring-1 focus:ring-ring"
                    onKeyDown={(e) => { if (e.key === 'Enter') saveLabel(key); if (e.key === 'Escape') { const ne = { ...editing }; delete ne[key]; setEditing(ne); } }}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate" style={{ color: info.color }}>{currentLabel}</span>
                    {isOverridden && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-bold shrink-0">ÖZEL</span>}
                  </div>
                )}
              </div>
              {isEditing ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => saveLabel(key)}
                    disabled={savingKey === key}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingKey === key ? '...' : 'Kaydet'}
                  </button>
                  <button
                    onClick={() => { const ne = { ...editing }; delete ne[key]; setEditing(ne); }}
                    className="px-2 py-1.5 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/80"
                  >
                    İptal
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditing({ ...editing, [key]: currentLabel })}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/80 shrink-0"
                >
                  Değiştir
                </button>
              )}
              {isOverridden && !isEditing && (
                <button
                  onClick={() => { setEditing({ ...editing, [key]: '' }); setTimeout(() => saveLabel(key), 50); }}
                  className="px-2 py-1.5 rounded-lg bg-destructive/15 text-destructive text-xs font-semibold hover:bg-destructive/25 shrink-0"
                  title="Varsayılana sıfırla"
                >
                  Sıfırla
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}