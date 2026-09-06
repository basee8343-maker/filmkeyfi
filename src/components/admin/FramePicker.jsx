import { useState } from 'react';
import { useFrameCatalog } from '@/lib/FrameCatalogContext';
import ProfileFrame from '@/components/ProfileFrame';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function FramePicker({ user, onSelect }) {
  const { frames } = useFrameCatalog();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [duration, setDuration] = useState(0);
  const [entrance, setEntrance] = useState(user.profile_frame_entrance_enabled || false);
  const selected = frames[user.profile_frame];
  const choose = async (key) => {
    setSaving(true);
    try { if (await onSelect(key, duration, entrance)) setOpen(false); }
    finally { setSaving(false); }
  };
  return <>
    <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-border bg-secondary/60 px-2.5 py-1.5 text-xs font-semibold">Çerçeve: {selected?.label || 'Yok'}</button>
    <Dialog open={open} onOpenChange={(value) => !saving && setOpen(value)}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto rounded-xl">
        <DialogHeader><DialogTitle>Profil Çerçeveleri</DialogTitle><DialogDescription>{user.username || user.full_name || 'Kullanıcı'} için çerçeve seçin.</DialogDescription></DialogHeader>
        <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-secondary/30 p-3">
          <label className="text-xs font-semibold flex flex-col gap-1">Çerçeve Süresi
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm">
              <option value={0}>Sürekli</option>
              <option value={30}>1 Aylık (30 gün)</option>
              <option value={7}>1 Haftalık (7 gün)</option>
              <option value={90}>3 Aylık (90 gün)</option>
            </select>
          </label>
          <label className="text-xs font-semibold flex flex-col gap-1">Üstten Giriş
            <button type="button" onClick={() => setEntrance(!entrance)} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${entrance ? 'bg-green-500/20 text-green-400' : 'bg-secondary text-muted-foreground'}`}>{entrance ? 'AÇIK' : 'KAPALI'}</button>
          </label>
        </div>
        <button disabled={saving} onClick={() => choose('')} className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold disabled:opacity-50">Çerçeveyi Kaldır</button>
        <h3 className="font-bold">Kullanıcı Çerçeveleri</h3>
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {Object.entries(frames).filter(([key, info]) => key && info.group !== 'level').map(([key, info]) => <button key={key} disabled={saving} onClick={() => choose(key)} aria-pressed={user.profile_frame === key} className={`flex flex-col items-center justify-between gap-3 rounded-xl border p-3 disabled:opacity-50 ${user.profile_frame === key ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-secondary'}`}>
            <div className="flex h-56 w-full items-center justify-center"><div className="scale-[0.8]"><ProfileFrame frame={key} size="lg" avatar={user.avatar} name={user.username || user.full_name} /></div></div>
            <span className="text-sm font-semibold text-foreground">{info.label}{user.profile_frame === key ? ' · Seçili' : ''}</span>
          </button>)}
        </div>
        <h3 className="mt-3 font-bold">LVL Çerçeveleri</h3>
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {Object.entries(frames).filter(([key, info]) => key && info.group === 'level').map(([key, info]) => <button key={key} disabled={saving} onClick={() => choose(key)} aria-pressed={user.profile_frame === key} className={`flex flex-col items-center gap-3 rounded-xl border p-3 disabled:opacity-50 ${user.profile_frame === key ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-secondary'}`}><div className="flex h-56 items-center justify-center"><div className="scale-[0.8]"><ProfileFrame frame={key} size="lg" avatar={user.avatar} name={user.username || user.full_name} /></div></div><span className="text-sm font-semibold">{info.label}{user.profile_frame === key ? ' · Seçili' : ''}</span></button>)}
        </div>
        {saving && <p role="status" className="text-center text-sm text-muted-foreground">Çerçeve kaydediliyor...</p>}
      </DialogContent>
    </Dialog>
  </>;
}