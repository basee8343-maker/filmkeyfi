import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyRoomLevel, roomLevelKey } from '@/components/levels/roomLevelCache';

export default function RoomLevelProvider({ children }) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const off = base44.entities.RoomLevel.subscribe((event) => {
      if (event.type === 'delete') queryClient.invalidateQueries({ queryKey: roomLevelKey });
      else applyRoomLevel(queryClient, event.data);
    });
    return off;
  }, [queryClient]);
  return children;
}