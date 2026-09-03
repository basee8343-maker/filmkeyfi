import { useState } from 'react';
import confetti from 'canvas-confetti';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { ROLE_DEFINITIONS, FRAME_DEFINITIONS, ANIMATION_DEFINITIONS, PRESET_COLORS, getRoleInfo } from '@/lib/roles';

export default function RoleFrameManager({ user, onUpdated }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', icon: '✨', color: '#8b5cf6', animation: 'pulse', neon: true, show_in_room: false, moderator: false });

  const currentRole = getRoleInfo(user);

  const openForm = () => {
    if (currentRole?.custom) {
      setForm({
        name: currentRole.label,
        icon: currentRole.icon,
        color: currentRole.color,
        animation: currentRole.animation || 'pulse',
        neon: currentRole.neon,
        show_in_room: currentRole.show_in_room,
        moderator: currentRole.moderator,
      });
    } else {
      setForm({ name: '', icon: '✨', color: '#8b5cf6', animation: 'pulse', neon: true, show_in_room: false, moderator: false });
    }
    setShowForm(true);
  };

  const save = async () => {
    try {
      await base44.functions.invoke('role-management', { action: 'create_custom_role', user_id: user.id, ...form });
      toast({ title: 'Özel rol kaydedildi' });
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: [form.color, '#fbbf24', '#ffffff'], zIndex: 9999 });
      setShowForm(false);
      onUpdated();
    } catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const remove = async () => {
    try {
      await base44.functions.invoke('role-management', { action: 'remove_role', user_id: user.id });
      toast({ title: 'Rol kaldırıldı' });
      onUpdated();
    } catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const assignFrame = async (frame) => {
    try {
      await base44.functions.invoke('role-management', { action: 'assign_frame', user_id: user.id, frame });
      if (frame) confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#fbbf24', '#ffffff', '#ec4899'], zIndex: 9999 });
      onUpdated();
    } catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const selectClass = 'bg-secondary/60 border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring cursor-pointer';
  const btn = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {currentRole?.label && (
        <span className="text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1" style={{ backgroundColor: `${currentRole.color}25`, color: currentRole.color, boxShadow: currentRole.neon ? `0 0 6px -1px ${currentRole.color}80` : 'none' }}>
          {currentRole.icon} {currentRole.label}
          {currentRole.show_in_room && <span className="text-[10px] opacity-70">📍</span>}
          {currentRole.moderator && <span className="text-[10px] opacity-70">🛡️</span>}
        </span>
      )}
      <button onClick={openForm} className={`${btn} bg-accent/20 text-accent hover:bg-accent/30`}>{currentRole?.label ? 'DÜZENLE' : 'ÖZEL ROL'}</button>
      {currentRole?.label && <button onClick={remove} className={`${btn} bg-red-500/20 text-red-400 hover:bg-red-500/30`}>ROLÜ KALDIR</button>}
      <select value={user.profile_frame || ''} onChange={(e) => assignFrame(e.target.value)} className={selectClass}>
        <option value="">Çerçeve: Yok</option>
        {Object.entries(FRAME_DEFINITIONS).filter(([k]) => k).map(([key, info]) => (
          <option key={key} value={key}>{info.label}</option>
        ))}
      </select>

      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold mb-1">Özel Rol Oluştur</p>
            <p className="text-xs text-muted-foreground mb-4">Rol profilde görünür. "Oda girişinde göster" seçilirse oda mesajlarında rol adı yazılır.</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Rol Adı</label>
                <input placeholder="örn: Admin Kraliçesi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border" />
              </div>

              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">İkon</label>
                  <input placeholder="✨" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border text-center" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Renk</label>
                  <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-12 h-10 rounded-lg border border-border bg-secondary/60 cursor-pointer" />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Hazır Renkler</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button key={c} onClick={() => setForm({ ...form, color: c })} className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110" style={{ backgroundColor: c, borderColor: form.color === c ? '#fff' : 'transparent' }} />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Giriş Animasyonu (30 seçenek)</label>
                <select value={form.animation} onChange={(e) => setForm({ ...form, animation: e.target.value })} className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border">
                  {ANIMATION_DEFINITIONS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.neon} onChange={(e) => setForm({ ...form, neon: e.target.checked })} className="accent-primary w-4 h-4" />
                  <span>Neon parıltı</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.show_in_room} onChange={(e) => setForm({ ...form, show_in_room: e.target.checked })} className="accent-primary w-4 h-4" />
                  <span>📍 Oda girişinde rol adını göster <span className="text-xs text-muted-foreground">(Admin Kraliçesi, Admin Yardımcısı vb. için işaretleyin)</span></span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.moderator} onChange={(e) => setForm({ ...form, moderator: e.target.checked })} className="accent-primary w-4 h-4" />
                  <span>🛡️ Moderatör yetkisi ver <span className="text-xs text-muted-foreground">(kullanıcıları atma, oda yönetme)</span></span>
                </label>
              </div>

              <div className="rounded-lg p-3 border border-border" style={{ backgroundColor: `${form.color}15` }}>
                <p className="text-xs text-muted-foreground mb-1">Önizleme:</p>
                <span className="text-sm font-bold" style={{ color: form.color, textShadow: form.neon ? `0 0 10px ${form.color}` : 'none' }}>{form.icon} {form.name || 'Rol Adı'}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 bg-secondary py-2 rounded-lg text-sm">İptal</button>
              <button onClick={save} disabled={!form.name.trim()} className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-semibold disabled:opacity-50">Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}