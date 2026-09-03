import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getWhatsAppSettings, saveWhatsAppSettings, sendWhatsApp, retryWhatsAppLog } from '../../shared/whatsapp.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // Get settings — token is never returned, only token_set boolean
    if (action === 'get_settings') {
      const s = await getWhatsAppSettings(base44);
      return Response.json({
        enabled: s.enabled,
        admin_phone: s.admin_phone,
        phone_number_id: s.phone_number_id,
        token_set: !!s.api_token,
        events: s.events,
        templates: s.templates,
      });
    }

    // Save settings — only update token if a new one is provided
    if (action === 'save_settings') {
      const current = await getWhatsAppSettings(base44);
      const u = body.settings || {};
      const newSettings = {
        enabled: u.enabled ?? current.enabled,
        admin_phone: u.admin_phone ?? current.admin_phone,
        // Keep existing token unless a new one is explicitly provided
        api_token: u.api_token !== undefined ? (u.api_token || '') : current.api_token,
        phone_number_id: u.phone_number_id ?? current.phone_number_id,
        events: { ...current.events, ...(u.events || {}) },
        templates: { ...current.templates, ...(u.templates || {}) },
      };
      await saveWhatsAppSettings(base44, newSettings);
      return Response.json({ ok: true });
    }

    // Send test message
    if (action === 'test') {
      const result = await sendWhatsApp(base44, 'test', { date: new Date().toLocaleString('tr-TR') }, `test:${Date.now()}`);
      return Response.json(result);
    }

    // Retry a failed message
    if (action === 'retry') {
      const result = await retryWhatsAppLog(base44, body.log_id);
      return Response.json(result);
    }

    // Get notification history
    if (action === 'get_history') {
      const logs = await base44.asServiceRole.entities.WhatsAppLog.list('-created_date', 100);
      return Response.json({ logs });
    }

    // Delete a log entry
    if (action === 'delete_log') {
      await base44.asServiceRole.entities.WhatsAppLog.delete(body.log_id).catch(() => {});
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Geçersiz işlem' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e?.message || 'error' }, { status: 500 });
  }
}