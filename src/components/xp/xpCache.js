import { base44 } from '@/api/base44Client';

export const userXpKey = ['user-xp'];
export const xpConfigKey = ['xp-config'];

export async function loadUserXp(ids) {
  const result = Object.fromEntries(ids.map((id) => [id, null]));
  const chunks = [];
  for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
  await Promise.all(chunks.map(async (chunk) => {
    const rows = await base44.entities.UserXp.filter({ $or: chunk.map((id) => ({ user_id: id })) }, '-created_date', 200);
    rows.forEach((row) => { if (result[row.user_id] === null) result[row.user_id] = row; });
  }));
  return result;
}

export async function loadXpConfig() {
  const [frames, settings] = await Promise.all([
    base44.entities.XpFrame.filter({}, 'min_xp', 100),
    base44.entities.XpSettings.list('-created_date', 1),
  ]);
  return { frames, settings: settings[0] || { xp_per_message: 10, enabled: true } };
}

export function applyUserXp(queryClient, row) {
  if (!row?.user_id) return;
  queryClient.setQueriesData({ queryKey: userXpKey }, (current) => {
    if (!current || !Object.hasOwn(current, row.user_id)) return current;
    return { ...current, [row.user_id]: { ...(current[row.user_id] || {}), ...row } };
  });
}