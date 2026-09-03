import { useState } from 'react';
import confetti from 'canvas-confetti';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { ROLE_DEFINITIONS, FRAME_DEFINITIONS, getRoleInfo } from '@/lib/roles';

export default function RoleFrameManager({ user, onUpdated }) {
  const { toast } = useToast();
  const [showCustomRole, setShowCustomRole] = useState(false);
  const [customRole, setCustomRole] = useState({ name: '', icon: '✨', color: '#8b5cf6', neon: true });

  const assignRole = async (role) => {
    if (role === 'custom') { setShowCustomRole(true); return; }
    try {
      await base44.functions.invoke('role-management', { action: 'assign_role', user_id: user.id, role });
      toast({ title: role ? 'Rol atandı' : 'Rol kaldırıldı' });
      if (role && ROLE_DEFINITIONS[role]) {
        const ri = ROLE_DEFINITIONS[role];
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: [ri.color, '#fbbf24', '#ffffff'], zIndex: 9999 });
      }
      onUpdated();
    } catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const assignFrame = async (frame) => {
    try {
      await base44.functions.invoke('role-management', { action: 'assign_frame', user_id: user.id, frame });
      toast({ title: frame ? 'Çerçeve atandı' : 'Çerçeve kaldırıldı' });
      if (frame) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#fbbf24', '#ffffff', '#ec4899'], zIndex: 9999 });
      }
      onUpdated();
    } catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const createCustomRole = async () => {
    try {
      await base44.functions.invoke('role-management', { action: 'create_custom_role', user_id: user.id, ...customRole });
      toast({ title: 'Özel rol atandı' });
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: [customRole.color, '#fbbf24', '#ffffff'], zIndex: 9999 });
      setShowCustomRole(false);
      setCustomRole({ name: '', icon: '✨', color: '#8b5cf6', neon: true });
      onUpdated();
    } catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const selectClass = 'bg-secondary/60 border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring cursor-pointer';
  const currentRole = getRoleInfo(user);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {currentRole?.label && (
        <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ backgroundColor: `${currentRole.color}25`, color: currentRole.color, boxShadow: currentRole.neon ? `0 0 6px -1px ${currentRole.color}80` : 'none' }}>
          {currentRole.icon} {currentRole.label}
        </span>
      )}
      <select value={user.display_role || ''} onChange={(e) => assignRole(e.target.value)} className={selectClass}>
        <option value="">Rol: Yok</option>
        {Object.entries(ROLE_DEFINITIONS).filter(([k]) => k).map(([key, info]) => (
          <option key={key} value={key}>{info.icon} {info.label}</option>
        ))}
        <option value="custom">✨ Özel Rol...</option>
      </select>
      <select value={user.profile_frame || ''} onChange={(e) => assignFrame(e.target.value)} className={selectClass}>
        <option value="">Çerçeve: Yok</option>
        {Object.entries(FRAME_DEFINITIONS).filter(([k]) => k).map(([key, info]) => (
          <option key={key} value={key}>{info.label}</option>
        ))}
      </select>
      {showCustomRole && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowCustomRole(false)}>
          <div className="bg-card border border-border rounded-xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold mb-3">Özel Rol Oluştur</p>
            <p className="text-xs text-muted-foreground mb-3">Bu rol yönetici yetkisi vermez, sadece görseldir.</p>
            <div className="space-y-2">
              <input placeholder="Rol adı (örn: Topluluk Elçisi)" value={customRole.name} onChange={(e) => setCustomRole({ ...customRole, name: e.target.value })} className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border" />
              <div className="flex gap-2 items-center">
                <input placeholder="İkon" value={customRole.icon} onChange={(e) => setCustomRole({ ...customRole, icon: e.target.value })} className="w-20 bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border text-center" />
                <input type="color" value={customRole.color} onChange={(e) => setCustomRole({ ...customRole, color: e.target.value })} className="w-12 h-10 rounded-lg border border-border bg-secondary/60 cursor-pointer" />
                <label className="flex items-center gap-1.5 text-sm whitespace-nowrap"><input type="checkbox" checked={customRole.neon} onChange={(e) => setCustomRole({ ...customRole, neon: e.target.checked })} className="accent-primary" /> Neon</label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowCustomRole(false)} className="flex-1 bg-secondary py-2 rounded-lg text-sm">İptal</button>
              <button onClick={createCustomRole} disabled={!customRole.name.trim()} className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-semibold disabled:opacity-50">Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}