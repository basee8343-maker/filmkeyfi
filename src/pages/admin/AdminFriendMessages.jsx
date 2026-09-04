import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AdminFriendThread from '@/components/admin/AdminFriendThread';
import { useToast } from '@/components/ui/use-toast';
import useMessageProfiles from '@/hooks/useMessageProfiles';
import UserBadge from '@/components/admin/UserBadge';

export default function AdminFriendMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const { toast } = useToast();
  const profiles = useMessageProfiles(messages.flatMap((message) => [message.sender_id, message.recipient_id]));
  const load = () => base44.entities.DirectMessage.list('-created_date', 500).then((items) => { setMessages(items); setLoading(false); });
  useEffect(() => { load(); const off = base44.entities.DirectMessage.subscribe(load); return off; }, []);
  const threads = useMemo(() => {
    const grouped = {};
    messages.forEach((message) => {
      if (!grouped[message.friendship_id]) grouped[message.friendship_id] = { id: message.friendship_id, messages: [] };
      grouped[message.friendship_id].messages.push(message);
    });
    return Object.values(grouped).map((thread) => ({ ...thread, messages: thread.messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)) })).sort((a, b) => new Date(b.messages.at(-1)?.created_date) - new Date(a.messages.at(-1)?.created_date));
  }, [messages]);
  const clearAll = async () => {
    await base44.functions.invoke('friend-service', { action: 'admin_clear_all' });
    setMessages([]); setActive(null); setConfirmAll(false);
    toast({ title: 'Tüm arkadaş mesajları silindi' });
  };
  if (loading) return <p className="text-muted-foreground">Yükleniyor...</p>;
  const selected = active && threads.find((thread) => thread.id === active);
  if (selected) return <AdminFriendThread thread={selected} profiles={profiles} onBack={() => setActive(null)} />;
  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">Arkadaş Mesajları</h1><p className="text-sm text-muted-foreground">Özel mesajlar gizlidir ve kayıt altına alınmaz.</p></div>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        <p className="font-semibold mb-1">Özel mesajlar gizlidir</p>
        <p className="text-sm">Kullanıcıların özel sohbetleri hiçbir log veya kayıt sistemine alınmaz. Mesajlar yalnızca konuşmayı yapan taraflara görünür ve silindiğinde tamamen kaldırılır.</p>
      </div>
    </div>
  );
}