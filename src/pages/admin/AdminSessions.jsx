import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Smartphone, Monitor, Tablet, Wifi, WifiOff, Search, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ONLINE_TIMEOUT = 90 * 1000;
const deviceIcon = (t) => (t === 'Telefon' ? Smartphone : t === 'Tablet' ? Tablet : Monitor);

const relTime = (d) => {
  if (!d) return '-';
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 0) return 'şimdi';
  if (diff < 60000) return 'şimdi';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' dk önce';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' sa önce';
  return new Date(d).toLocaleString('tr-TR');
};

export default function AdminSessions() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [clearing, setClearing] = useState(false);

  const load = () => {
    base44.entities.UserSession.list('-last_active', 500)
      .then((s) => { setSessions(s); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const off = base44.entities.UserSession.subscribe((ev) => {
      if (ev.type === 'create') setSessions((p) => [ev.data, ...p.filter((x) => x.id !== ev.data.id)]);
      else if (ev.type === 'update') setSessions((p) => p.map((x) => (x.id === ev.data.id ? { ...x, ...ev.data } : x)));
      else if (ev.type === 'delete') setSessions((p) => p.filter((x) => x.id !== ev.id));
    });
    return () => { off(); };
  }, []);

  const isOnline = (s) => s.status === 'active' && s.last_active && (Date.now() - new Date(s.last_active).getTime() < ONLINE_TIMEOUT);

  // Kullanıcı başına en son oturum
  const userMap = {};
  sessions.forEach((s) => {
    if (!s.user_id) return;
    if (!userMap[s.user_id] || new Date(s.last_active) > new Date(userMap[s.user_id].last_active)) {
      userMap[s.user_id] = s;
    }
  });

  // Kullanıcı başına IP seti
  const userIPs = {};
  sessions.forEach((s) => {
    if (!s.user_id) return;
    if (!userIPs[s.user_id]) userIPs[s.user_id] = new Set();
    if (s.ip) userIPs[s.user_id].add(s.ip);
  });

  const userSessions = Object.values(userMap);

  const filtered = userSessions.filter((s) => {
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      if (!(s.user_name || '').toLowerCase().includes(q) && !(s.ip || '').toLowerCase().includes(q) && !(s.city || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const clearAll = async () => {
    if (!confirm('Tüm oturum/kayıt geçmişi silinsin mi?')) return;
    setClearing(true);
    try {
      await base44.entities.UserSession.deleteMany({});
      setSessions([]);
      toast({ title: 'Tüm oturumlar silindi' });
    } catch (e) {
      toast({ title: 'Silinemedi', variant: 'destructive' });
    } finally { setClearing(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-extrabold">Oturumlar / Cihazlar</h1>
          <p className="text-sm text-muted-foreground">Kullanıcı başına en son oturum ve IP durumu.</p>
        </div>
        <button onClick={clearAll} disabled={clearing || sessions.length === 0} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/15 text-destructive text-xs font-semibold border border-destructive/30 disabled:opacity-50">
          <Trash2 className="w-3.5 h-3.5" /> Tümünü Sil
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="İsim, IP veya şehir ara..." className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {loading ? <p className="text-muted-foreground">Yükleniyor...</p> :
        filtered.length === 0 ? <p className="text-muted-foreground text-sm">Oturum bulunamadı.</p> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((s) => {
              const I = deviceIcon(s.device_type);
              const online = isOnline(s);
              const ips = userIPs[s.user_id] || new Set();
              const ipList = [...ips].filter(Boolean);
              const ipConsistent = ipList.length <= 1;
              return (
                <div key={s.user_id} className="rounded-xl border border-border bg-card p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <I className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-sm truncate">{s.ip || '-'}</span>
                    </div>
                    {online ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 shrink-0"><Wifi className="w-3 h-3" />Çevrimiçi</span> : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground shrink-0"><WifiOff className="w-3 h-3" />Çevrimdışı</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {ipConsistent ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400"><ShieldCheck className="w-3 h-3" />Sabit IP</span> : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400"><AlertTriangle className="w-3 h-3" />Farklı IP ({ipList.length})</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{s.device_type || '-'} · {s.os || '-'} · {s.browser || '-'}</p>
                  <p className="text-xs text-muted-foreground truncate">Konum: {[s.city, s.country].filter(Boolean).join(', ') || '-'}</p>
                  <p className="text-xs text-muted-foreground">Son aktif: {relTime(s.last_active)}</p>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}