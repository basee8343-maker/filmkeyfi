import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getTelegramSettings, saveTelegramSettings, sendTelegram, retryTelegramLog } from '../../shared/telegram.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // Get settings — bot_token is never returned, only token_set boolean
    if (action === 'get_settings') {
      const s = await getTelegramSettings(base44);
      return Response.json({
        enabled: s.enabled,
        chat_id: s.chat_id,
        token_set: !!s.bot_token,
        events: s.events,
        templates: s.templates,
      });
    }

    // Save settings — only update bot_token if a new one is provided
    if (action === 'save_settings') {
      const current = await getTelegramSettings(base44);
      const u = body.settings || {};
      const newSettings = {
        enabled: u.enabled ?? current.enabled,
        chat_id: u.chat_id ?? current.chat_id,
        // Keep existing token unless a new one is explicitly provided
        bot_token: u.bot_token !== undefined ? (u.bot_token || '') : current.bot_token,
        events: { ...current.events, ...(u.events || {}) },
        templates: { ...current.templates, ...(u.templates || {}) },
      };
      await saveTelegramSettings(base44, newSettings);
      return Response.json({ ok: true });
    }

    // Send test message
    if (action === 'test') {
      const result = await sendTelegram(base44, 'test', { date: new Date().toLocaleString('tr-TR') }, `test:${Date.now()}`);
      return Response.json(result);
    }

    // Retry a failed message
    if (action === 'retry') {
      const result = await retryTelegramLog(base44, body.log_id);
      return Response.json(result);
    }

    // Get notification history
    if (action === 'get_history') {
      const logs = await base44.asServiceRole.entities.TelegramLog.list('-created_date', 100);
      return Response.json({ logs });
    }

    // Delete a log entry
    if (action === 'delete_log') {
      await base44.asServiceRole.entities.TelegramLog.delete(body.log_id).catch(() => {});
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Geçersiz işlem' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e?.message || 'error' }, { status: 500 });
  }
}