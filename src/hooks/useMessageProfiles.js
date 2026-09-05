import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function useMessageProfiles(userIds) {
  const key = [...new Set(userIds.filter(Boolean))].sort().join(',');
  const [profiles, setProfiles] = useState({});
  useEffect(() => {
    if (!key) { setProfiles({}); return; }
    let active = true;
    const ids = key.split(',');
    const load = () => Promise.all(ids.map((id) => base44.functions.invoke('user-profile', { user_id: id }).then((response) => response.data).catch(() => null))).then((items) => {
      if (!active) return;
      setProfiles(Object.fromEntries(ids.map((id, index) => [id, items[index]]).filter(([, profile]) => profile)));
    });
    load();
    const unsubscribe = base44.entities.User.subscribe((event) => {
      if (ids.includes(event.data?.id || event.id)) load();
    });
    return () => { active = false; unsubscribe(); };
  }, [key]);
  return profiles;
}