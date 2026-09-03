import webPush from 'npm:web-push@3.6.1';

export async function getVapidKeys(base44) {
  let existing = await base44.asServiceRole.entities.AppConfig.filter({ key: 'vapid_keys' });
  if (!existing || existing.length === 0) {
    const keys = webPush.generateVAPIDKeys();
    await base44.asServiceRole.entities.AppConfig.create({
      key: 'vapid_keys',
      value: JSON.stringify(keys)
    });
    return keys;
  }
  return JSON.parse(existing[0].value);
}

export async function getVapidPublicKey(base44) {
  const keys = await getVapidKeys(base44);
  return keys.publicKey;
}

export async function sendPushToAdmins(base44, title, body, url) {
  try {
    const keys = await getVapidKeys(base44);
    webPush.setVapidDetails('mailto:admin@filmkeyfi.com', keys.publicKey, keys.privateKey);
    const subs = await base44.asServiceRole.entities.PushSubscription.list(500);
    if (!subs || subs.length === 0) return 0;
    // Sadece admin kullanıcılarının abonelikleri
    const users = await base44.asServiceRole.entities.User.list(500);
    const adminIds = new Set(users.filter(u => u.role === 'admin').map(u => u.id));
    const adminSubs = subs.filter(s => adminIds.has(s.user_id));
    if (adminSubs.length === 0) return 0;
    const payload = JSON.stringify({ title, body, url });
    await Promise.all(adminSubs.map((s) =>
      webPush.sendNotification({
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth }
      }, payload).catch(() => null)
    ));
    return adminSubs.length;
  } catch (e) {
    return 0;
  }
}

export async function sendPushToAll(base44, title, body, url) {
  try {
    const keys = await getVapidKeys(base44);
    webPush.setVapidDetails('mailto:admin@filmkeyfi.com', keys.publicKey, keys.privateKey);
    const subs = await base44.asServiceRole.entities.PushSubscription.list(500);
    if (!subs || subs.length === 0) return 0;
    const payload = JSON.stringify({ title, body, url });
    await Promise.all(subs.map((s) =>
      webPush.sendNotification({
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth }
      }, payload).catch(() => null)
    ));
    return subs.length;
  } catch (e) {
    return 0;
  }
}