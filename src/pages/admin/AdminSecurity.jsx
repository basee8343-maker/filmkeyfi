import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { ShieldAlert, ShieldCheck, ShieldOff, QrCode, KeyRound } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function AdminSecurity() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ enabled: false, hasSecret: false });
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const loadStatus = () => base44.functions.invoke('admin-2fa', { action: 'status' }).then((r) => setStatus(r.data)).catch(() => {});
  const loadLogs = () => base44.entities.SecurityLog.list(200).then((r) => { setLogs(r); setLoading(false); }).catch(() => setLoading(false));

  useEffect(() => { loadStatus(); loadLogs(); }, []);

  const doSetup = async () => {
    setBusy(true);
    try {
      const r = await base44.functions.invoke('admin-2fa', { action: 'setup' });
      setSetup(r.data);
    } catch (e) { toast({ title: 'Kurulum başarısız', description: e.response?.data?.error, variant: 'destructive' }); }
    setBusy(false);
  };
  const doEnable = async () => {
    setBusy(true);
    try {
      await base44.functions.invoke('admin-2fa', { action: 'enable', code });
      setSetup(null); setCode(''); loadStatus();
      toast({ title: '2FA etkinleştirildi' });
    } catch (e) { toast({ title: 'Hatalı kod', variant: 'destructive' }); }
    setBusy(false);
  };
  const doDisable = async () => {
    setBusy(true);
    try {
      await base44.functions.invoke('admin-2fa', { action: 'disable' });
      loadStatus(); toast({ title: '2FA kapatıldı' });
    } catch (e) { toast({ title: 'İşlem başarısız', variant: 'destructive' }); }
    setBusy(false);
  };

  const clearLogs = async () => {
    setClearing(true);
    try {
      await base44.entities.SecurityLog.deleteMany({});
      setLogs([]); setShowClearConfirm(false);
      toast({ title: 'Tüm güvenlik kayıtları silindi' });
    } catch (e) { toast({ title: 'Kayıtlar silinemedi', variant: 'destructive' }); }
    setClearing(false);
  };

  const color = (l) => l === 'critical' ? 'bg-red-500/20 text-red-400' : l === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400';

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4 flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-primary" /> Güvenlik</h1>

      <div className="bg-card border border-border rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {status.enabled ? <ShieldCheck className="w-5 h-5 text-green-400" /> : <ShieldOff className="w-5 h-5 text-muted-foreground" />}
            <h2 className="font-bold">İki Faktörlü Doğrulama (2FA)</h2>
            <span className={`text-xs px-2 py-0.5 rounded ${status.enabled ? 'bg-green-500/20 text-green-400' : 'bg-secondary'}`}>{status.enabled ? 'Açık' : 'Kapalı'}</span>
          </div>
        </div>
        {!status.enabled && !setup && (
          <button onClick={doSetup} disabled={busy} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2"><KeyRound className="w-4 h-4" /> 2FA Kur</button>
        )}
        {setup && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Google Authenticator / Authy gibi bir uygulama ile aşağıdaki gizli anahtarı ekleyin, sonra 6 haneli kodu girin.</p>
            <div className="flex items-center gap-2 bg-secondary/60 rounded-lg p-2">
              <QrCode className="w-4 h-4 text-muted-foreground" />
              <code className="text-xs break-all">{setup.secret}</code>
            </div>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6 haneli kod" maxLength={6} className="w-40 bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <div className="flex gap-2">
              <button onClick={doEnable} disabled={busy || code.length !== 6} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">Etkinleştir</button>
              <button onClick={() => setSetup(null)} className="bg-secondary px-4 py-2 rounded-lg text-sm">İptal</button>
            </div>
          </div>
        )}
        {status.enabled && (
          <button onClick={doDisable} disabled={busy} className="bg-destructive/20 text-destructive px-4 py-2 rounded-lg text-sm font-semibold">2FA Kapat</button>
        )}
        {status.enabled && <p className="text-xs text-muted-foreground mt-2">2FA açıkken admin paneline her girişte doğrulama kodu istenir.</p>}
      </div>

      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="font-bold">Güvenlik Olayları</h2>
        {logs.length > 0 && <button onClick={() => setShowClearConfirm(true)} className="rounded-lg bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90">TÜMÜNÜ SİL</button>}
      </div>
      {loading ? <p className="text-muted-foreground">Yükleniyor...</p> :
       logs.length === 0 ? <p className="text-muted-foreground text-sm">Kayıtlı güvenlik olayı yok.</p> :
       <div className="space-y-2">
         {logs.map((l) => (
           <div key={l.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
             <span className={`text-xs px-2 py-1 rounded ${color(l.level)}`}>{l.level}</span>
             <div className="flex-1 min-w-0">
               <p className="font-medium text-sm">{l.action}</p>
               <p className="text-xs text-muted-foreground truncate">{l.user_email || l.user_id}{l.detail ? ` · ${l.detail}` : ''}</p>
             </div>
             <span className="text-xs text-muted-foreground shrink-0">{l.created_date ? new Date(l.created_date).toLocaleString('tr-TR') : ''}</span>
           </div>
         ))}
       </div>}
      <ConfirmDialog open={showClearConfirm} onOpenChange={setShowClearConfirm} title="Tüm kayıtlar silinsin mi?" description="Bütün güvenlik olayları kalıcı olarak silinecek. Bu işlem geri alınamaz." confirmText={clearing ? 'Siliniyor...' : 'Tümünü Sil'} onConfirm={clearLogs} />
    </div>
  );
}