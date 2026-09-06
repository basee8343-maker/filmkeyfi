export function hasActiveMembership(user) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'moderator') return true;
  if (user.membership_status !== 'active') return false;
  if (user.membership_end && new Date(user.membership_end).getTime() <= Date.now()) return false;
  return true;
}