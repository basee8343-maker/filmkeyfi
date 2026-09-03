// Role and frame definitions + permission helpers
// Shared between backend functions (TypeScript import)

export const ROLE_DEFINITIONS: Record<string, any> = {
  '': { label: '', icon: '', color: '', neon: false, priority: 0 },
  'prince': { label: 'Prens', icon: '🤴', color: '#f59e0b', neon: false, priority: 1 },
  'princess': { label: 'Prenses', icon: '👸', color: '#ec4899', neon: false, priority: 1 },
  'vip1': { label: 'VIP 1', icon: '⭐', color: '#3b82f6', neon: true, priority: 2 },
  'vip2': { label: 'VIP 2', icon: '⭐', color: '#8b5cf6', neon: true, priority: 3 },
  'vip3': { label: 'VIP 3', icon: '🌟', color: '#f59e0b', neon: true, priority: 4 },
  'admin_helper': { label: 'Admin Yardımcısı', icon: '🛡️', color: '#06b6d4', neon: true, priority: 5 },
  'queen_admin': { label: 'Kraliçe Admin', icon: '👑', color: '#ec4899', neon: true, priority: 6 },
};

export const FRAME_DEFINITIONS: Record<string, any> = {
  '': { label: 'Yok', color: '', gradient: '' },
  'lion': { label: 'Aslan 🦁', color: '#d97706', gradient: 'linear-gradient(135deg, #d97706, #fbbf24)' },
  'galatasaray': { label: 'Galatasaray ⚽', color: '#fbbf24', gradient: 'linear-gradient(135deg, #a8180f, #fbbf24)' },
  'fenerbahce': { label: 'Fenerbahçe ⚽', color: '#3b82f6', gradient: 'linear-gradient(135deg, #1e3a8a, #facc15)' },
  'besiktas': { label: 'Beşiktaş ⚽', color: '#e5e7eb', gradient: 'linear-gradient(135deg, #1a1a1a, #e5e7eb)' },
  'trabzonspor': { label: 'Trabzonspor ⚽', color: '#7c3aed', gradient: 'linear-gradient(135deg, #5b21b6, #a855f7)' },
  'queen_admin': { label: 'Kraliçe Çerçevesi 👑', color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #f472b6, #fbcfe8)' },
  'admin_helper': { label: 'Yardımcı Çerçevesi 🛡️', color: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4, #67e8f9, #a5f3fc)' },
  'owner': { label: 'Sahip Çerçevesi 💎', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24, #fde68a, #f59e0b)' },
};

export function isSiteOwner(user: any): boolean {
  return user?.role === 'admin';
}

export function isModerator(user: any): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'moderator') return true;
  return ['queen_admin', 'admin_helper'].includes(user.display_role);
}

export function canAccessHidden(user: any): boolean {
  return isModerator(user);
}

export function canAccessPasswordRooms(user: any): boolean {
  return isModerator(user);
}

export function immuneToModeration(user: any): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return ['queen_admin', 'admin_helper'].includes(user.display_role);
}

export function getRoleInfo(user: any): any {
  if (user?.custom_role?.name) {
    return {
      label: user.custom_role.name,
      icon: user.custom_role.icon || '✨',
      color: user.custom_role.color || '#8b5cf6',
      neon: user.custom_role.neon || false,
      priority: 0,
      custom: true,
    };
  }
  return ROLE_DEFINITIONS[user?.display_role || ''] || ROLE_DEFINITIONS[''];
}