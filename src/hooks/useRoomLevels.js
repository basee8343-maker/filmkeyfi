import { useQuery } from '@tanstack/react-query';
import { loadRoomLevels, roomLevelKey, levelNumber } from '@/components/levels/roomLevelCache';

export default function useRoomLevels(userIds) {
  const ids = [...new Set(userIds.filter(Boolean))].sort();
  const key = ids.join(',');
  const { data = {}, isLoading } = useQuery({
    queryKey: [...roomLevelKey, key],
    queryFn: () => loadRoomLevels(ids),
    enabled: ids.length > 0,
    staleTime: Infinity,
  });
  return {
    levels: Object.fromEntries(ids.map((id) => [id, levelNumber(data[id])])),
    records: data,
    isLoading,
  };
}