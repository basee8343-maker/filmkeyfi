import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const me = await base44.asServiceRole.entities.User.get(user.id);

    // Admin/moderator her zaman erişebilir
    if (me.role === 'admin' || me.role === 'moderator') {
      return Response.json({
        hasAccess: true,
        role: me.role,
        subscription_status: 'ACTIVE',
        membership_status: 'active',
      });
    }

    const now = new Date();
    let membershipStatus = me.membership_status;
    let subscriptionStatus = me.subscription_status;

    // Otomatik süre dolması kontrolü
    if (me.membership_end && new Date(me.membership_end) < now && membershipStatus === 'active') {
      membershipStatus = 'expired';
      subscriptionStatus = 'EXPIRED';
      await base44.asServiceRole.entities.User.update(user.id, {
        membership_status: 'expired',
        subscription_status: 'EXPIRED',
      }).catch(() => {});
    }

    const hasAccess = membershipStatus === 'active' && (!me.membership_end || new Date(me.membership_end) > now);

    return Response.json({
      hasAccess,
      membership_status: membershipStatus,
      subscription_status: subscriptionStatus,
      membership_start: me.membership_start,
      membership_end: me.membership_end,
      subscription_plan: me.subscription_plan,
      subscription_price: me.subscription_price,
      days_left: me.membership_end ? Math.max(0, Math.ceil((new Date(me.membership_end).getTime() - now.getTime()) / 86400000)) : 0,
    });
  } catch (e) {
    return Response.json({ error: e?.message || 'error' }, { status: 500 });
  }
}