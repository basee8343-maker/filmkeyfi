import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const me = await base44.asServiceRole.entities.User.get(user.id);
    if (me?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const userIds = Array.isArray(body?.user_ids) ? [...new Set(body.user_ids)].slice(0, 500) : [];
    const days = Number.parseInt(body?.days, 10);
    if (!userIds.length || !Number.isInteger(days) || days < 1 || days > 3650) {
      return Response.json({ error: 'Kullanıcılar ve 1-3650 arasında gün sayısı gerekli' }, { status: 400 });
    }

    const now = new Date();
    const updates = [];
    const subscriptionUpdates = [];
    for (const userId of userIds) {
      const target = await base44.asServiceRole.entities.User.get(userId).catch(() => null);
      const currentEnd = target?.membership_end ? new Date(target.membership_end) : null;
      if (!target || target.membership_status !== 'active' || (currentEnd && currentEnd <= now)) continue;
      const baseDate = currentEnd && currentEnd > now ? currentEnd : now;
      const newEnd = new Date(baseDate.getTime() + days * 86400000).toISOString();
      updates.push({ id: userId, membership_end: newEnd, subscription_end_date: newEnd });
      const subscriptions = await base44.asServiceRole.entities.Subscription.filter({ user_id: userId, status: 'active' }, '-end_date', 1).catch(() => []);
      if (subscriptions[0]) subscriptionUpdates.push({ id: subscriptions[0].id, end_date: newEnd });
    }
    if (updates.length) await base44.asServiceRole.entities.User.bulkUpdate(updates);
    if (subscriptionUpdates.length) await base44.asServiceRole.entities.Subscription.bulkUpdate(subscriptionUpdates);
    return Response.json({ updated: updates.length });
  } catch (error) {
    return Response.json({ error: error?.message || 'İşlem başarısız' }, { status: 500 });
  }
}