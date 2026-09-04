import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sanitizeText, rateLimit, safeErrorResponse, logSecurity } from '../../shared/security.ts';

async function sha256Hex(salt, pw) {
  const data = new TextEncoder().encode(salt + pw);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    let { name, movie_id, movie_title, password, max_users, chat_enabled, voice_enabled, hidden } = body || {};
    if (!name || !movie_id) return Response.json({ error: 'isim ve film gerekli' }, { status: 400 });

    // Input sanitization
    name = sanitizeText(name, 80);
    movie_title = sanitizeText(movie_title, 200);
    if (!name) return Response.json({ error: 'geçersiz oda adı' }, { status: 400 });

    // Admin rate limit'ten muaf
    const me = await base44.asServiceRole.entities.User.get(user.id).catch(() => null);
    const isAdmin = me?.role === 'admin';
    if (!isAdmin) {
      const rl = await rateLimit(base44, 'create-room:' + user.id, user.id, 5, 600000);
      if (!rl.allowed) return Response.json({ error: 'çok hızlı oda oluşturuyorsunuz, lütfen bekleyin' }, { status: 429 });
    }

    // max_users doğrula
    const mu = Math.min(Math.max(Number(max_users) || 10, 2), 50);

    const owner_name = user.username || user.full_name || 'Kullanıcı';
    const salt = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const hashed = password ? (salt + ':' + await sha256Hex(salt, String(password).slice(0, 100))) : '';

    // Assign lowest available room number among active rooms only
    const activeRooms = await base44.asServiceRole.entities.Room.filter({ status: 'active' }, '-created_date', 500).catch(() => []);
    const usedNumbers = new Set(activeRooms.map((r) => r.room_number || 0));
    let room_number = 1;
    while (usedNumbers.has(room_number)) room_number++;

    const room = await base44.asServiceRole.entities.Room.create({
      name, movie_id, movie_title: movie_title || '',
      owner_id: user.id, owner_name,
      password: hashed,
      room_number,
      max_users: mu,
      chat_enabled: chat_enabled !== false,
      voice_enabled: !!voice_enabled,
      is_playing: false, current_time: 0, status: 'active', hidden: !!hidden,
      participants: [{ user_id: user.id, name: owner_name, avatar: user.avatar || '', muted: false, speaking: false }]
    });
    await base44.asServiceRole.entities.RoomMessage.create({
      room_id: room.id, user_id: user.id, user_name: owner_name,
      text: `${owner_name} odaya katıldı.`, type: 'system'
    });
    return Response.json({ id: room.id });
  } catch (e) {
    return safeErrorResponse(e);
  }
}