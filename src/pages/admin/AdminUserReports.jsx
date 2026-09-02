import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Flag, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Image } from '@/components/ui/image';

export default function AdminUserReports() {
  const { toast } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  const load = () => {
    base44.entities.Report.list('-created_date', 200).then((r) => setReports(r)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    const unsub = base44.entities.Report.subscribe(() => load());
    return () => unsub();
  }, []);

  const updateStatus = async (id, status) => {
    try { await base44.entities.Report.update(id, { status }); toast({ title: 'Şikayet güncellendi' }); load(); }
    catch { toast({ title: 'Güncellenemedi', variant: 'destructive' }); }
  };

  const contextLabel = { dm: 'Özel Mesaj', room: 'Oda', profile: 'Profil' };
  const statusLabel = { pending: 'Bekliyor', reviewed: 'İncelendi', resolved: 'Çözüldü' };
  const statusColor = { pending: 'bg-amber-500/20 text-amber-300', reviewed: 'bg-blue-500/20 text-blue-300', resolved: 'bg-green-500/20 text-green-300' };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4 flex items-center gap-2"><Flag className="w-6 h-6 text-destructive" /> Şikayetler</h1>
      {loading ? <p className="text-muted-foreground">Yükleniyor...</p> :
       !reports.length ? <p className="text-muted-foreground">Henüz şikayet yok.</p> :
       <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusColor[r.status]}`}>{statusLabel[r.status]}</span>
                  <span className="text-xs text-muted-foreground">{contextLabel[r.context] || r.context}</span>
                </div>
                <p className="text-sm font-semibold">{r.target_name || 'Bilinmeyen kullanıcı'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Şikayet eden: {r.reporter_name}</p>
                {r.reason && <p className="text-sm text-muted-foreground mt-2 bg-secondary/50 rounded p-2">{r.reason}</p>}
                {r.file_url && <Image src={r.file_url} alt="ek" className="mt-2 rounded-lg max-h-32 cursor-pointer" fittingType="fit" onClick={() => setLightbox(r.file_url)} />}
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_date).toLocaleString('tr-TR')}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {r.status === 'pending' && <button onClick={() => updateStatus(r.id, 'reviewed')} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded font-semibold whitespace-nowrap">İncelendi</button>}
                {r.status !== 'resolved' && <button onClick={() => updateStatus(r.id, 'resolved')} className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded font-semibold whitespace-nowrap">Çözüldü</button>}
              </div>
            </div>
          </div>
        ))}
       </div>}
      {lightbox && <div onClick={() => setLightbox(null)} className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4"><button className="absolute top-4 right-4 text-white p-2"><X className="w-6 h-6" /></button><Image src={lightbox} className="max-w-full max-h-full rounded-lg" fittingType="fit" /></div>}
    </div>
  );
}