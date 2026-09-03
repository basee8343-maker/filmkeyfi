import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { useAdminNotifications, requestNotificationPermission } from '@/hooks/useAdminNotifications';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Trash2, Send, Trash, Bell, BellOff, CheckCheck, UserPlus, Headset, Flag, ShoppingBag } from 'lucide-react';

const TYPE_ICONS = {
  new_user: UserPlus,
  support: Headset,
  report: Flag,
  info: Bell,
};

const TYPE_LINKS = {
  new_user: '/admin/kullanicilar',
  support: '/admin/destek',
  report: '/admin/sikayetler',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'az önce';
  if (min < 60) return `${min} dakika önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} saat önce`;
  const day = Math.floor(hr / 24);
  return `${day} gün önce`;
}

export default function AdminNotifications() {
  const { user: admin } = useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead, reload } = useAdminNotifications();
  const [confirm, setConfirm] = useState(null);
  const [confirmAll, setConfirmAll] = useState(null);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ user_id: '', title: '', body: '' });
  const [notifStatus, setNotifStatus] = useState(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  useEffect(() => {
    base44.entities.User.list(500).then(setUsers).catch(() => {});
  }, []);

  const handleNotifPermission = async () => {
    const r = await requestNotificationPermission();
    setNotifStatus(r);
    if (r === 'granted') toast({ title: 'Bildirim izni verildi', description: 'Artık gerçek zamanlı bildirim alacaksınız.' });
    else if (r === 'denied') toast({ title: 'Bildirim izni reddedildi', variant: 'destructive' });
  };

  const del = async () => { await base44.entities.Notification.delete(confirm.id); toast({ title: 'Silindi' }); setConfirm(null); reload(); };
  const delAll = async () => {
    for (const n of notifications) { await base44.entities.Notification.delete(n.id).catch(() => {}); }
    toast({ title: 'Tüm bildirimler silindi' }); setConfirmAll(null); reload();
  };

  const send = async (e) => {
    e.preventDefault();
    if (!form.user_id || !form.title) return;
    await base44.entities.Notification.create({ user_id: form.user_id, title: form.title, body: form.body, type: 'info' });
    toast({ title: 'Bildirim gönderildi' }); setForm({ user_id: '', title: '', body: '' });
  };

  const handleClick = (n) => {
    if (!n.read) markRead(n.id);
    const link = n.link || TYPE_LINKS[n.type] || '/admin';
    navigate(link);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-extrabold">Bildirim Merkezi</h1>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && <button onClick={markAllRead} className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 px-3 py-2 rounded-lg text-sm font-semibold"><CheckCheck className="w-4 h-4" /> Tümunu Okundu Isaretle</button>}
          {notifications.length > 0 && <button onClick={() => setConfirmAll(true)} className="flex items-center gap-1.5 bg-destructive/10 text-destructive border border-destructive/20 px-3 py-2 rounded-lg text-sm font-semibold"><Trash className="w-4 h-4" /> Tumunu Sil</button>}
        </div>
      </div>

      {/* Push bildirim izmi alanı */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {notifStatus === 'granted' ? <Bell className="w-5 h-5 text-green-500" /> : <BellOff className="w-5 h-5 text-amber-500" />}
          <div>
            <p className="font-semibold text-sm">Web Push Bildirimleri</p>
            <p className="text-xs text-muted-foreground">
              {notifStatus === 'granted' ? 'Aktif — admin paneli kapalıyken de bildirim alacaksınız.' :
               notifStatus === 'denied' ? 'Reddedildi — tarayıcı ayarlarından bildirim iznini açmanız gerekir.' :
               notifStatus === 'unsupported' ? 'Bu cihaz/tarayıcı web push desteklemiyor.' :
               'Devre dışı — bildirimleri almak için izni etkinleştirin.'}
            </p>
          </div>
        </div>
        {notifStatus !== 'granted' && notifStatus !== 'unsupported' && (
          <button onClick={handleNotifPermission} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold shrink-0">Bildirim Izni Ver</button>
        )}
      </div>

      {/* Admin bildirim listesi (real-time) */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Bell className="w-5 h-5" /> Sistem Bildirimleri {unreadCount > 0 && <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">{unreadCount} yeni</span>}</h2>
        <div className="space-y-2">
          {notifications.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Henüz bildirim yok.</p>}
          {notifications.map((n) => {
            const Icon = TYPE_ICONS[n.type] || Bell;
            return (
              <div key={n.id} onClick={() => handleClick(n)} className={`bg-card border rounded-lg p-3 flex items-start gap-3 cursor-pointer hover:border-primary/50 transition-colors ${n.read ? 'border-border' : 'border-primary/40 bg-primary/5'}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${n.read ? 'bg-secondary text-muted-foreground' : 'bg-primary/15 text-primary'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{n.title}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  {n.body && <p className="text-sm text-muted-foreground truncate">{n.body}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.created_date)} · {new Date(n.created_date).toLocaleString('tr-TR')}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setConfirm(n); }} className="p-1.5 rounded bg-red-500/20 text-red-400 shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manuel bildirim gönderme */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><Send className="w-4 h-4" /> Manuel Bildirim Gonder</h3>
        <select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border" required>
          <option value="">Kullanici secin...</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.username || u.full_name} ({u.email})</option>)}
        </select>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Baslik" className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border" required />
        <input value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Icerik" className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border" />
        <button type="button" onClick={send} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Send className="w-4 h-4" /> Gonder</button>
      </div>

      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title="Bildirimi sil?" onConfirm={del} />
      <ConfirmDialog open={!!confirmAll} onOpenChange={(o) => !o && setConfirmAll(null)} title="Tum bildirimler silinsin mi?" description="Bu islem geri alinamaz." confirmText="Tumunu Sil" onConfirm={delAll} />
    </div>
  );
}