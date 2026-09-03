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

const TEMPLATE_EVENTS = ['new_user', 'support', 'support_message', 'report', 'payment', 'subscription_active', 'subscription_cancelled'];

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'az önce';
  if (min < 60) return `${min} dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} sa önce`;
  return `${Math.floor(hr / 24)} gün önce`;
}

export default function AdminWhatsApp() {
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
    const res = await base44.functions.invoke('whatsapp-admin', payload);
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
      if (tokenInput) { merged.api_token = tokenInput; }
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
        toast({ title: 'Test mesajı başarıyla gönderildi', description: 'WhatsApp numaranızı kontrol edin.' });
      } else {
        const reason = res.reason === 'not_configured' ? 'WhatsApp API yapılandırılmamış. Ayarlar sekmesinden bağlantıyı yapılandırın.' :
                       res.reason === 'disabled' ? 'WhatsApp bildirimleri kapalı.' :
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

  const connected = settings.token_set && !!settings.phone_number_id && !!settings.admin_phone;

  const tabs = [
    { key: 'settings', label: 'Ayarlar' },
    { key: 'events', label: 'Olaylar' },
    { key: 'templates', label: 'Şablonlar' },
    { key: 'history', label: 'Geçmiş' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4">WhatsApp Bildirimleri</h1>

      {/* Connection status */}
      <div className={`rounded-xl p-4 mb-4 border ${connected ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
        <p className={`font-semibold text-sm ${connected ? 'text-green-500' : 'text-amber-500'}`}>
          {connected ? 'WhatsApp bağlantısı aktif' : 'WhatsApp bağlantısı yapılmadı'}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {connected ? `Numara: ${settings.admin_phone} · Telefon Numarası ID: ${settings.phone_number_id}` : 'API yapılandırması tamamlanmadı. Ayarlar sekmesinden bağlantıyı yapılandırın.'}
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
              <p className="font-semibold text-sm">WhatsApp Bildirimleri</p>
              <p className="text-xs text-muted-foreground">Açık olduğunda olaylar WhatsApp'a gönderilir</p>
            </div>
            <button onClick={() => save({ enabled: !settings.enabled })} className={`w-12 h-7 rounded-full transition-colors relative ${settings.enabled ? 'bg-primary' : 'bg-secondary'}`}>
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${settings.enabled ? 'left-6' : 'left-1'}`} />
            </button>
          </label>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div>
              <label className="text-sm font-semibold">Admin WhatsApp Numarası</label>
              <p className="text-xs text-muted-foreground mb-1.5">Bildirimlerin gönderileceği numara (ülke kodu ile, örn: 905518270548)</p>
              <input value={settings.admin_phone} onChange={(e) => setSettings({ ...settings, admin_phone: e.target.value })} className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border" placeholder="905xxxxxxxxx" />
            </div>
            <div>
              <label className="text-sm font-semibold">WhatsApp Access Token</label>
              <p className="text-xs text-muted-foreground mb-1.5">Meta Business Suite → WhatsApp Manager'dan alınan kalıcı erişim anahtarı</p>
              <input type="password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder={settings.token_set ? '•••••••••••••••• (değiştirmek için yeni token girin)' : 'Token girin'} className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border" />
            </div>
            <div>
              <label className="text-sm font-semibold">Telefon Numarası ID</label>
              <p className="text-xs text-muted-foreground mb-1.5">WhatsApp Business telefon numarası ID'si (Meta Business Suite)</p>
              <input value={settings.phone_number_id} onChange={(e) => setSettings({ ...settings, phone_number_id: e.target.value })} className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border" placeholder="123456789012345" />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => save({})} disabled={saving} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">{saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}</button>
            <button onClick={test} disabled={testing || !connected} className="bg-secondary hover:bg-secondary/70 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">{testing ? 'Gönderiliyor...' : 'Test Mesajı Gönder'}</button>
          </div>

          <div className="bg-secondary/40 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">WhatsApp Business API Kurulumu:</p>
            <p>1. Meta Business Suite'de WhatsApp Business hesabı oluşturun</p>
            <p>2. WhatsApp Manager'dan telefon numarası ekleyin ve doğrulayın</p>
            <p>3. Kalıcı erişim anahtarı (Access Token) oluşturun</p>
            <p>4. Telefon Numarası ID'sini kopyalayın</p>
            <p>5. Yukarıdaki alanları doldurun ve kaydedin</p>
            <p>6. "Test Mesajı Gönder" butonu ile test edin</p>
          </div>
        </div>
      )}

      {/* Events tab */}
      {tab === 'events' && (
        <div className="space-y-2 max-w-lg">
          <p className="text-sm text-muted-foreground mb-2">Hangi olaylarda WhatsApp bildirimi gönderileceğini seçin.</p>
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

      {/* Templates tab */}
      {tab === 'templates' && (
        <div className="space-y-4 max-w-2xl">
          <p className="text-sm text-muted-foreground mb-2">Bildirim mesaj şablonlarını düzenleyin. Değişkenler: {'{{username}}, {{email}}, {{subject}}, {{message}}, {{package}}, {{amount}}, {{status}}, {{date}}'}</p>
          {TEMPLATE_EVENTS.map((event) => (
            <div key={event} className="bg-card border border-border rounded-xl p-3">
              <p className="font-semibold text-sm mb-2">{EVENT_LABELS[event]}</p>
              <textarea
                value={settings.templates[event] || ''}
                onChange={(e) => setSettings({ ...settings, templates: { ...settings.templates, [event]: e.target.value } })}
                rows={5}
                className="w-full bg-secondary/60 rounded-lg px-3 py-2 text-sm outline-none border border-border font-mono text-xs"
              />
            </div>
          ))}
          <button onClick={() => save({})} disabled={saving} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">{saving ? 'Kaydediliyor...' : 'Şablonları Kaydet'}</button>
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="space-y-2">
          {history.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Henüz WhatsApp bildirim geçmişi yok.</p> :
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