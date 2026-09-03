import { useState } from 'react';
import confetti from 'canvas-confetti';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { ROLE_DEFINITIONS, FRAME_DEFINITIONS, BAN_REASONS, getRoleInfo, NAME_EFFECT_OPTIONS, MSG_EFFECT_OPTIONS } from '@/lib/roles';

export default function RoleFrameManager({ user, onUpdated }) {
  const { toast } = useToast();
  const [showBan, setShowBan] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banDesc, setBanDesc] = useState('');

  const currentRole = getRoleInfo(user);
  const isBanned = user.is_banned;

  const assignRole = async (roleKey) => {
    try {
      await base44.functions.invoke('role-management', { action: 'assign_role', user_id: user.id, role_key: roleKey });
      const roleDef = ROLE_DEFINITIONS[roleKey];
      if (roleDef) {
        toast({ title: 'Rol atandı', description: roleDef.label });
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: [roleDef.color, '#fbbf24', '#ffffff'], zIndex: 9999 });
      } else {
        toast({ title: 'Rol kaldırıldı' });
      }
      onUpdated();
    } catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const assignFrame = async (frame) => {
    try {
      await base44.functions.invoke('role-management', { action: 'assign_frame', user_id: user.id, frame });
      if (frame) confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 }, colors: ['#fbbf24', '#ffffff', '#ec4899'], zIndex: 9999 });
      onUpdated();
    } catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const setNameEffect = async (effect) => {
    try {
      await base44.functions.invoke('role-management', { action: 'set_name_effect', user_id: user.id, effect });
      toast({ title: 'İsim animasyonu güncellendi' });
      onUpdated();
    } catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const setMsgEffect = async (effect) => {
    try {
      await base44.functions.invoke('role-management', { action: 'set_msg_effect', user_id: user.id, effect });
      toast({ title: 'Yazı çerçevesi güncellendi' });
      onUpdated();
    } catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const banUser = async () => {
    try {
      await base44.functions.invoke('role-management', { action: 'ban_user', user_id: user.id, reason: banReason, description: banDesc });
      toast({ title: 'Kullanıcı engellendi', description: banReason || 'Sebep belirtilmedi' });
      setShowBan(false); setBanReason(''); setBanDesc('');
      onUpdated();
    } catch (e) { toast({ title: 'İşlem başarısız', description: e.response?.data?.error || e.message, variant: 'destructive' }); }
  };

  const unbanUser = async () => {
    try {
      await base44.functions.invoke('role-management', { action: 'unban_user', user_id: user.id });
      toast({ title: 'Engel kaldırıldı' });
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
        </span>
      )}
      <select value={user.display_role || ''} onChange={(e) => assignRole(e.target.value)} className={selectClass}>
        <option value="">Rol: Yok</option>
        {Object.entries(ROLE_DEFINITIONS).filter(([k]) => k).map(([key, info]) => (
          <option key={key} value={key}>{info.icon} {info.label}</option>
        ))}
      </select>
      <select value={user.profile_frame || ''} onChange={(e) => assignFrame(e.target.value)} className={selectClass}>
        <option value="">Çerçeve: Yok</option>
        {Object.entries(FRAME_DEFINITIONS).filter(([k]) => k).map(([key, info]) => (
          <option key={key} value={key}>{info.label}</option>
        ))}
      </select>
      <select value={user.name_effect || ''} onChange={(e) => setNameEffect(e.target.value)} className={selectClass} title="İsim animasyonu">
        <option value="">İsim Anim: Varsayılan</option>
        {NAME_EFFECT_OPTIONS.filter((o) => o.key).map((o) => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>
      <select value={user.msg_effect || ''} onChange={(e) => setMsgEffect(e.target.value)} className={selectClass} title="Mesaj çerçeve efekti">
        <option value="">Yazı Çerçeve: Varsayılan</option>
        {MSG_EFFECT_OPTIONS.filter((o) => o.key).map((o) => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>
      {isBanned ? (
        <button onClick={unbanUser} className={`${btn} bg-green-500/20 text-green-400 hover:bg-green-500/30`}>ENGELİ KALDIR</button>
      ) : (
        <button onClick={() => setShowBan(true)} className={`${btn} bg-red-500/20 text-red-400 hover:bg-red-500/30`}>ENGELLE</button>
      )}

      {showBan && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowBan(false)}>
          <div className="bg-card border border-border rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold mb-1">🚫 Kullanıcıyı Engelle</p>
            <p className="text-xs text-muted-foreground mb-4">{user.username || user.full_name || user.email}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Engel Nedeni</label>
                <select value={banReason} onChange={(e) => setBanReason(e.target.value)} className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border">
                  <option value="">Seçiniz...</option>
                  {BAN_REASONS.map((r) => (
                    <option key={r.key} value={r.label}>{r.icon} {r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Açıklama (isteğe bağlı)</label>
                <textarea value={banDesc} onChange={(e) => setBanDesc(e.target.value)} placeholder="Ek açıklama..." className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border resize-none" rows={3} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowBan(false)} className="flex-1 bg-secondary py-2 rounded-lg text-sm">İptal</button>
              <button onClick={banUser} className="flex-1 bg-destructive text-destructive-foreground py-2 rounded-lg text-sm font-semibold">Engelle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}