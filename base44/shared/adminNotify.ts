// Shared admin notification: creates Notification records for all admins,
// sends Web Push, and sends Telegram message. Used by admin-notify and shopier-webhook.
import { sendPushToAdmins } from './webPush.ts';
import { sendTelegram } from './telegram.ts';

function sanitize(text: string, max: number) {
  return String(text || '').replace(/[<>]/g, '').slice(0, max);
}

export async function notifyAdmins(base44: any, opts: {
  event: string;
  ref_id?: string;
  title: string;
  body?: string;
  link?: string;
  telegram_data?: Record<string, any>;
}) {
  const { event, ref_id, title, body, link, telegram_data } = opts;
  const dedupRefId = ref_id || `${event}:${Date.now()}`;

  // Dedup: skip if same ref_id already processed
  if (ref_id) {
    const existing = await base44.asServiceRole.entities.Notification.filter({ ref_id: dedupRefId }, '-created_date', 1).catch(() => []);
    if (existing && existing.length > 0) return { ok: true, duplicate: true };
  }

  // Find all admin users
  const allUsers = await base44.asServiceRole.entities.User.list(500);
  const adminUsers = allUsers.filter((u: any) => u.role === 'admin');

  const cleanTitle = sanitize(title, 200);
  const cleanBody = sanitize(body || '', 500);
  const cleanLink = sanitize(link || '', 200);

  // Create Notification record for each admin
  for (const admin of adminUsers) {
    await base44.asServiceRole.entities.Notification.create({
      user_id: admin.id,
      title: cleanTitle,
      body: cleanBody,
      type: event,
      link: cleanLink,
      ref_id: dedupRefId,
    }).catch(() => {});
  }

  // Send Web Push and Telegram in background — don't block the response
  sendPushToAdmins(base44, cleanTitle, cleanBody, cleanLink).catch(() => {});
  sendTelegram(base44, event, telegram_data || {}, dedupRefId).catch(() => {});

  return { ok: true, admins: adminUsers.length };
}