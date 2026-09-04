// Aynı türdeki bildirimi günceller, yoksa oluşturur — her tür için tek bildirim (backend/service-role)
export async function upsertNotification(base44: any, opts: {
  user_id: string;
  title: string;
  body?: string;
  type: string;
  link?: string;
  ref_id?: string;
}) {
  const { user_id, title, body, type, link, ref_id } = opts;
  try {
    const existing = await base44.asServiceRole.entities.Notification.filter({ user_id, type }, '-created_date', 1);
    if (existing && existing.length > 0) {
      return base44.asServiceRole.entities.Notification.update(existing[0].id, { title, body, link, ref_id, read: false });
    }
    return base44.asServiceRole.entities.Notification.create({ user_id, title, body, type, link, ref_id });
  } catch {}
}