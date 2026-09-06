import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function useMessageProfiles(userIds) {
  const key = [...new Set(userIds.filter(Boolean))].sort().join(',');
  const [profiles, setProfiles] = useState({});
  useEffect(() => {
    if (!key) { setProfiles({}); return; }
    let active = true;
    const ids = key.split(',');
    const load = () => base44.functions.invoke('user-profile', { user_ids: ids }).then((response) => {
      if (!active) return;
      const found = response.data?.data || response.data || {};
      setProfiles(Object.fromEntries(ids.map((id) => [id, found[id] || { account_status: 'deleted' }])));
    }).catch(() => {});
    load();
    const unsubscribe = base44.entities.User.subscribe((event) => {
      if (ids.includes(event.data?.id || event.id)) load();
    });
    return () => { active = false; unsubscribe(); };
  }, [key]);
  return profiles;
}