import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { setRoleLabelOverrides } from '@/lib/roles';

let loaded = false;

export default function useRoleLabels() {
  useEffect(() => {
    if (loaded) return;
    loaded = true;
    base44.functions.invoke('role-labels', { action: 'get' })
      .then((res) => {
        if (res.data?.labels) setRoleLabelOverrides(res.data.labels);
      })
      .catch(() => {});
  }, []);
}