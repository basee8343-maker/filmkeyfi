export const validRoomLevel = (value) => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 1000;
const bounded = (value) => Math.min(1000, Math.max(1, Math.floor(Number(value) || 1)));

// Legacy owner-specific records are not global levels. The newest self-owned record
// is canonical, matching the existing message service without deleting history.
export async function getRoomLevel(base44, userId) {
  const rows = await base44.asServiceRole.entities.RoomLevel.filter({ owner_id: userId, user_id: userId }, '-created_date', 1);
  return rows[0] || null;
}

export async function setRoomLevel(base44, target, level) {
  if (!validRoomLevel(level)) throw new Error('LVL 1–1000 arasında tam sayı olmalıdır.');
  const current = await getRoomLevel(base44, target.id);
  const data = { owner_id: target.id, user_id: target.id, user_name: target.username || target.full_name || 'Kullanıcı', level, message_count: 0 };
  return current ? await base44.asServiceRole.entities.RoomLevel.update(current.id, data) : await base44.asServiceRole.entities.RoomLevel.create(data);
}

export async function advanceRoomLevel(base44, userId, userName) {
  let current = await getRoomLevel(base44, userId);
  if (!current) {
    await base44.asServiceRole.entities.RoomLevel.create({ owner_id: userId, user_id: userId, user_name: userName, level: 1, message_count: 0 });
    current = await getRoomLevel(base44, userId);
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const previous = bounded(current.level);
    if (previous >= 1000) return { level: 1000, leveledUp: false };
    const count = Math.max(0, Math.floor(Number(current.message_count) || 0)) % 50 + 1;
    const level = Math.min(1000, previous + (count === 50 ? 1 : 0));
    // Compare-and-set: a simultaneous message or manual change cannot be overwritten.
    const result = await base44.asServiceRole.entities.RoomLevel.updateMany(
      { id: current.id, updated_date: current.updated_date },
      { $set: { level, message_count: count % 50 } }
    );
    if (result.updated === 1) {
      // Single-record update also emits the ordinary realtime event for every surface.
      await base44.asServiceRole.entities.RoomLevel.update(current.id, { user_name: userName });
      return { level, leveledUp: level > previous };
    }
    current = await getRoomLevel(base44, userId);
  }
  throw new Error('Seviye güncellemesi eşzamanlı işlemler nedeniyle tamamlanamadı.');
}