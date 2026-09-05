export const validRoomLevel = (value) => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 1000;
const bounded = (value) => Math.min(1000, Math.max(1, Math.floor(Number(value) || 1)));
const LEVEL_FRAMES = [[1000, 'lvl_max'], [750, 'lvl_750'], [500, 'lvl_500'], [250, 'lvl_250'], [150, 'lvl_150'], [75, 'lvl_75']];
export const isFixedMaxLevel = (user) => user?.role === 'admin' || ['founder', 'queen_admin', 'admin_helper'].includes(user?.display_role || '');
export const levelFrameFor = (level) => LEVEL_FRAMES.find(([minimum]) => bounded(level) >= minimum)?.[1] || '';

async function applyAutomaticLevelFrame(base44, user, level) {
  const frame = levelFrameFor(level);
  if (!frame) return;
  const unlocked = [...new Set([...(user.unlocked_profile_frames || []), frame])];
  await base44.asServiceRole.entities.User.update(user.id, { profile_frame: frame, unlocked_profile_frames: unlocked });
}

// Legacy owner-specific records are not global levels. The newest self-owned record
// is canonical, matching the existing message service without deleting history.
export async function getRoomLevel(base44, userId) {
  const rows = await base44.asServiceRole.entities.RoomLevel.filter({ owner_id: userId, user_id: userId }, '-created_date', 1);
  return rows[0] || null;
}

export async function setRoomLevel(base44, target, level) {
  const nextLevel = isFixedMaxLevel(target) ? 1000 : Number(level);
  if (!validRoomLevel(nextLevel)) throw new Error('LVL 1–1000 arasında tam sayı olmalıdır.');
  const current = await getRoomLevel(base44, target.id);
  const data = { owner_id: target.id, user_id: target.id, user_name: target.username || target.full_name || 'Kullanıcı', level: nextLevel, message_count: 0 };
  const saved = current ? await base44.asServiceRole.entities.RoomLevel.update(current.id, data) : await base44.asServiceRole.entities.RoomLevel.create(data);
  await applyAutomaticLevelFrame(base44, target, nextLevel);
  return saved;
}

export async function advanceRoomLevel(base44, userId, userName) {
  const target = await base44.asServiceRole.entities.User.get(userId);
  let current = await getRoomLevel(base44, userId);
  if (isFixedMaxLevel(target)) {
    if (!current) current = await base44.asServiceRole.entities.RoomLevel.create({ owner_id: userId, user_id: userId, user_name: userName, level: 1000, message_count: 0 });
    else if (current.level !== 1000) current = await base44.asServiceRole.entities.RoomLevel.update(current.id, { level: 1000, message_count: 0, user_name: userName });
    await applyAutomaticLevelFrame(base44, target, 1000);
    return { level: 1000, leveledUp: false };
  }
  if (!current) {
    await base44.asServiceRole.entities.RoomLevel.create({ owner_id: userId, user_id: userId, user_name: userName, level: 1, message_count: 0 });
    current = await getRoomLevel(base44, userId);
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const previous = bounded(current.level);
    if (previous >= 1000) return { level: 1000, leveledUp: false };
    const count = Math.max(0, Math.floor(Number(current.message_count) || 0)) % 50 + 1;
    const level = Math.min(1000, previous + (count === 50 ? 1 : 0));
    const result = await base44.asServiceRole.entities.RoomLevel.updateMany(
      { id: current.id, level: current.level, message_count: current.message_count },
      { $set: { level, message_count: count % 50 } }
    );
    if (result.updated === 1) {
      await base44.asServiceRole.entities.RoomLevel.update(current.id, { user_name: userName });
      if (levelFrameFor(level) !== levelFrameFor(previous)) await applyAutomaticLevelFrame(base44, target, level);
      return { level, leveledUp: level > previous };
    }
    current = await getRoomLevel(base44, userId);
  }
  throw new Error('Seviye güncellemesi eşzamanlı işlemler nedeniyle tamamlanamadı.');
}