import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyUserXp, userXpKey, xpConfigKey } from '@/components/xp/xpCache';

// XP, çerçeve ve ayar değişikliklerini tüm uygulamaya gerçek zamanlı yayar.
export default function XpProvider({ children }) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const offXp = base44.entities.UserXp.subscribe((event) => {
      if (event.type === 'delete') queryClient.invalidateQueries({ queryKey: userXpKey });
      else applyUserXp(queryClient, event.data);
    });
    const invalidateConfig = () => queryClient.invalidateQueries({ queryKey: xpConfigKey });
    const offFrames = base44.entities.XpFrame.subscribe(invalidateConfig);
    const offSettings = base44.entities.XpSettings.subscribe(invalidateConfig);
    return () => { offXp(); offFrames(); offSettings(); };
  }, [queryClient]);
  return children;
}