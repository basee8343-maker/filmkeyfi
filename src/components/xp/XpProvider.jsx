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
    const applyXpFrame = (event) => queryClient.setQueriesData({ queryKey: xpConfigKey }, (current) => {
      if (!current) return current;
      let frames;
      if (event.type === 'delete') frames = current.frames.filter((f) => f.id !== event.data.id);
      else {
        const exists = current.frames.some((f) => f.id === event.data.id);
        frames = exists ? current.frames.map((f) => (f.id === event.data.id ? { ...f, ...event.data } : f)) : [...current.frames, event.data];
        frames = [...frames].sort((a, b) => (a.min_xp || 0) - (b.min_xp || 0));
      }
      return { ...current, frames };
    });
    const applyXpSettings = (event) => queryClient.setQueriesData({ queryKey: xpConfigKey }, (current) => current ? { ...current, settings: event.type === 'delete' ? current.settings : { ...current.settings, ...event.data } } : current);
    const offFrames = base44.entities.XpFrame.subscribe(applyXpFrame);
    const offSettings = base44.entities.XpSettings.subscribe(applyXpSettings);
    return () => { offXp(); offFrames(); offSettings(); };
  }, [queryClient]);
  return children;
}