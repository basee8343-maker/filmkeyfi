import { base44 } from '@/api/base44Client';

// Aynı türdeki bildirimi günceller, yoksa oluşturur — her tür için tek bildirim
export async function upsertNotification({ user_id, title, body, type, link, ref_id }) {
  try {
    const existing = await base44.entities.Notification.filter({ user_id, type }, '-created_date', 1);
    if (existing && existing.length > 0) {
      return base44.entities.Notification.update(existing[0].id, { title, body, link, ref_id, read: false });
    }
    return base44.entities.Notification.create({ user_id, title, body, type, link, ref_id });
  } catch {}
}