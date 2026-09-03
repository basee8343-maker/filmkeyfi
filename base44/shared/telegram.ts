// Telegram Bot API — shared module
// Settings stored in AppConfig (admin-only RLS). Bot Token never returned to frontend.

const DEFAULT_TEMPLATES: Record<string, string> = {
  new_user: `🔔 Yeni kullanıcı kayıt oldu.\n\nKullanıcı: {{username}}\nE-posta: {{email}}\nTarih: {{date}}\n\nAdmin panelinden kullanıcıyı görüntüle.`,
  support: `🆘 Yeni destek talebi geldi.\n\nKullanıcı: {{username}}\nKonu: {{subject}}\nMesaj: {{message}}\nTarih: {{date}}`,
  support_message: `💬 Yeni destek mesajı geldi.\n\nKullanıcı: {{username}}\nKonu: {{subject}}\nMesaj: {{message}}\nTarih: {{date}}`,
  report: `⚠️ Yeni şikayet geldi.\n\nKullanıcı: {{username}}\nKonu: {{subject}}\nMesaj: {{message}}\nTarih: {{date}}`,
  payment: `💳 Yeni ödeme gerçekleşti.\n\nKullanıcı: {{username}}\nPaket: {{package}}\nTutar: {{amount}}\nDurum: {{status}}\nTarih: {{date}}`,
  subscription_active: `✅ Abonelik aktif edildi.\n\nKullanıcı: {{username}}\nPaket: {{package}}\nTarih: {{date}}`,
  subscription_cancelled: `❌ Abonelik iptal edildi.\n\nKullanıcı: {{username}}\nTarih: {{date}}`,
  test: `✅ Filmkeyfi Telegram bildirim sistemi başarıyla çalışıyor.\n\nTest tarihi: {{date}}`,
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

export interface TelegramSettings {
  enabled: boolean;
  bot_token: string;
  chat_id: string;
  events: Record<string, boolean>;
  templates: Record<string, string>;
}

export async function getTelegramSettings(base44: any): Promise<TelegramSettings> {
  const configs = await base44.asServiceRole.entities.AppConfig.list(100).catch(() => []);
  const raw = configs.find((c: any) => c.key === 'telegram_settings')?.value;
  const settings: TelegramSettings = {
    enabled: false,
    bot_token: '',
    chat_id: '',
    events: { ...DEFAULT_EVENTS },
    templates: { ...DEFAULT_TEMPLATES },
  };
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      settings.enabled = parsed.enabled ?? false;
      settings.bot_token = parsed.bot_token || '';
      settings.chat_id = parsed.chat_id || '';
      settings.events = { ...DEFAULT_EVENTS, ...(parsed.events || {}) };
      settings.templates = { ...DEFAULT_TEMPLATES, ...(parsed.templates || {}) };
    } catch {}
  }
  return settings;
}

export async function saveTelegramSettings(base44: any, settings: TelegramSettings) {
  const configs = await base44.asServiceRole.entities.AppConfig.list(100).catch(() => []);
  const existing = configs.find((c: any) => c.key === 'telegram_settings');
  const value = JSON.stringify(settings);
  if (existing) {
    await base44.asServiceRole.entities.AppConfig.update(existing.id, { value });
  } else {
    await base44.asServiceRole.entities.AppConfig.create({ key: 'telegram_settings', value });
  }
}

function renderTemplate(template: string, data: Record<string, any>): string {
  let msg = template;
  for (const [key, value] of Object.entries(data || {})) {
    msg = msg.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value ?? ''));
  }
  return msg;
}

async function logTelegram(base44: any, log: any) {
  await base44.asServiceRole.entities.TelegramLog.create({
    event_type: log.event_type,
    recipient: log.recipient,
    message: (log.message || '').slice(0, 2000),
    status: log.status,
    error: (log.error || '').slice(0, 500),
    ref_id: log.ref_id || '',
    user_name: log.user_name || '',
  }).catch(() => {});
}

// Send a Telegram message for a specific event. Bypasses event toggle for 'test' events.
async function sendTelegramOnce(base44: any, event: string, data: Record<string, any>, refId?: string) {
  const settings = await getTelegramSettings(base44);

  if (!settings.enabled && event !== 'test') return { sent: false, reason: 'disabled' };
  if (event !== 'test' && !settings.events[event]) return { sent: false, reason: 'event_disabled' };
  if (!settings.bot_token || !settings.chat_id) {
    return { sent: false, reason: 'not_configured' };
  }

  const template = settings.templates[event] || DEFAULT_TEMPLATES[event] || '';
  if (!template) return { sent: false, reason: 'no_template' };
  const message = renderTemplate(template, data);
  const url = `https://api.telegram.org/bot${settings.bot_token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: settings.chat_id,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const result: any = await res.json().catch(() => ({}));

    if (res.ok && result.ok) {
      await logTelegram(base44, { event_type: event, recipient: settings.chat_id, message, status: 'sent', ref_id: refId, user_name: data?.username || '' });
      return { sent: true };
    } else {
      const error = JSON.stringify(result?.description || result).slice(0, 500);
      await logTelegram(base44, { event_type: event, recipient: settings.chat_id, message, status: 'failed', error, ref_id: refId, user_name: data?.username || '' });
      return { sent: false, reason: 'api_error', error };
    }
  } catch (e: any) {
    const error = (e?.message || 'network_error').slice(0, 500);
    await logTelegram(base44, { event_type: event, recipient: settings.chat_id, message, status: 'failed', error, ref_id: refId, user_name: data?.username || '' });
    return { sent: false, reason: 'network_error', error };
  }
}

export async function sendTelegram(base44: any, event: string, data: Record<string, any>, refId?: string) {
  let result = await sendTelegramOnce(base44, event, data, refId);
  // Retry once on send failure (not on config/disabled issues)
  if (!result.sent && !['disabled', 'event_disabled', 'not_configured', 'no_template'].includes(result.reason)) {
    await new Promise(r => setTimeout(r, 1000));
    result = await sendTelegramOnce(base44, event, data, refId);
  }
  return result;
}

// Retry a failed Telegram log entry by its ID
export async function retryTelegramLog(base44: any, logId: string) {
  const log = await base44.asServiceRole.entities.TelegramLog.get(logId).catch(() => null);
  if (!log) return { sent: false, error: 'Log bulunamadı' };

  const settings = await getTelegramSettings(base44);
  if (!settings.bot_token || !settings.chat_id) {
    return { sent: false, error: 'Telegram yapılandırılmamış' };
  }

  const url = `https://api.telegram.org/bot${settings.bot_token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: settings.chat_id, text: log.message, parse_mode: 'HTML' }),
    });
    const result: any = await res.json().catch(() => ({}));
    if (res.ok && result.ok) {
      await base44.asServiceRole.entities.TelegramLog.update(log.id, { status: 'sent', error: '' }).catch(() => {});
      return { sent: true };
    } else {
      const error = JSON.stringify(result?.description || result).slice(0, 500);
      await base44.asServiceRole.entities.TelegramLog.update(log.id, { status: 'failed', error }).catch(() => {});
      return { sent: false, error };
    }
  } catch (e: any) {
    return { sent: false, error: e?.message || 'network_error' };
  }
}