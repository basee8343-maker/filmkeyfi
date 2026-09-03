import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Smartphone, Monitor, Tablet, X, MapPin, Wifi, WifiOff, Search, Signal, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const connInfo = (t) => {
  if (t === 'wifi') return { label: 'Wi-Fi', Icon: Wifi, color: 'text-green-400', glow: 'shadow-[0_0_8px_1px_rgba(74,222,128,0.7)]' };
  if (t === 'cellular') return { label: 'Mobil Veri', Icon: Signal, color: 'text-green-400', glow: 'shadow-[0_0_8px_1px_rgba(74,222,128,0.7)]' };
  if (t === 'ethernet') return { label: 'Ethernet', Icon: Wifi, color: 'text-green-400', glow: 'shadow-[0_0_8px_1px_rgba(74,222,128,0.7)]' };
  return { label: 'Bağlantı bilinmiyor', Icon: WifiOff, color: 'text-muted-foreground', glow: '' };
};

const ONLINE_TIMEOUT = 90 * 1000;

const relTime = (d) => {
  if (!d) return '-';
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 0) return 'şimdi';
  if (diff < 60000) return 'şimdi';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' dk önce';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' sa önce';
  return new Date(d).toLocaleString('tr-TR');
};

const deviceIcon = (t) => (t === 'Telefon' ? Smartphone : t === 'Tablet' ? Tablet : Monitor);

export default function AdminSessions() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [query, setQuery] = useState('');
  const [view, setView] = useState('all'); // all | online
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
    const id = setInterval(load, 15000);
    return () => { off(); clearInterval(id); };
  }, []);

  const isOnline = (s) => s.status === 'active' && s.last_active && (Date.now() - new Date(s.last_active).getTime() < ONLINE_TIMEOUT);
  const online = sessions.filter(isOnline);

  const filtered = sessions.filter((s) => {
    if (view === 'online' && !isOnline(s)) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      if (!(s.user_name || '').toLowerCase().includes(q) && !(s.user_id || '').toLowerCase().includes(q) && !(s.ip || '').toLowerCase().includes(q) && !(s.city || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const DeviceIcon = (t) => deviceIcon(t);

  const clearAll = async () => {
    if (!confirm('Tüm oturum/kayıt geçmişi silinsin mi? Bu işlem geri alınamaz.')) return;
    setClearing(true);
    try {
      await base44.entities.UserSession.deleteMany({});
      setSessions([]);
      toast({ title: 'Tüm oturumlar silindi' });
    } catch (e) {
      toast({ title: 'Silinemedi', description: e.response?.data?.error || e.message, variant: 'destructive' });
    } finally { setClearing(false); }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">Oturumlar / Cihazlar</h1>
      <p className="text-sm text-muted-foreground mb-4">Kullanıcıların aktif ve geçmiş oturumları, IP/cihaz/konum bilgileri.</p>

      {/* Şu anda çevrimiçi */}
      <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/5 p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" /><h2 className="font-bold">Şu anda çevrimiçi ({online.length})</h2></div>
          <button onClick={clearAll} disabled={clearing || sessions.length === 0} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/15 text-destructive text-xs font-semibold border border-destructive/30 disabled:opacity-50">
            <Trash2 className="w-3.5 h-3.5" /> Tümünü Sil
          </button>
        </div>
        {online.length === 0 ? <p className="text-sm text-muted-foreground">Çevrimiçi kullanıcı yok.</p> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {online.map((s) => {
              const I = deviceIcon(s.device_type);
              const c = connInfo(s.connection_type);
              return (
                <button key={s.id} onClick={() => setDetail(s)} className="text-left rounded-xl border border-border bg-card p-3 hover:bg-secondary/40 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <I className="w-4 h-4 text-green-400" />
                    <span className="font-semibold text-sm truncate">{s.user_name || 'Kullanıcı'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">Cihaz: {s.device_type || '-'} · {s.os || '-'} · {s.browser || '-'}</p>
                  <p className="text-xs text-muted-foreground truncate">Model: {s.model || 'Model bilgisi kullanılamıyor'}</p>
                  <p className="text-xs text-muted-foreground truncate">IP: {s.ip || '-'}</p>
                  <p className="text-xs text-muted-foreground truncate">Şehir: {s.city || s.country || '-'}</p>
                  <p className="text-xs flex items-center gap-1.5"><c.Icon className={`w-3.5 h-3.5 ${c.color} ${c.glow}`} />{c.label}</p>
                  <p className="text-xs text-green-400">Son aktif: {relTime(s.last_active)}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button onClick={() => setView('all')} className={`px-3 py-1.5 text-sm font-semibold ${view === 'all' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>Tümü</button>
          <button onClick={() => setView('online')} className={`px-3 py-1.5 text-sm font-semibold ${view === 'online' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>Çevrimiçi</button>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="İsim, ID, IP veya şehir ara..." className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      {loading ? <p className="text-muted-foreground">Yükleniyor...</p> :
        filtered.length === 0 ? <p className="text-muted-foreground text-sm">Oturum bulunamadı.</p> : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm min-w-[960px]">
              <thead className="bg-secondary/40 text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold px-3 py-2.5">Kullanıcı</th>
                  <th className="text-left font-semibold px-3 py-2.5">IP</th>
                  <th className="text-left font-semibold px-3 py-2.5">Cihaz</th>
                  <th className="text-left font-semibold px-3 py-2.5">Model</th>
                  <th className="text-left font-semibold px-3 py-2.5">İşletim Sistemi</th>
                  <th className="text-left font-semibold px-3 py-2.5">Tarayıcı</th>
                  <th className="text-left font-semibold px-3 py-2.5">Bağlantı</th>
                  <th className="text-left font-semibold px-3 py-2.5">Konum</th>
                  <th className="text-left font-semibold px-3 py-2.5">Son Aktif</th>
                  <th className="text-left font-semibold px-3 py-2.5">Durum</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const I = deviceIcon(s.device_type);
                  const online = isOnline(s);
                  return (
                    <tr key={s.id} onClick={() => setDetail(s)} className="border-t border-border hover:bg-secondary/30 cursor-pointer">
                      <td className="px-3 py-2.5">
                        <p className="font-semibold truncate max-w-[140px]">{s.user_name || 'Kullanıcı'}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[140px]">{s.user_id}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{s.ip || '-'}</td>
                      <td className="px-3 py-2.5"><span className="inline-flex items-center gap-1.5 text-xs"><I className="w-3.5 h-3.5" />{s.device_type || '-'}</span></td>
                      <td className="px-3 py-2.5 text-xs">{s.model || 'Model bilgisi kullanılamıyor'}</td>
                      <td className="px-3 py-2.5 text-xs">{s.os || '-'}</td>
                      <td className="px-3 py-2.5 text-xs">{s.browser || '-'}</td>
                      <td className="px-3 py-2.5">
                        {(() => { const c = connInfo(s.connection_type); return <span className={`inline-flex items-center gap-1.5 text-xs ${c.color}`}><c.Icon className={`w-3.5 h-3.5 ${c.glow}`} />{c.label}</span>; })()}
                      </td>
                      <td className="px-3 py-2.5 text-xs">{[s.city, s.region, s.country].filter(Boolean).join(', ') || '-'}{s.isp ? <span className="block text-muted-foreground">{s.isp}</span> : null}</td>
                      <td className="px-3 py-2.5 text-xs">{relTime(s.last_active)}</td>
                      <td className="px-3 py-2.5">
                        {online ? <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-500/20 text-green-400"><Wifi className="w-3 h-3" />Çevrimiçi</span>
                          : <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-muted text-muted-foreground"><WifiOff className="w-3 h-3" />Çevrimdışı</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {detail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-card border border-border rounded-xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Oturum Detayı</h3>
              <button onClick={() => setDetail(null)} className="p-1 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 text-sm">
              <Row label="Kullanıcı" value={detail.user_name || '-'} />
              <Row label="Kullanıcı ID" value={detail.user_id} />
              <Row label="Oturum ID" value={detail.session_id} mono />
              <Row label="Durum" value={isOnline(detail) ? '🟢 Çevrimiçi' : detail.status === 'active' ? 'Aktif (uzakta)' : 'Pasif'} />
              <Row label="IP adresi" value={detail.ip || '-'} />
              <Row label="Son IP" value={detail.last_ip || '-'} />
              <Row label="Ülke" value={detail.country || '-'} />
              <Row label="Şehir" value={detail.city || '-'} />
              <Row label="Bölge" value={detail.region || '-'} />
              <Row label="ISP" value={detail.isp || '-'} />
              <Row label="Cihaz türü" value={detail.device_type || '-'} />
              <Row label="İşletim sistemi" value={detail.os || '-'} />
              <Row label="Tarayıcı" value={detail.browser || '-'} />
              <Row label="Bağlantı" value={connInfo(detail.connection_type).label} />
              <Row label="Model" value={detail.model || 'Model bilgisi kullanılamıyor'} />
              <Row label="İlk giriş" value={detail.first_login ? new Date(detail.first_login).toLocaleString('tr-TR') : '-'} />
              <Row label="Son aktif" value={detail.last_active ? new Date(detail.last_active).toLocaleString('tr-TR') : '-'} />
              {detail.ended_at && <Row label="Bitiş" value={new Date(detail.ended_at).toLocaleString('tr-TR')} />}
              {typeof detail.gps_lat === 'number' && typeof detail.gps_lng === 'number' ? (
                <div className="pt-2 mt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1"><MapPin className="w-4 h-4" />GPS Konumu (kullanıcı izniyle)</div>
                  <Row label="Enlem" value={detail.gps_lat} />
                  <Row label="Boylam" value={detail.gps_lng} />
                  {detail.gps_accuracy != null && <Row label="Doğruluk" value={Math.round(detail.gps_accuracy) + ' m'} />}
                  <Row label="GPS zamanı" value={detail.gps_at ? new Date(detail.gps_at).toLocaleString('tr-TR') : '-'} />
                  <a href={`https://www.openstreetmap.org/?mlat=${detail.gps_lat}&mlon=${detail.gps_lng}#map=16/${detail.gps_lat}/${detail.gps_lng}`} target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs text-primary underline">Haritada gör</a>
                </div>
              ) : <p className="text-xs text-muted-foreground pt-2 mt-2 border-t border-border">GPS konumu yok (kullanıcı konum izni vermedi).</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className={`text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>{value ?? '-'}</span>
    </div>
  );
}