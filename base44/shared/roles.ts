// Role and frame definitions + permission helpers
// Shared between backend functions (TypeScript import)

export const ROLE_DEFINITIONS: Record<string, any> = {
  '': { label: '', icon: '', color: '', neon: false, priority: 0 },
};

export const FRAME_DEFINITIONS: Record<string, any> = {
  '': { label: 'Yok', color: '', gradient: '' },
  'lion': { label: 'Aslan 🦁', color: '#d97706', gradient: 'linear-gradient(135deg, #d97706, #fbbf24)' },
  'galatasaray': { label: 'Galatasaray ⚽', color: '#ED1C24', gradient: 'linear-gradient(135deg, #a8180f, #fbbf24)', image: 'https://media.base44.com/images/public/6a77d66e4da6de214628ee62/edb146528_IMG_0545.jpeg' },
  'fenerbahce': { label: 'Fenerbahçe ⚽', color: '#002244', gradient: 'linear-gradient(135deg, #1e3a8a, #facc15)', image: 'https://media.base44.com/images/public/6a77d66e4da6de214628ee62/ac6a6ab2e_IMG_0547.jpeg' },
  'besiktas': { label: 'Beşiktaş ⚽', color: '#000000', gradient: 'linear-gradient(135deg, #1a1a1a, #e5e7eb)', image: 'https://media.base44.com/images/public/6a77d66e4da6de214628ee62/e106215f9_IMG_0546.jpeg' },
  'trabzonspor': { label: 'Trabzonspor ⚽', color: '#7c3aed', gradient: 'linear-gradient(135deg, #5b21b6, #a855f7)' },
  'owner': { label: 'Sahip Çerçevesi 💎', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24, #fde68a, #f59e0b)' },
};

export const ANIMATION_DEFINITIONS: { key: string; label: string }[] = [
  { key: 'pulse', label: 'Nabız' },
  { key: 'slideLeft', label: 'Sol Kayma' },
  { key: 'slideRight', label: 'Sağ Kayma' },
  { key: 'slideUp', label: 'Yukarı Kayma' },
  { key: 'slideDown', label: 'Aşağı Kayma' },
  { key: 'zoomIn', label: 'Yakınlaştır' },
  { key: 'rotate', label: 'Döndür' },
  { key: 'bounce', label: 'Zıpla' },
  { key: 'elastic', label: 'Esnek' },
  { key: 'shake', label: 'Salla' },
  { key: 'swing', label: 'Salıncak' },
  { key: 'flash', label: 'Parla' },
  { key: 'rubber', label: 'Lastik' },
  { key: 'jello', label: 'Jelatin' },
  { key: 'heartbeat', label: 'Kalp Atışı' },
  { key: 'fade', label: 'Soluklaş' },
  { key: 'blur', label: 'Bulanık' },
  { key: 'glitch', label: 'Arıza' },
  { key: 'neonPulse', label: 'Neon Nabız' },
  { key: 'slideFade', label: 'Kaydır + Soluk' },
  { key: 'zoomFade', label: 'Yakınlaştır + Soluk' },
  { key: 'flipFade', label: 'Çevir + Soluk' },
  { key: 'rotateFade', label: 'Döndür + Soluk' },
  { key: 'bounceFade', label: 'Zıpla + Soluk' },
  { key: 'expand', label: 'Genişlet' },
  { key: 'spiral', label: 'Spiral' },
  { key: 'jump', label: 'Atlama' },
  { key: 'wave', label: 'Dalga' },
  { key: 'burst', label: 'Patlama' },
  { key: 'vibrate', label: 'Titreşim' },
];

export function parseRoleMetadata(text: string): { text: string; color: string | null; animation: string | null; hasRole: boolean } {
  if (!text) return { text: '', color: null, animation: null, hasRole: false };
  const match = text.match(/^\{\{ROLE\|([^|]*)\|([^|]*)\}\}/);
  if (!match) return { text, color: null, animation: null, hasRole: false };
  return {
    text: text.slice(match[0].length),
    color: match[1] || null,
    animation: match[2] || null,
    hasRole: true,
  };
}

export function isSiteOwner(user: any): boolean {
  return user?.role === 'admin';
}

export function isModerator(user: any): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'moderator') return true;
  if (user?.custom_role?.moderator) return true;
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
  if (user?.custom_role?.moderator) return true;
  return ['queen_admin', 'admin_helper'].includes(user.display_role);
}

export function getRoleInfo(user: any): any {
  if (user?.custom_role?.name) {
    return {
      label: user.custom_role.name,
      icon: user.custom_role.icon || '✨',
      color: user.custom_role.color || '#8b5cf6',
      neon: user.custom_role.neon || false,
      animation: user.custom_role.animation || 'pulse',
      show_in_room: user.custom_role.show_in_room || false,
      moderator: user.custom_role.moderator || false,
      priority: 0,
      custom: true,
    };
  }
  return ROLE_DEFINITIONS[user?.display_role || ''] || ROLE_DEFINITIONS[''];
}