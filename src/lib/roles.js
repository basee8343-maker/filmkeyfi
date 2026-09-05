// Role and frame definitions + permission helpers
// Shared frontend module (JavaScript)

// Runtime override map for custom role labels (set by useRoleLabels hook)
let ROLE_LABEL_OVERRIDES = {};
export function setRoleLabelOverrides(map) { ROLE_LABEL_OVERRIDES = map || {}; }
export function getRoleLabelOverride(roleKey) { return ROLE_LABEL_OVERRIDES[roleKey] || ''; }

export const ROLE_DEFINITIONS = {
  '': { label: '', icon: '', color: '', neon: false, priority: 0 },
  'founder': {
    label: 'ADMİN / KURUCU', icon: '👑', color: '#fbbf24', neon: true, priority: 100,
    entry_animation: 'crown-entry', exit_animation: 'crown-exit',
    show_in_room: false, moderator: true, hide_username_entry: false,
    name_effect: 'gold',
    crown_profile: true,
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
    label: 'CAN ABLAM', icon: '🪔', color: '#ff1744', neon: true, priority: 88,
    entry_animation: 'nargile-entry', exit_animation: 'nargile-exit',
    show_in_room: false, moderator: false, hide_username_entry: false,
    name_effect: 'smoke',
    nargile_profile: true,
  },
  'can_abim': {
    label: 'CAN ABİM', icon: '🦁', color: '#f59e0b', neon: true, priority: 87,
    entry_animation: 'lion-entry', exit_animation: 'lion-exit',
    show_in_room: false, moderator: false, hide_username_entry: false,
    name_effect: 'gold',
    lion_profile: true,
  },
  'nargileciler': {
    label: 'NARGİLECİLER', icon: '🪔', color: '#4caf50', neon: true, priority: 86,
    entry_animation: 'nargile-entry', exit_animation: 'nargile-exit',
    show_in_room: false, moderator: false, hide_username_entry: false,
    name_effect: 'smoke',
    nargile_profile: true,
  },
  'special_vip': {
    label: 'ÖZEL VIP', icon: '💰', color: '#fbbf24', neon: true, priority: 85,
    entry_animation: 'money-entry', exit_animation: 'money-exit',
    show_in_room: false, moderator: false, hide_username_entry: false,
    name_effect: 'gold',
    special_vip_profile: true,
  },
  'prince': {
    label: 'PRENS', icon: '💙', color: '#3b82f6', neon: true, priority: 80,
    entry_animation: 'prince-entry', exit_animation: 'prince-exit',
    show_in_room: false, moderator: false, hide_username_entry: false,
    name_effect: 'gold',
  },
  'princess': {
    label: 'PRENSES', icon: '👸', color: '#f472b6', neon: true, priority: 75,
    entry_animation: 'princess-entry', exit_animation: 'princess-exit',
    show_in_room: false, moderator: false, hide_username_entry: false,
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

export const MSG_EFFECTS = {
  founder: 'gold',
  queen_admin: 'heart',
  admin_helper: 'flame',
  can_ablam: 'smoke',
  can_abim: 'gold',
  nargileciler: 'smoke',
  special_vip: 'gold',
  prince: 'gold',
  princess: 'heart',
  vip1: 'diamond',
  vip2: 'star',
  vip3: 'star',
};

export const NAME_EFFECT_OPTIONS = [
  { key: '', label: 'Yok / Varsayılan' },
  { key: 'flame', label: 'Alev' },
  { key: 'lightning', label: 'Şimşek' },
  { key: 'heart', label: 'Kalp' },
  { key: 'diamond', label: 'Elmas' },
  { key: 'star', label: 'Yıldız' },
  { key: 'gold', label: 'Altın' },
  { key: 'smoke', label: 'Duman' },
  { key: 'solid', label: 'Düz Renk' },
];

export const MSG_EFFECT_OPTIONS = [
  { key: '', label: 'Yok / Varsayılan' },
  { key: 'flame', label: 'Alev Çerçeve' },
  { key: 'heart', label: 'Kalp Çerçeve' },
  { key: 'lightning', label: 'Şimşek Çerçeve' },
  { key: 'diamond', label: 'Elmas Çerçeve' },
  { key: 'smoke', label: 'Duman Çerçeve' },
  { key: 'gold', label: 'Altın Çerçeve' },
  { key: 'star', label: 'Yıldız Çerçeve' },
  { key: 'solid', label: 'Düz Çerçeve' },
];

import frameCatalog from '@/components/profile/frameCatalog';

export const FRAME_DEFINITIONS = {
  '': { label: 'Yok', color: '', gradient: '' },
  'galatasaray': {
    label: 'Galatasaray', color: '#ED1C24',
    image_url: 'https://media.base44.com/images/public/6a77d66e4da6de214628ee62/57814afab_C3294E4C-0C9F-47E7-8F21-8635F3216C8E.png',
    colors: ['#ED1C24', '#fbbf24'],
  },
  'fenerbahce': {
    label: 'Fenerbahçe', color: '#002244',
    image_url: 'https://media.base44.com/images/public/6a77d66e4da6de214628ee62/0c8c65422_33FB3401-4269-43D4-BCB7-7CD83827C516.png',
    colors: ['#002244', '#facc15'],
  },
  'besiktas': {
    label: 'Beşiktaş', color: '#000000',
    image_url: 'https://media.base44.com/images/public/6a77d66e4da6de214628ee62/409026575_1391E6B7-78D2-4960-ACF8-C85B43BBD70F.png',
    colors: ['#000000', '#e5e7eb'],
  },
  'trabzonspor': {
    label: 'Trabzonspor', color: '#6B0C72',
    image_url: 'https://media.base44.com/images/public/6a77d66e4da6de214628ee62/c1ab8665f_68781285-2AB1-44F1-8F15-41D3B81AB66F.png',
    colors: ['#6B0C72', '#4A90D9'],
  },
  ...frameCatalog,
};

export const ANIMATION_DEFINITIONS = [
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

export const PRESET_COLORS = [
  '#ef4444', '#f59e0b', '#fbbf24', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#ec4899', '#f472b6', '#ffffff', '#94a3b8',
];

export const BAN_REASONS = [
  { key: 'harassment', icon: '🚫', label: 'Taciz' },
  { key: 'profanity', icon: '🤬', label: 'Küfür / Hakaret' },
  { key: 'inappropriate', icon: '⚠️', label: 'Uygunsuz davranış' },
  { key: 'spam', icon: '📢', label: 'Spam' },
  { key: 'disturbing', icon: '👥', label: 'Rahatsız edici davranış' },
  { key: 'security', icon: '🔒', label: 'Güvenlik ihlali' },
  { key: 'other', icon: '📝', label: 'Diğer' },
];

export function parseFrameMetadata(text) {
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

export function parseRoleMetadata(text) {
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

export function isSiteOwner(user) {
  return user?.role === 'admin';
}

export function isModerator(user) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'moderator') return true;
  if (user?.custom_role?.moderator) return true;
  const predefined = ROLE_DEFINITIONS[user?.display_role || ''];
  if (predefined?.moderator) return true;
  return false;
}

export function canAccessHidden(user) {
  return isModerator(user);
}

export function canAccessPasswordRooms(user) {
  return isModerator(user);
}

export function immuneToModeration(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user?.custom_role?.moderator) return true;
  const predefined = ROLE_DEFINITIONS[user?.display_role || ''];
  if (predefined?.moderator) return true;
  return false;
}

export function getRoleInfo(user) {
  const predefined = ROLE_DEFINITIONS[user?.display_role || ''];
  if (predefined && predefined.label) {
    const overrideLabel = ROLE_LABEL_OVERRIDES[user.display_role];
    const baseMsgEffect = MSG_EFFECTS[user.display_role] || null;
    return {
      ...predefined,
      label: overrideLabel || predefined.label,
      key: user.display_role,
      custom: false,
      name_effect: user?.name_effect || predefined.name_effect || null,
      msg_effect: user?.msg_effect || baseMsgEffect || null,
    };
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
      name_effect: user?.name_effect || user.custom_role.name_effect || null,
      msg_effect: user?.msg_effect || user.custom_role.msg_effect || null,
      priority: 0,
      custom: true,
    };
  }
  const result = { ...ROLE_DEFINITIONS[''], key: '', custom: false };
  if (user?.name_effect) result.name_effect = user.name_effect;
  if (user?.msg_effect) result.msg_effect = user.msg_effect;
  return result;
}