import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Crown } from 'lucide-react';

export default function AdminSubscriptions() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.User.list(500).then((u) => {
      setUsers(u.filter((x) => x.membership_status === 'active' || x.subscription_status === 'ACTIVE'));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">Abonelikler</h1>
      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aktif abonelik yok.</p>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 px-3 font-semibold">Kullanıcı</th>
                  <th className="py-2 px-3 font-semibold">Paket</th>
                  <th className="py-2 px-3 font-semibold">Başlangıç</th>
                  <th className="py-2 px-3 font-semibold">Bitiş</th>
                  <th className="py-2 px-3 font-semibold">Kalan Gün</th>
                  <th className="py-2 px-3 font-semibold">Durum</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const daysLeft = u.membership_end ? Math.max(0, Math.ceil((new Date(u.membership_end).getTime() - Date.now()) / 86400000)) : 0;
                  return (
                    <tr key={u.id} className="border-b border-border hover:bg-secondary/30">
                      <td className="py-2.5 px-3 font-medium">{u.username || u.full_name || u.email}</td>
                      <td className="py-2.5 px-3">{u.subscription_plan || '1 Aylık Abonelik'}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{u.membership_start ? new Date(u.membership_start).toLocaleDateString('tr-TR') : '—'}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{u.membership_end ? new Date(u.membership_end).toLocaleDateString('tr-TR') : '—'}</td>
                      <td className="py-2.5 px-3"><span className={`font-semibold ${daysLeft <= 5 ? 'text-amber-500' : 'text-green-500'}`}>{daysLeft} gün</span></td>
                      <td className="py-2.5 px-3"><span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-500"><Crown className="w-3 h-3" /> Aktif</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {users.map((u) => {
              const daysLeft = u.membership_end ? Math.max(0, Math.ceil((new Date(u.membership_end).getTime() - Date.now()) / 86400000)) : 0;
              return (
                <div key={u.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{u.username || u.full_name || u.email}</p>
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-500"><Crown className="w-3 h-3" /> Aktif</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{u.subscription_plan || '1 Aylık Abonelik'}</p>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>Bitiş: {u.membership_end ? new Date(u.membership_end).toLocaleDateString('tr-TR') : '—'}</span>
                    <span className={`font-semibold ${daysLeft <= 5 ? 'text-amber-500' : 'text-green-500'}`}>{daysLeft} gün kaldı</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}