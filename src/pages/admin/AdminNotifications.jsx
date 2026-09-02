import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Trash2, Plus, Send, Trash } from 'lucide-react';

export default function AdminNotifications() {
  const { user: admin } = useCurrentUser();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ user_id: '', title: '', body: '' });

  const load = () => { base44.entities.Notification.list(100).then((r) => setItems([...r].reverse())).catch(() => {}); };
  useEffect(() => { load(); base44.entities.User.list(500).then(setUsers).catch(() => {}); }, []);
  const del = async () => { await base44.entities.Notification.delete(confirm.id); toast({ title: 'Silindi' }); setConfirm(null); load(); };
  const [confirmAll, setConfirmAll] = useState(null);
  const delAll = async () => { await base44.entities.Notification.deleteMany({}); toast({ title: 'Tüm bildirimler silindi' }); setConfirmAll(null); load(); };
  const send = async (e) => {
    e.preventDefault();
    if (!form.user_id || !form.title) return;
    await base44.entities.Notification.create({ user_id: form.user_id, title: form.title, body: form.body, type: 'info' });
    toast({ title: 'Bildirim gönderildi' }); setForm({ user_id: '', title: '', body: '' }); load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold">Bildirimler</h1>
        {items.length > 0 && <button onClick={() => setConfirmAll(true)} className="flex items-center gap-1.5 bg-destructive/10 text-destructive border border-destructive/20 px-3 py-2 rounded-lg text-sm font-semibold"><Trash className="w-4 h-4" /> Tümünü Sil</button>}
      </div>
      <form onSubmit={send} className="bg-card border border-border rounded-xl p-4 space-y-3 mb-6">
        <h3 className="font-semibold">Bildirim Gönder</h3>
        <select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border" required>
          <option value="">Kullanıcı seçin...</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.username || u.full_name} ({u.email})</option>)}
        </select>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Başlık" className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border" required />
        <input value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="İçerik" className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border" />
        <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Send className="w-4 h-4" /> Gönder</button>
      </form>
      <div className="space-y-2">
        {items.map((n) => (
          <div key={n.id} className="bg-card border border-border rounded-lg p-3 flex justify-between items-center">
            <div><p className="font-semibold text-sm">{n.title}</p>{n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}<p className="text-xs text-muted-foreground">{new Date(n.created_date).toLocaleString('tr-TR')}</p></div>
            <button onClick={() => setConfirm(n)} className="p-1.5 rounded bg-red-500/20 text-red-400"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title="Bildirimi sil?" onConfirm={del} />
      <ConfirmDialog open={!!confirmAll} onOpenChange={(o) => !o && setConfirmAll(null)} title="Tüm bildirimler silinsin mi?" description="Bu işlem geri alınamaz." confirmText="Tümünü Sil" onConfirm={delAll} />
    </div>
  );
}