export const DEFAULT_XP_PER_MESSAGE = 10;

export async function getXpSettings(base44) {
  const rows = await base44.asServiceRole.entities.XpSettings.list('-created_date', 1);
  if (rows[0]) return rows[0];
  return await base44.asServiceRole.entities.XpSettings.create({ xp_per_message: DEFAULT_XP_PER_MESSAGE, enabled: true });
}

export async function getUserXp(base44, userId) {
  const rows = await base44.asServiceRole.entities.UserXp.filter({ user_id: userId }, '-created_date', 1);
  return rows[0] || null;
}

export async function ensureUserXp(base44, userId, userName) {
  const existing = await getUserXp(base44, userId);
  if (existing) return existing;
  return await base44.asServiceRole.entities.UserXp.create({
    user_id: userId, user_name: userName || 'Kullanıcı', xp: 0, message_count: 0, manual_frame_id: '', last_message_id: '',
  });
}

// Mesaj başına XP verir. Aynı mesaj kimliği ikinci kez XP üretmez.
export async function awardMessageXp(base44, userId, userName, messageId) {
  const settings = await getXpSettings(base44);
  if (settings.enabled === false) return null;
  const amount = Math.max(0, Math.floor(Number(settings.xp_per_message) || 0));
  if (!amount) return null;
  const row = await ensureUserXp(base44, userId, userName);
  if (row.last_message_id && row.last_message_id === messageId) return row;
  await base44.asServiceRole.entities.UserXp.updateMany(
    { id: row.id },
    { $inc: { xp: amount, message_count: 1 }, $set: { last_message_id: messageId } },
  );
  // Tek kayıt güncellemesi gerçek zamanlı olayı da tetikler; tüm ekranlar anında yenilenir.
  return await base44.asServiceRole.entities.UserXp.update(row.id, { user_name: userName || row.user_name });
}