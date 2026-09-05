import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { useXpConfig } from '@/hooks/useXp';
import { FRAME_STYLES, formatXp } from '@/lib/xp';
import XpAvatar from '@/components/xp/XpAvatar';

const emptyFrame = { name: '', min_xp: 0, style: 'starter', image_url: '', active: true, animated: true, sort_order: 0 };

export default function AdminXp() {
  const { toast } = useToast();
  const { frames, settings } = useXpConfig();
  const [perMessage, setPerMessage] = useState('10');
  const [enabled, setEnabled] = useState(true);
  const [draft, setDraft] = useState(emptyFrame);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setPerMessage(String(settings.xp_per_message ?? 10)); setEnabled(settings.enabled !== false); }, [settings.id]);

  const call = async (payload, message) => {
    setSaving(true);
    try {
      await base44.functions.invoke('xp-service', payload);
      toast({ title: message });
      return true;
    } catch (error) {
      toast({ title: 'İşlem başarısız', description: error.response?.data?.error || error.message, variant: 'destructive' });
      return false;
    } finally { setSaving(false); }
  };

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setDraft((current) => ({ ...current, image_url: file_url }));
  };

  const saveFrame = async () => {
    if (!draft.name.trim()) { toast({ title: 'Çerçeve adı gerekli', variant: 'destructive' }); return; }
    const ok = await call({ action: 'save_frame', frame_id: draft.id, ...draft, min_xp: Math.max(0, Math.floor(Number(draft.min_xp) || 0)) }, 'Çerçeve kaydedildi');
    if (ok) setDraft(emptyFrame);
  };

  const field = 'w-full rounded-lg border border-white/10 bg-[#0d0d12] px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500/40';

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">XP Ayarları ve Çerçeveler</h1>

      <section className="rounded-xl border border-purple-500/20 bg-[#16161e] p-4 space-y-3">
        <h2 className="font-semibold text-white">XP Ayarları</h2>
        <label className="block text-sm text-gray-300">1 mesaj kaç XP verir?
          <input type="number" min="0" value={perMessage} onChange={(e) => setPerMessage(e.target.value)} className={`mt-1.5 ${field}`} />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> XP sistemi aktif
        </label>
        <button disabled={saving} onClick={() => call({ action: 'save_settings', xp_per_message: Math.max(0, Math.floor(Number(perMessage) || 0)), enabled }, 'XP ayarları kaydedildi')} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)' }}>Ayarları Kaydet</button>
      </section>

      <section className="rounded-xl border border-purple-500/20 bg-[#16161e] p-4 space-y-3">
        <h2 className="font-semibold text-white">{draft.id ? 'Çerçeveyi Düzenle' : 'Yeni Çerçeve Ekle'}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-gray-300">Çerçeve adı
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={`mt-1.5 ${field}`} />
          </label>
          <label className="block text-sm text-gray-300">Minimum XP
            <input type="number" min="0" value={draft.min_xp} onChange={(e) => setDraft({ ...draft, min_xp: e.target.value })} className={`mt-1.5 ${field}`} />
          </label>
          <label className="block text-sm text-gray-300">Görsel tasarım
            <select value={draft.style} onChange={(e) => setDraft({ ...draft, style: e.target.value })} className={`mt-1.5 ${field}`}>
              {Object.entries(FRAME_STYLES).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
            </select>
          </label>
          <label className="block text-sm text-gray-300">Sıralama
            <input type="number" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })} className={`mt-1.5 ${field}`} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <XpAvatar name="A" frame={{ ...draft, min_xp: Number(draft.min_xp) || 0 }} size="md" />
          <label className="text-sm text-gray-300">Çerçeve görseli (opsiyonel)
            <input type="file" accept="image/*" onChange={uploadImage} className="mt-1.5 block text-xs text-gray-400" />
          </label>
          {draft.image_url && <button onClick={() => setDraft({ ...draft, image_url: '' })} className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white">Görseli Kaldır</button>}
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={draft.active !== false} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Aktif</label>
          <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={draft.animated !== false} onChange={(e) => setDraft({ ...draft, animated: e.target.checked })} /> Animasyon açık</label>
        </div>
        <div className="flex gap-2">
          <button disabled={saving} onClick={saveFrame} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)' }}>{draft.id ? 'Güncelle' : 'Çerçeve Ekle'}</button>
          {draft.id && <button onClick={() => setDraft(emptyFrame)} className="rounded-lg bg-white/5 px-4 py-2.5 text-sm text-white">Vazgeç</button>}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-white">XP Çerçeveleri</h2>
        {frames.map((frame) => (
          <div key={frame.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-[#16161e] p-3">
            <XpAvatar name="A" frame={frame} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{frame.name}</p>
              <p className="text-[11px] text-gray-400">{formatXp(frame.min_xp)} XP · {frame.active === false ? 'Pasif' : 'Aktif'} · {frame.animated === false ? 'Animasyon kapalı' : 'Animasyonlu'}</p>
            </div>
            <button onClick={() => setDraft(frame)} className="rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold text-white">Düzenle</button>
            <button onClick={() => call({ action: 'delete_frame', frame_id: frame.id }, 'Çerçeve silindi')} className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400">Sil</button>
          </div>
        ))}
        {!frames.length && <p className="text-sm text-gray-400">Henüz çerçeve eklenmedi.</p>}
      </section>
    </div>
  );
}