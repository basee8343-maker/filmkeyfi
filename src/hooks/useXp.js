import { useQuery } from '@tanstack/react-query';
import { loadUserXp, loadXpConfig, userXpKey, xpConfigKey } from '@/components/xp/xpCache';
import { resolveFrame, xpProgress, xpValue } from '@/lib/xp';

export function useXpConfig() {
  const { data } = useQuery({ queryKey: xpConfigKey, queryFn: loadXpConfig, staleTime: Infinity });
  return { frames: data?.frames || [], settings: data?.settings || { xp_per_message: 10, enabled: true } };
}

// Bir veya birden çok kullanıcının XP'si + çözümlenmiş çerçevesi (gerçek zamanlı güncellenir).
export default function useXp(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))].sort();
  const { frames } = useXpConfig();
  const { data = {} } = useQuery({
    queryKey: [...userXpKey, ids.join(',')],
    queryFn: () => loadUserXp(ids),
    enabled: ids.length > 0,
    staleTime: Infinity,
  });
  const entries = ids.map((id) => {
    const row = data[id];
    const xp = xpValue(row);
    const { current, next, manual } = resolveFrame(frames, xp, row?.manual_frame_id);
    return [id, { xp, row: row || null, frame: current, nextFrame: next, manual, ...xpProgress(xp, current, next) }];
  });
  return Object.fromEntries(entries);
}