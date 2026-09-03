import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const EVENT_LABELS = {
  new_user: 'Yeni Kullanıcı',
  support: 'Yeni Destek Talebi',
  support_message: 'Yeni Destek Mesajı',
  report: 'Yeni Şikayet',
  payment: 'Ödeme Gerçekleşti',
  subscription_active: 'Abonelik Aktif',
  subscription_cancelled: 'Abonelik İptal',
};

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'az önce';
  if (min < 60) return `${min} dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} sa önce`;
  return `${Math.floor(hr / 24)} gün önce`;
}

export default function AdminTelegram() {
  const { toast } = useToast();
  const [tab, setTab] = useState('settings');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [history, setHistory] = useState([]);
  const [retrying, setRetrying] = useState(null);
  const [deleteLog, setDeleteLog] = useState(null);
  const [tokenInput, setTokenInput] = useState('');

  const call = useCallback(async (payload) => {
    const res = await base44.functions.invoke('telegram-admin', payload);
    return res.data || res;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, h] = await Promise.all([
        call({ action: 'get_settings' }),
        call({ action: 'get_history' }).catch(() => ({ logs: [] })),
      ]);
      setSettings(s);
      setHistory(h.logs || []);
    } catch (e) {
      toast({ title: 'Yüklenemedi', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [call, toast]);

  useEffect(() => { load(); }, [load]);

  const save = async (partial) => {
    setSaving(true);
    try {
      const merged = { ...settings, ...partial };
      if (tokenInput) { merged.bot_token = tokenInput; }
      await call({ action: 'save_settings', settings: merged });
      setSettings(merged);
      if (tokenInput) { setTokenInput(''); }
      toast({ title: 'Ayarlar kaydedildi' });
    } catch (e) {
      toast({ title: 'Kaydedilemedi', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const res = await call({ action: 'test' });
      if (res.sent) {
        toast({ title: 'Test mesajı başarıyla gönderildi', description: 'Telegram sohbetinizi kontrol edin.' });
      } else {
        const reason = res.reason === 'not_configured' ? 'Telegram yapılandırılmamış. Bot Token ve Chat ID girin.' :
                       res.reason === 'disabled' ? 'Telegram bildirimleri kapalı.' :
                       res.reason === 'event_disabled' ? 'Bu olay türü kapalı.' :
                       res.error || res.reason || 'Bilinmeyen hata';
        toast({ title: 'Test başarısız', description: reason, variant: 'destructive' });
      }
      load();
    } catch (e) {
      toast({ title: 'Test başarısız', description: e.message, variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  const retry = async (logId) => {
    setRetrying(logId);
    try {
      const res = await call({ action: 'retry', log_id: logId });
      if (res.sent) toast({ title: 'Mesaj yeniden gönderildi' });
      else toast({ title: 'Tekrar başarısız', description: res.error, variant: 'destructive' });
      load();
    } catch (e) {
      toast({ title: 'Tekrar başarısız', description: e.message, variant: 'destructive' });
    } finally {
      setRetrying(null);
    }
  };

  const delLog = async () => {
    try { await call({ action: 'delete_log', log_id: deleteLog.id }); toast({ title: 'Silindi' }); setDeleteLog(null); load(); }
    catch (e) { toast({ title: 'Silinemedi', variant: 'destructive' }); }
  };

  if (loading || !settings) return <p className="text-muted-foreground">Yükleniyor...</p>;

  const connected = settings.token_set && !!settings.chat_id;

  const tabs = [
    { key: 'settings', label: 'Ayarlar' },
    { key: 'events', label: 'Olaylar' },
    { key: 'history', label: 'Geçmiş' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4">Telegram Bildirimleri</h1>

      {/* Connection status */}
      <div className={`rounded-xl p-4 mb-4 border ${connected ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
        <p className={`font-semibold text-sm ${connected ? 'text-green-500' : 'text-amber-500'}`}>
          {connected ? 'Telegram bağlantısı aktif' : 'Telegram bağlantısı yapılmadı'}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {connected ? `Chat ID: ${settings.chat_id}` : 'Bot Token ve Chat ID girerek bağlantıyı yapılandırın.'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{t.label}</button>
        ))}
      </div>

      {/* Settings tab */}
      {tab === 'settings' && (
        <div className="space-y-4 max-w-lg">
          <label className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
            <div>
              <p className="font-semibold text-sm">Telegram Bildirimleri</p>
              <p className="text-xs text-muted-foreground">Açık olduğunda olaylar Telegram'a gönderilir</p>
            </div>
            <button onClick={() => save({ enabled: !settings.enabled })} className={`w-12 h-7 rounded-full transition-colors relative ${settings.enabled ? 'bg-primary' : 'bg-secondary'}`}>
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${settings.enabled ? 'left-6' : 'left-1'}`} />
            </button>
          </label>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div>
              <label className="text-sm font-semibold">Telegram Bot Token</label>
              <p className="text-xs text-muted-foreground mb-1.5">BotFather'dan alınan bot erişim anahtarı</p>
              <input type="password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder={settings.token_set ? '•••••••••••••••• (değiştirmek için yeni token girin)' : 'Bot token girin'} className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border" />
            </div>
            <div>
              <label className="text-sm font-semibold">Telegram Chat ID</label>
              <p className="text-xs text-muted-foreground mb-1.5">Bildirimlerin gönderileceği sohbet ID'si (kişi, grup veya kanal)</p>
              <input value={settings.chat_id} onChange={(e) => setSettings({ ...settings, chat_id: e.target.value })} className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border" placeholder="-1001234567890" />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => save({})} disabled={saving} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">{saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}</button>
            <button onClick={test} disabled={testing || !connected} className="bg-secondary hover:bg-secondary/70 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">{testing ? 'Gönderiliyor...' : 'Test Bildirimi Gönder'}</button>
          </div>

          <div className="bg-secondary/40 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Telegram Bot Kurulumu:</p>
            <p>1. Telegram'da @BotFather ile konuşun ve /newbot komutunu gönderin</p>
            <p>2. Bot için isim verin ve Bot Token'ı kopyalayın</p>
            <p>3. Botunuzu ekleyin ve sohbete bir mesaj gönderin</p>
            <p>4. Chat ID'yi öğrenin (örn: @userinfobot ile)</p>
            <p>5. Yukarıdaki alanları doldurun ve kaydedin</p>
            <p>6. "Test Bildirimi Gönder" butonu ile test edin</p>
          </div>
        </div>
      )}

      {/* Events tab */}
      {tab === 'events' && (
        <div className="space-y-2 max-w-lg">
          <p className="text-sm text-muted-foreground mb-2">Hangi olaylarda Telegram bildirimi gönderileceğini seçin.</p>
          {Object.entries(EVENT_LABELS).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between bg-card border border-border rounded-xl p-3">
              <span className="text-sm font-medium">{label}</span>
              <button onClick={() => save({ events: { ...settings.events, [key]: !settings.events[key] } })} className={`w-12 h-7 rounded-full transition-colors relative ${settings.events[key] ? 'bg-primary' : 'bg-secondary'}`}>
                <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${settings.events[key] ? 'left-6' : 'left-1'}`} />
              </button>
            </label>
          ))}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="space-y-2">
          {history.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Henüz Telegram bildirim geçmişi yok.</p> :
            history.map((log) => (
              <div key={log.id} className="bg-card border border-border rounded-xl p-3 flex items-start gap-3">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${log.status === 'sent' ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{EVENT_LABELS[log.event_type] || log.event_type}</span>
                    <span className="text-xs text-muted-foreground">{log.user_name || '-'}</span>
                    <span className="text-xs text-muted-foreground">{timeAgo(log.created_date)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${log.status === 'sent' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>{log.status === 'sent' ? 'Gönderildi' : 'Başarısız'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{log.message}</p>
                  {log.error && <p className="text-xs text-red-400 mt-1 font-mono">{log.error}</p>}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {log.status === 'failed' && <button onClick={() => retry(log.id)} disabled={retrying === log.id} className="text-xs bg-secondary hover:bg-secondary/70 px-2.5 py-1 rounded-lg font-semibold disabled:opacity-50">{retrying === log.id ? '...' : 'Tekrar Dene'}</button>}
                  <button onClick={() => setDeleteLog(log)} className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2.5 py-1 rounded-lg font-semibold">Sil</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      <ConfirmDialog open={!!deleteLog} onOpenChange={(o) => !o && setDeleteLog(null)} title="Kayıt silinsin mi?" onConfirm={delLog} />
    </div>
  );
}