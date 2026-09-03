// WhatsApp Business Cloud API (Meta) — shared module
// Settings stored in AppConfig (admin-only RLS). Token never returned to frontend.

const DEFAULT_TEMPLATES: Record<string, string> = {
  new_user: `🔔 Yeni kullanıcı kayıt oldu.\n\nKullanıcı: {{username}}\nE-posta: {{email}}\nTarih: {{date}}\n\nAdmin panelinden kullanıcıyı görüntüle.`,
  support: `🆘 Yeni destek talebi geldi.\n\nKullanıcı: {{username}}\nKonu: {{subject}}\nMesaj: {{message}}\nTarih: {{date}}`,
  support_message: `💬 Yeni destek mesajı geldi.\n\nKullanıcı: {{username}}\nKonu: {{subject}}\nMesaj: {{message}}\nTarih: {{date}}`,
  report: `⚠️ Yeni şikayet geldi.\n\nKullanıcı: {{username}}\nKonu: {{subject}}\nMesaj: {{message}}\nTarih: {{date}}`,
  payment: `💳 Yeni ödeme gerçekleşti.\n\nKullanıcı: {{username}}\nPaket: {{package}}\nTutar: {{amount}}\nDurum: {{status}}\nTarih: {{date}}`,
  subscription_active: `✅ Abonelik aktif edildi.\n\nKullanıcı: {{username}}\nPaket: {{package}}\nTarih: {{date}}`,
  subscription_cancelled: `❌ Abonelik iptal edildi.\n\nKullanıcı: {{username}}\nTarih: {{date}}`,
  test: `✅ Filmkeyfi WhatsApp bildirim sistemi başarıyla çalışuyor.\n\nTest tarihi: {{date}}`,
};

const DEFAULT_EVENTS: Record<string, boolean> = {
  new_user: true,
  support: true,
  support_message: true,
  report: true,
  payment: true,
  subscription_active: true,
  subscription_cancelled: true,
};

export interface WhatsAppSettings {
  enabled: boolean;
  admin_phone: string;
  api_token: string;
  phone_number_id: string;
  events: Record<string, boolean>;
  templates: Record<string, string>;
}

export async function getWhatsAppSettings(base44: any): Promise<WhatsAppSettings> {
  const configs = await base44.asServiceRole.entities.AppConfig.list(100).catch(() => []);
  const raw = configs.find((c: any) => c.key === 'whatsapp_settings')?.value;
  const settings: WhatsAppSettings = {
    enabled: false,
    admin_phone: '905518270548',
    api_token: '',
    phone_number_id: '',
    events: { ...DEFAULT_EVENTS },
    templates: { ...DEFAULT_TEMPLATES },
  };
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      settings.enabled = parsed.enabled ?? false;
      settings.admin_phone = parsed.admin_phone || settings.admin_phone;
      settings.api_token = parsed.api_token || '';
      settings.phone_number_id = parsed.phone_number_id || '';
      settings.events = { ...DEFAULT_EVENTS, ...(parsed.events || {}) };
      settings.templates = { ...DEFAULT_TEMPLATES, ...(parsed.templates || {}) };
    } catch {}
  }
  return settings;
}

export async function saveWhatsAppSettings(base44: any, settings: WhatsAppSettings) {
  const configs = await base44.asServiceRole.entities.AppConfig.list(100).catch(() => []);
  const existing = configs.find((c: any) => c.key === 'whatsapp_settings');
  const value = JSON.stringify(settings);
  if (existing) {
    await base44.asServiceRole.entities.AppConfig.update(existing.id, { value });
  } else {
    await base44.asServiceRole.entities.AppConfig.create({ key: 'whatsapp_settings', value });
  }
}

function renderTemplate(template: string, data: Record<string, any>): string {
  let msg = template;
  for (const [key, value] of Object.entries(data || {})) {
    msg = msg.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value ?? ''));
  }
  return msg;
}

async function logWhatsApp(base44: any, log: any) {
  await base44.asServiceRole.entities.WhatsAppLog.create({
    event_type: log.event_type,
    recipient: log.recipient,
    message: (log.message || '').slice(0, 2000),
    status: log.status,
    error: (log.error || '').slice(0, 500),
    ref_id: log.ref_id || '',
    user_name: log.user_name || '',
  }).catch(() => {});
}

// Send a WhatsApp message for a specific event. Bypasses event toggle for 'test' events.
export async function sendWhatsApp(base44: any, event: string, data: Record<string, any>, refId?: string) {
  const settings = await getWhatsAppSettings(base44);

  if (!settings.enabled && event !== 'test') return { sent: false, reason: 'disabled' };
  if (event !== 'test' && !settings.events[event]) return { sent: false, reason: 'event_disabled' };
  if (!settings.api_token || !settings.phone_number_id || !settings.admin_phone) {
    return { sent: false, reason: 'not_configured' };
  }

  const template = settings.templates[event] || DEFAULT_TEMPLATES[event] || '';
  if (!template) return { sent: false, reason: 'no_template' };
  const message = renderTemplate(template, data);
  const phone = settings.admin_phone.replace(/[^0-9]/g, '');
  const url = `https://graph.facebook.com/v18.0/${settings.phone_number_id}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.api_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message },
      }),
    });

    const result: any = await res.json().catch(() => ({}));

    if (res.ok) {
      await logWhatsApp(base44, { event_type: event, recipient: phone, message, status: 'sent', ref_id: refId, user_name: data?.username || '' });
      return { sent: true };
    } else {
      const error = JSON.stringify(result?.error || result).slice(0, 500);
      await logWhatsApp(base44, { event_type: event, recipient: phone, message, status: 'failed', error, ref_id: refId, user_name: data?.username || '' });
      return { sent: false, reason: 'api_error', error };
    }
  } catch (e: any) {
    const error = (e?.message || 'network_error').slice(0, 500);
    await logWhatsApp(base44, { event_type: event, recipient: phone, message, status: 'failed', error, ref_id: refId, user_name: data?.username || '' });
    return { sent: false, reason: 'network_error', error };
  }
}

// Retry a failed WhatsApp log entry by its ID
export async function retryWhatsAppLog(base44: any, logId: string) {
  const log = await base44.asServiceRole.entities.WhatsAppLog.get(logId).catch(() => null);
  if (!log) return { sent: false, error: 'Log bulunamadı' };

  const settings = await getWhatsAppSettings(base44);
  if (!settings.api_token || !settings.phone_number_id || !settings.admin_phone) {
    return { sent: false, error: 'WhatsApp yapılandırılmamış' };
  }

  const phone = (log.recipient || settings.admin_phone).replace(/[^0-9]/g, '');
  const url = `https://graph.facebook.com/v18.0/${settings.phone_number_id}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${settings.api_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: log.message } }),
    });
    const result: any = await res.json().catch(() => ({}));
    if (res.ok) {
      await base44.asServiceRole.entities.WhatsAppLog.update(log.id, { status: 'sent', error: '' }).catch(() => {});
      return { sent: true };
    } else {
      const error = JSON.stringify(result?.error || result).slice(0, 500);
      await base44.asServiceRole.entities.WhatsAppLog.update(log.id, { status: 'failed', error }).catch(() => {});
      return { sent: false, error };
    }
  } catch (e: any) {
    return { sent: false, error: e?.message || 'network_error' };
  }
}