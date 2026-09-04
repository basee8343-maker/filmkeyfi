import { upsertNotification } from './upsertNotification.ts';
import { sendPushToUser } from './webPush.ts';

// In-app bildirim oluşturur, çevrimdışıysa web push da gönderir.
export async function notifyUser(base44: any, opts: {
  user_id: string;
  title: string;
  body?: string;
  type: string;
  link?: string;
  ref_id?: string;
}) {
  const { user_id, title, body, type, link, ref_id } = opts;
  await upsertNotification(base44, { user_id, title, body, type, link, ref_id });
  const presence = await base44.asServiceRole.entities.UserPresence.filter({ user_id }, '-created_date', 1).catch(() => []);
  const isOnline = presence[0] && presence[0].online && (Date.now() - new Date(presence[0].last_seen).getTime() < 30000);
  if (!isOnline) {
    await sendPushToUser(base44, user_id, title, body || '', link || '/');
  }
}