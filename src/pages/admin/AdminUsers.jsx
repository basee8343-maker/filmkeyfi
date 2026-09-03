import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import UserBadge from '@/components/admin/UserBadge';

const btn = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap';

export default function AdminUsers({ pendingOnly = false }) {
  const { user: admin } = useCurrentUser();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [detail, setDetail] = useState(null);
  const [idQuery, setIdQuery] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [paidUserIds, setPaidUserIds] = useState(new Set());

  const filtered = users.filter((u) => {
    if (idQuery.trim() && u.member_id !== idQuery.trim()) return false;
    if (nameQuery.trim()) {
      const q = nameQuery.trim().toLowerCase();
      if (!(u.username || '').toLowerCase().includes(q) && !(u.full_name || '').toLowerCase().includes(q) && !(u.email || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const load = () => {
    base44.entities.User.list('-created_date', 500).then((u) => {
      setUsers(pendingOnly ? u.filter((x) => x.membership_status === 'pending') : u);
      setLoading(false);
    }).catch((e) => { setLoading(false); toast({ title: 'Liste yüklenemedi', description: e.message, variant: 'destructive' }); });
    // Tamamlanmış ödemeleri yükle — "Onayla" butonunu gizlemek için
    base44.entities.Payment.filter({ status: 'completed' }, '-created_date', 500).then((pays) => {
      setPaidUserIds(new Set(pays.map((p) => p.user_id)));
    }).catch(() => {});
  };
  useEffect(() => {
    setLoading(true); load();
    const off = base44.entities.User.subscribe(load);
    return off;
  }, [pendingOnly]);

  const log = async (action, target) => { await base44.entities.AdminLog.create({ admin_id: admin?.id, admin_name: admin?.username || admin?.full_name, action, target }).catch(() => {}); };
  const notify = async (uid, title, body) => { await base44.entities.Notification.create({ user_id: uid, title, body, type: 'info' }).catch(() => {}); };

  const approve = async (u) => {
    try {
      const start = new Date(); const end = new Date(); end.setDate(end.getDate() + 30);
      await base44.entities.User.update(u.id, { membership_status: 'active', membership_start: start.toISOString(), membership_end: end.toISOString() });
      await notify(u.id, 'Üyeliğiniz onaylandı', 'Premium içeriklere erişebilirsiniz.');
      await log('Üyelik onaylandı', u.email);
      base44.functions.invoke('admin-notify', {
        event: 'subscription_active',
        ref_id: `sub_active_manual:${u.id}`,
        title: 'Abonelik aktif edildi (Manuel)',
        body: u.username || u.full_name || u.email,
        link: '/admin/abonelikler',
        telegram_data: { username: u.username || u.full_name || u.email, package: 'Manuel Aktivasyon', date: new Date().toLocaleString('tr-TR') }
      }).catch(() => {});
      toast({ title: 'Kullanıcı onaylandı.' }); load();
    } catch (e) { toast({ title: 'Onaylanamadı', description: e.message, variant: 'destructive' }); }
  };
  const reject = async (u) => {
    try {
      await base44.entities.User.update(u.id, { membership_status: 'rejected' });
      await notify(u.id, 'Üyelik talebi reddedildi', 'Lütfen destek ile iletişime geçin.');
      await log('Üyelik reddedildi', u.email);
      toast({ title: 'Kullanıcı reddedildi.' }); load();
    } catch (e) { toast({ title: 'Reddedilemedi', description: e.message, variant: 'destructive' }); }
  };
  const toggleActive = async (u) => {
    try {
      const next = u.membership_status === 'active' ? 'blocked' : 'active';
      await base44.entities.User.update(u.id, { membership_status: next });
      await log(next === 'active' ? 'Kullanıcı aktif edildi' : 'Kullanıcı pasif edildi', u.email);
      if (next === 'blocked') {
        base44.functions.invoke('admin-notify', {
          event: 'subscription_cancelled',
          ref_id: `sub_cancel_manual:${u.id}`,
          title: 'Abonelik iptal edildi (Manuel)',
          body: u.username || u.full_name || u.email,
          link: '/admin/abonelikler',
          telegram_data: { username: u.username || u.full_name || u.email, date: new Date().toLocaleString('tr-TR') }
        }).catch(() => {});
      } else {
        base44.functions.invoke('admin-notify', {
          event: 'subscription_active',
          ref_id: `sub_active_manual:${u.id}`,
          title: 'Abonelik aktif edildi (Manuel)',
          body: u.username || u.full_name || u.email,
          link: '/admin/abonelikler',
          telegram_data: { username: u.username || u.full_name || u.email, package: 'Manuel Aktivasyon', date: new Date().toLocaleString('tr-TR') }
        }).catch(() => {});
      }
      toast({ title: next === 'active' ? 'Kullanıcı aktif edildi' : 'Kullanıcı pasif edildi' }); load();
    } catch (e) { toast({ title: 'İşlem başarısız', description: e.message, variant: 'destructive' }); }
  };
  const extend = async (u) => {
    try {
      const base = u.membership_end && new Date(u.membership_end) > new Date() ? new Date(u.membership_end) : new Date();
      base.setDate(base.getDate() + 30);
      await base44.entities.User.update(u.id, { membership_end: base.toISOString(), membership_status: 'active' });
      await notify(u.id, 'Üyeliğiniz uzatıldı', '30 gün eklendi.');
      await log('Üyelik uzatıldı', u.email);
      toast({ title: '30 gün uzatıldı' }); load();
    } catch (e) { toast({ title: 'Uzatılamadı', description: e.message, variant: 'destructive' }); }
  };
  const resetPass = async (u) => {
    try {
      await base44.auth.resetPasswordRequest(u.email);
      await log('Şifre sıfırlama isteği', u.email);
      toast({ title: 'Şifre sıfırlama bağlantısı gönderildi' });
    } catch (e) { toast({ title: 'Sıfırlama başarısız', description: e.message, variant: 'destructive' }); }
  };
  const testActivate = async (u) => {
    try {
      const res = await base44.functions.invoke('shopier-test-activate', { user_id: u.id });
      toast({ title: 'Test ödeme ile abonelik aktif edildi', description: (res.data || res)?.plan || '' });
      load();
    } catch (e) { toast({ title: 'Test başarısız', description: e.message, variant: 'destructive' }); }
  };
  const del = async (u) => {
    try {
      await base44.entities.User.delete(u.id);
      await log('Kullanıcı silindi', u.email);
      toast({ title: 'Kullanıcı silindi.' }); setConfirm(null); load();
    } catch (e) { toast({ title: 'Silinemedi', description: e.message, variant: 'destructive' }); }
  };

  if (loading) return <p className="text-muted-foreground">Yükleniyor...</p>;

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4">{pendingOnly ? 'Kayıt Kontrol' : 'Kullanıcı Yönetimi'}</h1>
      {!pendingOnly && (
        <div className="flex flex-wrap gap-2 mb-4">
          <input value={idQuery} onChange={(e) => setIdQuery(e.target.value)} placeholder="Üye No ile ara (8 haneli)" className="bg-card border border-border rounded-lg px-3 py-2 text-sm w-44 outline-none focus:ring-2 focus:ring-ring" />
          <input value={nameQuery} onChange={(e) => setNameQuery(e.target.value)} placeholder="İsim / kullanıcı adı / e-posta ile ara" className="bg-card border border-border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] outline-none focus:ring-2 focus:ring-ring" />
        </div>
      )}
      {users.length === 0 ? <p className="text-muted-foreground text-sm">{pendingOnly ? 'Onay bekleyen kayıt yok.' : 'Kullanıcı yok.'}</p> :
        filtered.length === 0 ? <p className="text-muted-foreground text-sm">Eşleşen kullanıcı bulunamadı.</p> :
        <div className="space-y-2">
          {filtered.map((u) => {
            const isActive = u.membership_status === 'active';
            return (
              <div key={u.id} className="bg-card border border-border rounded-xl p-3 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <UserBadge userId={u.id} name={u.username || u.full_name || '?'} avatar={u.avatar} memberId={u.member_id} size="md" />
                  <p className="text-xs text-muted-foreground truncate hidden sm:block">{u.email}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${isActive ? 'bg-green-500/20 text-green-400' : u.membership_status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{isActive ? 'Aktif' : u.membership_status === 'pending' ? 'Beklemede' : 'Askıya Alındı'}</span>
                {paidUserIds.has(u.id) && <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 font-semibold">ÖDENDİ</span>}
                <div className="flex flex-wrap gap-1.5">
                {!pendingOnly && <button onClick={() => setDetail(u)} className={`${btn} bg-secondary hover:bg-secondary/70`}>GÖRÜNTÜLE</button>}
                {!isActive && paidUserIds.has(u.id) && <button onClick={() => approve(u)} className={`${btn} bg-green-500/20 text-green-400 hover:bg-green-500/30`}>AKTİF ET</button>}
                {!isActive && !paidUserIds.has(u.id) && <button onClick={() => approve(u)} className={`${btn} bg-green-500/20 text-green-400 hover:bg-green-500/30`}>ONAYLA</button>}
                  {!pendingOnly && <button onClick={() => toggleActive(u)} className={`${btn} ${isActive ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}>{isActive ? 'ASKIYA AL' : 'AKTİF ET'}</button>}
                  {pendingOnly && <button onClick={() => reject(u)} className={`${btn} bg-red-500/20 text-red-400 hover:bg-red-500/30`}>REDDET</button>}
                  {!pendingOnly && <button onClick={() => testActivate(u)} className={`${btn} bg-purple-500/20 text-purple-400 hover:bg-purple-500/30`}>TEST ÖDEME</button>}
                  {!pendingOnly && <button onClick={() => extend(u)} className={`${btn} bg-blue-500/20 text-blue-400 hover:bg-blue-500/30`}>+30 GÜN</button>}
                  {!pendingOnly && <button onClick={() => resetPass(u)} className={`${btn} bg-purple-500/20 text-purple-400 hover:bg-purple-500/30`}>ŞİFRE SIFIRLA</button>}
                  <button onClick={() => setConfirm(u)} className={`${btn} bg-red-500/20 text-red-400 hover:bg-red-500/30`}>SİL</button>
                </div>
              </div>
            );
          })}
        </div>}

      {detail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-card border border-border rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4"><UserBadge userId={detail.id} name={detail.username || detail.full_name || '?'} avatar={detail.avatar} memberId={detail.member_id} size="lg" /></div>
            <div className="space-y-1.5 text-sm">
              <p><span className="text-muted-foreground">Kullanıcı adı:</span> {detail.username || detail.full_name || '-'}</p>
              <p><span className="text-muted-foreground">Üye No:</span> {detail.member_id || '-'}</p>
              <p><span className="text-muted-foreground">E-posta:</span> {detail.email}</p>
              <p><span className="text-muted-foreground">Kayıt tarihi:</span> {detail.created_date ? new Date(detail.created_date).toLocaleDateString('tr-TR') : '-'}</p>
              <p><span className="text-muted-foreground">Üyelik durumu:</span> {detail.membership_status || '-'}</p>
              <p><span className="text-muted-foreground">Aktif/Pasif:</span> {detail.membership_status === 'active' ? 'Aktif' : 'Pasif'}</p>
              <p><span className="text-muted-foreground">Üyelik başlangıcı:</span> {detail.membership_start ? new Date(detail.membership_start).toLocaleDateString('tr-TR') : '-'}</p>
              <p><span className="text-muted-foreground">Üyelik bitişi:</span> {detail.membership_end ? new Date(detail.membership_end).toLocaleDateString('tr-TR') : '-'}</p>
              <p><span className="text-muted-foreground">Kalan gün:</span> {detail.membership_end ? Math.max(0, Math.ceil((new Date(detail.membership_end) - new Date()) / 86400000)) : '-'}</p>
            </div>
            <button onClick={() => setDetail(null)} className="mt-4 bg-secondary px-4 py-2 rounded-lg text-sm w-full">Kapat</button>
          </div>
        </div>
      )}
      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title="Kullanıcıyı sil?" description={`${confirm?.email} kalıcı olarak silinecek.`} onConfirm={() => del(confirm)} />
    </div>
  );
}