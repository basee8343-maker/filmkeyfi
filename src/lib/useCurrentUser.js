import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

let cachedUser = null;
let loadingUser = true;
let loadPromise = null;
let userSubscription = null;
const listeners = new Set();

const publish = () => listeners.forEach((listener) => listener({ user: cachedUser, loading: loadingUser }));

const connectRealtime = () => {
  if (userSubscription || !cachedUser?.id) return;
  userSubscription = base44.entities.User.subscribe((event) => {
    if (event.type === 'update' && event.data?.id === cachedUser?.id) {
      cachedUser = { ...cachedUser, ...event.data };
      publish();
    }
  });
};

const loadUser = (force = false) => {
  if (loadPromise && !force) return loadPromise;
  loadingUser = true;
  publish();
  loadPromise = base44.auth.me()
    .then((user) => { cachedUser = user; connectRealtime(); return user; })
    .catch(() => { cachedUser = null; return null; })
    .finally(() => { loadingUser = false; loadPromise = null; publish(); });
  return loadPromise;
};

export function useCurrentUser() {
  const [state, setState] = useState({ user: cachedUser, loading: loadingUser });

  useEffect(() => {
    listeners.add(setState);
    if (loadingUser && !loadPromise) loadUser();
    else setState({ user: cachedUser, loading: loadingUser });
    return () => listeners.delete(setState);
  }, []);

  const setUser = (next) => {
    cachedUser = typeof next === 'function' ? next(cachedUser) : next;
    publish();
  };

  return { ...state, setUser, reload: () => loadUser(true) };
}

export function membershipActive(user) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'moderator') return true;
  if (user.membership_status !== 'active') return false;
  if (user.membership_end && new Date(user.membership_end) < new Date()) return false;
  return true;
}