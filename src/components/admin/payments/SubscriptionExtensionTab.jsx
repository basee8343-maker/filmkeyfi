import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import SubscriptionUserRow from '@/components/admin/payments/SubscriptionUserRow';

export default function SubscriptionExtensionTab() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [days, setDays] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const activeUsers = useMemo(() => users.filter((u) => u.membership_status === 'active' && (!u.membership_end || new Date(u.membership_end) > new Date())), [users]);

  const load = async () => {
    setLoading(true);
    const items = await base44.entities.User.list('-membership_end', 500).catch(() => []);
    setUsers(items);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  const toggleAll = () => setSelected(selected.length === activeUsers.length ? [] : activeUsers.map((u) => u.id));
  const extend = async () => {
    if (!selected.length) return toast({ title: 'En az bir kullanıcı seçin', variant: 'destructive' });
    setSaving(true);
    try {
      const response = await base44.functions.invoke('extend-subscriptions', { user_ids: selected, days: Number(days) });
      toast({ title: `${response.data.updated} abonelik ${days} gün uzatıldı` });
      setSelected([]); await load();
    } catch (error) { toast({ title: 'Uzatma başarısız', description: error.response?.data?.error || error.message, variant: 'destructive' }); }
    setSaving(false);
  };

  if (loading) return <div className="py-20 text-center text-gray-400">Yükleniyor...</div>;
  return <div className="space-y-4">
    <div className="flex flex-col sm:flex-row gap-3 sm:items-end rounded-xl bg-[#16161e] border border-white/5 p-4">
      <div className="flex-1"><h2 className="text-lg font-bold text-white">Abonelik Gün Uzatma</h2><p className="text-xs text-gray-400">Yalnızca aboneliği devam eden kullanıcılar listelenir.</p></div>
      <label className="text-xs text-gray-300">Eklenecek gün<input type="number" min="1" max="3650" value={days} onChange={(e) => setDays(e.target.value)} className="mt-1 w-full sm:w-28 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white" /></label>
      <button onClick={extend} disabled={saving || !selected.length} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{saving ? 'Uzatılıyor...' : 'Seçilenleri Uzat'}</button>
    </div>
    <div className="flex items-center justify-between"><p className="text-sm text-gray-400">{activeUsers.length} aktif abone</p><button onClick={toggleAll} className="text-sm font-semibold text-purple-400">{selected.length === activeUsers.length && activeUsers.length ? 'Tüm seçimi kaldır' : 'Tüm kullanıcıları seç'}</button></div>
    {activeUsers.length ? <div className="space-y-2">{activeUsers.map((user) => <SubscriptionUserRow key={user.id} user={user} selected={selected.includes(user.id)} onToggle={toggle} />)}</div> : <div className="rounded-xl bg-[#16161e] p-8 text-center text-gray-400">Devam eden abonelik bulunamadı.</div>}
  </div>;
}