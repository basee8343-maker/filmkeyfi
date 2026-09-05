import { base44 } from '@/api/base44Client';

export const roomLevelKey = ['room-levels'];
export const levelNumber = (row) => row === undefined ? undefined : Math.min(1000, Math.max(1, Math.floor(Number(row?.level) || 1)));
export const newerCanonical = (old, row) => !old || old.id === row.id || new Date(row.created_date) > new Date(old.created_date);

export async function loadRoomLevels(ids) {
  const result = Object.fromEntries(ids.map((id) => [id, null]));
  const chunks = [];
  for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));
  await Promise.all(chunks.map(async (chunk) => {
    const query = { $or: chunk.map((id) => ({ owner_id: id, user_id: id })) };
    const rows = await base44.entities.RoomLevel.filter(query, '-created_date', 200);
    rows.forEach((row) => { if (result[row.user_id] === null) result[row.user_id] = row; });
  }));
  return result;
}

export function applyRoomLevel(queryClient, row) {
  if (!row?.user_id || row.owner_id !== row.user_id) return;
  queryClient.setQueriesData({ queryKey: roomLevelKey }, (current) => {
    if (!current || !Object.hasOwn(current, row.user_id)) return current;
    const old = current[row.user_id];
    if (!newerCanonical(old, row)) return current;
    if (old?.id === row.id && new Date(old.updated_date) > new Date(row.updated_date)) return current;
    return { ...current, [row.user_id]: { ...(old?.id === row.id ? old : {}), ...row } };
  });
}