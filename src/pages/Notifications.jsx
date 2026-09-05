import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';
import EmptyState from '@/components/movie/EmptyState';

export default function Notifications() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!user) return;
    base44.entities.Notification.filter({ user_id: user.id }, '-created_date', 50).then((r) => { setItems(r); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => {
    load();
    const unsub = base44.entities.Notification.subscribe(load);
    // Polling yedeği — realtime kaçırsa diye 10sn'de bir yenile
    const interval = setInterval(load, 10000);
    return () => { unsub(); clearInterval(interval); };
  }, [user?.id]);

  const markRead = async (n) => {
    await base44.entities.Notification.update(n.id, { read: true }).catch(() => {});
    load();
  };
  const markAll = async () => {
    await Promise.all(items.filter((n) => !n.read).map((n) => base44.entities.Notification.update(n.id, { read: true })));
    load();
  };
  const deleteAll = async () => {
    await base44.entities.Notification.deleteMany({ user_id: user.id });
    setItems([]); toast({ title: 'Tüm bildirimler silindi' });
  };

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold flex items-center gap-2"><Bell className="w-6 h-6 text-primary" /> Bildirimler</h1>
        <div className="flex items-center gap-3">
          {items.some((n) => !n.read) && <button onClick={markAll} className="text-sm text-primary flex items-center gap-1"><Check className="w-4 h-4" /> Tümünü okundu</button>}
          {items.length > 0 && <button onClick={deleteAll} className="text-sm text-destructive flex items-center gap-1"><Trash2 className="w-4 h-4" /> Tümünü Sil</button>}
        </div>
      </div>
      {loading ? <p className="text-muted-foreground">Yükleniyor...</p> :
       items.length === 0 ? <EmptyState icon={Bell} title="Bildirim yok" description="Henüz bildiriminiz bulunmuyor." /> :
       <div className="space-y-2">
         {items.map((n) => (
           <div key={n.id} className={`p-3 rounded-xl border flex gap-3 ${n.read ? 'bg-card border-border' : 'bg-primary/5 border-primary/30'}`}>
             <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-transparent' : 'bg-primary'}`} />
             <div className="flex-1">
               <p className="font-semibold text-sm">{n.title}</p>
               {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
               {n.link && <Link to={n.link} className="text-xs text-primary">Görüntüle →</Link>}
             </div>
             {!n.read && <button onClick={() => markRead(n)} className="text-xs text-muted-foreground hover:text-foreground">Okundu</button>}
           </div>
         ))}
       </div>}
    </div>
  );
}