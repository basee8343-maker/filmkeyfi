// Role and frame definitions + permission helpers
// Shared between backend functions (TypeScript import)

export const ROLE_DEFINITIONS: Record<string, any> = {
  '': { label: '', icon: '', color: '', neon: false, priority: 0 },
  'founder': {
    label: 'ADMİN / KURUCU', icon: '🔥', color: '#ff4500', neon: true, priority: 100,
    entry_animation: 'flame-entry', exit_animation: 'flame-exit',
    show_in_room: true, moderator: true, hide_username_entry: true,
    name_effect: 'flame',
  },
  'queen_admin': {
    label: 'ADMİN KRALİÇESİ', icon: '❤️', color: '#ff1744', neon: true, priority: 95,
    entry_animation: 'heart-entry', exit_animation: 'heart-exit',
    show_in_room: false, moderator: true, hide_username_entry: false,
    name_effect: 'heart',
    heart_profile: true,
  },
  'admin_helper': {
    label: 'ADMİN YARDIMCISI', icon: '🔥', color: '#ff4500', neon: true, priority: 90,
    entry_animation: 'flame-entry', exit_animation: 'flame-exit',
    show_in_room: false, moderator: true, hide_username_entry: false,
    name_effect: 'flame',
    flame_profile: true,
  },
  'can_ablam': {
    label: 'CAN ABLAM', icon: '👑', color: '#ff1744', neon: true, priority: 88,
    entry_animation: 'queen-entry', exit_animation: 'queen-exit',
    show_in_room: true, moderator: false, hide_username_entry: true,
    name_effect: 'diamond',
  },
  'can_abim': {
    label: 'CAN ABİM', icon: '🚗', color: '#00e5ff', neon: true, priority: 87,
    entry_animation: 'car-entry', exit_animation: 'car-exit',
    show_in_room: true, moderator: false, hide_username_entry: true,
    name_effect: 'lightning',
  },
  'nargileciler': {
    label: 'NARGİLECİLER', icon: '🪔', color: '#4caf50', neon: true, priority: 86,
    entry_animation: 'nargile-entry', exit_animation: 'nargile-exit',
    show_in_room: true, moderator: false, hide_username_entry: true,
    name_effect: 'smoke',
  },
  'prince': {
    label: 'PRENS', icon: '👑', color: '#fbbf24', neon: true, priority: 80,
    entry_animation: 'prince-entry', exit_animation: 'prince-exit',
    show_in_room: true, moderator: false,
    name_effect: 'gold',
  },
  'princess': {
    label: 'PRENSES', icon: '👸', color: '#f472b6', neon: true, priority: 75,
    entry_animation: 'princess-entry', exit_animation: 'princess-exit',
    show_in_room: true, moderator: false,
    name_effect: 'heart',
  },
  'vip1': {
    label: 'VIP 1', icon: '💎', color: '#06b6d4', neon: true, priority: 70,
    entry_animation: 'diamond-entry', exit_animation: 'diamond-exit',
    show_in_room: false, moderator: false,
    name_effect: 'diamond',
  },
  'vip2': {
    label: 'VIP 2', icon: '💜', color: '#a855f7', neon: true, priority: 65,
    entry_animation: 'purple-entry', exit_animation: 'purple-exit',
    show_in_room: false, moderator: false,
    name_effect: 'star',
  },
  'vip3': {
    label: 'VIP 3', icon: '🌟', color: '#facc15', neon: true, priority: 60,
    entry_animation: 'star-entry', exit_animation: 'star-exit',
    show_in_room: false, moderator: false,
    name_effect: 'star',
  },
  'member': {
    label: 'ÜYE', icon: '👤', color: '#94a3b8', neon: false, priority: 10,
    entry_animation: 'member-entry', exit_animation: 'member-exit',
    show_in_room: false, moderator: false,
  },
};

export const FRAME_DEFINITIONS: Record<string, any> = {
  '': { label: 'Yok', color: '', gradient: '' },
  'galatasaray': {
    label: 'Galatasaray', color: '#ED1C24',
    gradient: 'linear-gradient(135deg, #a8180f, #fbbf24)',
    animation: 'frame-gs',
    colors: ['#ED1C24', '#fbbf24'],
  },
  'fenerbahce': {
    label: 'Fenerbahçe', color: '#002244',
    gradient: 'linear-gradient(135deg, #1e3a8a, #facc15)',
    animation: 'frame-fb',
    colors: ['#002244', '#facc15'],
  },
  'besiktas': {
    label: 'Beşiktaş', color: '#000000',
    gradient: 'linear-gradient(135deg, #1a1a1a, #e5e7eb)',
    animation: 'frame-bjk',
    colors: ['#000000', '#e5e7eb'],
  },
  'trabzonspor': {
    label: 'Trabzonspor', color: '#6B0C72',
    gradient: 'linear-gradient(135deg, #6B0C72, #4A90D9)',
    animation: 'frame-ts',
    colors: ['#6B0C72', '#4A90D9'],
  },
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

export function parseRoleMetadata(text: string): { text: string; roleKey: string | null; color: string | null; animation: string | null; hasRole: boolean } {
  if (!text) return { text: '', roleKey: null, color: null, animation: null, hasRole: false };
  const match = text.match(/^\{\{ROLE\|([^}]+)\}\}/);
  if (!match) return { text, roleKey: null, color: null, animation: null, hasRole: false };
  const parts = match[1].split('|');
  const rest = text.slice(match[0].length);
  if (parts.length >= 3) {
    return { text: rest, roleKey: parts[0] || null, color: parts[1] || null, animation: parts[2] || null, hasRole: true };
  }
  if (parts.length === 2) {
    return { text: rest, roleKey: null, color: parts[0] || null, animation: parts[1] || null, hasRole: true };
  }
  return { text: rest, roleKey: null, color: null, animation: null, hasRole: true };
}

export function isSiteOwner(user: any): boolean {
  return user?.role === 'admin';
}

export function isModerator(user: any): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'moderator') return true;
  if (user?.custom_role?.moderator) return true;
  const predefined = ROLE_DEFINITIONS[user?.display_role || ''];
  if (predefined?.moderator) return true;
  return false;
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
  const predefined = ROLE_DEFINITIONS[user?.display_role || ''];
  if (predefined?.moderator) return true;
  return false;
}

// Fetch custom role label overrides from AppConfig (key: "role_labels")
// Returns a map of { roleKey: customLabel }
export async function getRoleLabelOverrides(base44: any): Promise<Record<string, string>> {
  try {
    const records = await base44.asServiceRole.entities.AppConfig.filter({ key: 'role_labels' }, '-created_date', 1).catch(() => []);
    if (records[0]?.value) {
      return JSON.parse(records[0].value);
    }
  } catch {}
  return {};
}

// Fetch a user's active special frame info (for room entry/exit overlays).
// isEntry=true checks entry_enabled, isEntry=false checks exit_enabled.
export async function getSpecialFrameInfo(base44: any, user: any, isEntry: boolean): Promise<any> {
  if (!user?.special_frame_id) return null;
  const frame = await base44.asServiceRole.entities.SpecialFrame.get(user.special_frame_id).catch(() => null);
  if (!frame || !frame.active) return null;
  const enabled = isEntry ? (user.special_frame_entry !== false) : (user.special_frame_exit !== false);
  if (!enabled) return null;
  return {
    id: frame.id,
    image_url: frame.image_url,
    theme_color: frame.theme_color || '#ff4500',
    text_color: frame.text_color || '#ffaa00',
    glow_color: frame.glow_color || frame.theme_color || '#ff4500',
    title: user.special_frame_title || frame.title || '',
  };
}

// Parse {{FRAME|id|themeColor|textColor|glowColor|title}} metadata from message text.
export function parseFrameMetadata(text: string): { frameId: string | null; themeColor: string | null; textColor: string | null; glowColor: string | null; title: string | null; rest: string } {
  if (!text) return { frameId: null, themeColor: null, textColor: null, glowColor: null, title: null, rest: text || '' };
  const match = text.match(/^\{\{FRAME\|([^}]+)\}\}/);
  if (!match) return { frameId: null, themeColor: null, textColor: null, glowColor: null, title: null, rest: text };
  const parts = match[1].split('|');
  return {
    frameId: parts[0] || null,
    themeColor: parts[1] || null,
    textColor: parts[2] || null,
    glowColor: parts[3] || null,
    title: parts[4] || null,
    rest: text.slice(match[0].length),
  };
}

export function getRoleInfo(user: any, labelOverrides: Record<string, string> = {}): any {
  const predefined = ROLE_DEFINITIONS[user?.display_role || ''];
  if (predefined && predefined.label) {
    const overrideLabel = labelOverrides[user.display_role];
    return { ...predefined, label: overrideLabel || predefined.label, key: user.display_role, custom: false };
  }
  if (user?.custom_role?.name) {
    return {
      key: 'custom',
      label: user.custom_role.name,
      icon: user.custom_role.icon || '✨',
      color: user.custom_role.color || '#8b5cf6',
      neon: user.custom_role.neon || false,
      animation: user.custom_role.animation || 'pulse',
      entry_animation: 'member-entry',
      exit_animation: 'member-exit',
      show_in_room: user.custom_role.show_in_room || false,
      moderator: user.custom_role.moderator || false,
      hide_username_entry: user.custom_role.hide_username_entry || false,
      name_effect: user.custom_role.name_effect || null,
      priority: 0,
      custom: true,
    };
  }
  return { ...ROLE_DEFINITIONS[''], key: '', custom: false };
}