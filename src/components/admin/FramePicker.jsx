import { useState } from 'react';
import { FRAME_DEFINITIONS } from '@/lib/roles';
import ProfileFrame from '@/components/ProfileFrame';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function FramePicker({ user, onSelect }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const selected = FRAME_DEFINITIONS[user.profile_frame];
  const choose = async (key) => {
    setSaving(true);
    try { if (await onSelect(key)) setOpen(false); }
    finally { setSaving(false); }
  };
  return <>
    <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-border bg-secondary/60 px-2.5 py-1.5 text-xs font-semibold">Çerçeve: {selected?.label || 'Yok'}</button>
    <Dialog open={open} onOpenChange={(value) => !saving && setOpen(value)}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto rounded-xl">
        <DialogHeader><DialogTitle>Profil Çerçeveleri</DialogTitle><DialogDescription>{user.username || user.full_name || 'Kullanıcı'} için çerçeve seçin.</DialogDescription></DialogHeader>
        <button disabled={saving} onClick={() => choose('')} className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold disabled:opacity-50">Çerçeveyi Kaldır</button>
        <h3 className="font-bold">Kullanıcı Çerçeveleri</h3>
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {Object.entries(FRAME_DEFINITIONS).filter(([key, info]) => key && info.group !== 'level').map(([key, info]) => <button key={key} disabled={saving} onClick={() => choose(key)} aria-pressed={user.profile_frame === key} className={`flex flex-col items-center justify-between gap-3 rounded-xl border p-3 disabled:opacity-50 ${user.profile_frame === key ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-secondary'}`}>
            <div className="flex h-56 w-full items-center justify-center"><div className="scale-[0.8]"><ProfileFrame frame={key} size="lg" avatar={user.avatar} name={user.username || user.full_name} /></div></div>
            <span className="text-sm font-semibold text-foreground">{info.label}{user.profile_frame === key ? ' · Seçili' : ''}</span>
          </button>)}
        </div>
        <h3 className="mt-3 font-bold">LVL Çerçeveleri</h3>
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {Object.entries(FRAME_DEFINITIONS).filter(([key, info]) => key && info.group === 'level').map(([key, info]) => <button key={key} disabled={saving} onClick={() => choose(key)} aria-pressed={user.profile_frame === key} className={`flex flex-col items-center gap-3 rounded-xl border p-3 disabled:opacity-50 ${user.profile_frame === key ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-secondary'}`}><div className="flex h-56 items-center justify-center"><div className="scale-[0.8]"><ProfileFrame frame={key} size="lg" avatar={user.avatar} name={user.username || user.full_name} /></div></div><span className="text-sm font-semibold">{info.label}{user.profile_frame === key ? ' · Seçili' : ''}</span></button>)}
        </div>
        {saving && <p role="status" className="text-center text-sm text-muted-foreground">Çerçeve kaydediliyor...</p>}
      </DialogContent>
    </Dialog>
  </>;
}