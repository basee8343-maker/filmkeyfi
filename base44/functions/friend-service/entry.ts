import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { findProfanity } from '../../shared/profanity.ts';
import { notifyUser } from '../../shared/notifyUser.ts';

const cleanUser = (user) => ({
  id: user.id,
  name: user.username || user.full_name || 'Kullanıcı',
  member_id: user.member_id || '',
  avatar: user.avatar || ''
});

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Oturum gerekli' }, { status: 401 });
    const body = await req.json();
    const action = body.action;

    if (action === 'admin_clear_all') {
      if (user.role !== 'admin') return Response.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
      await base44.asServiceRole.entities.DirectMessage.deleteMany({});
      return Response.json({ ok: true });
    }

    if (action === 'search') {
      const memberId = String(body.member_id || '').trim();
      if (!/^\d{8}$/.test(memberId)) return Response.json({ error: '8 haneli üye numarası girin' }, { status: 400 });
      const matches = await base44.asServiceRole.entities.User.filter({ member_id: memberId }, '-created_date', 2);
      const target = matches.find((item) => item.id !== user.id);
      if (!target) return Response.json({ user: null });
      const blocked = await base44.asServiceRole.entities.Friendship.filter({
        $or: [
          { requester_id: user.id, recipient_id: target.id, status: 'blocked' },
          { requester_id: target.id, recipient_id: user.id, status: 'blocked' }
        ]
      }, '-created_date', 1);
      return Response.json({ user: blocked.length ? null : cleanUser(target) });
    }

    if (action === 'request') {
      const targetId = String(body.user_id || '');
      if (!targetId || targetId === user.id) return Response.json({ error: 'Geçersiz kullanıcı' }, { status: 400 });
      const target = await base44.asServiceRole.entities.User.get(targetId);
      if (!target) return Response.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
      const existing = await base44.asServiceRole.entities.Friendship.filter({
        $or: [
          { requester_id: user.id, recipient_id: targetId },
          { requester_id: targetId, recipient_id: user.id }
        ]
      }, '-created_date', 20);
      if (existing.some((item) => item.status === 'pending' || item.status === 'accepted' || item.status === 'blocked')) {
        return Response.json({ error: 'Arkadaşlık isteği zaten mevcut' }, { status: 409 });
      }
      const me = cleanUser(user); const other = cleanUser(target);
      const friendship = await base44.asServiceRole.entities.Friendship.create({
        requester_id: me.id, requester_name: me.name, requester_member_id: me.member_id, requester_avatar: me.avatar,
        recipient_id: other.id, recipient_name: other.name, recipient_member_id: other.member_id, recipient_avatar: other.avatar,
        members: [me.id, other.id], status: 'pending'
      });
      await base44.asServiceRole.entities.Notification.create({ user_id: other.id, title: 'Yeni arkadaşlık isteği', body: `${me.name} size arkadaşlık isteği gönderdi.`, type: 'friend_request', link: '/arkadaslar' });
      return Response.json({ friendship });
    }

    if (action === 'respond') {
      const friendship = await base44.asServiceRole.entities.Friendship.get(String(body.friendship_id || ''));
      if (!friendship || friendship.recipient_id !== user.id || friendship.status !== 'pending') {
        return Response.json({ error: 'Bu istek işlenemiyor' }, { status: 403 });
      }
      const status = body.accept ? 'accepted' : 'rejected';
      const updated = await base44.asServiceRole.entities.Friendship.update(friendship.id, { status });
      if (status === 'accepted') await base44.asServiceRole.entities.Notification.create({ user_id: friendship.requester_id, title: 'Arkadaşlık isteği kabul edildi', body: `${friendship.recipient_name} artık arkadaşınız.`, type: 'friend_accepted', link: '/arkadaslar' });
      return Response.json({ friendship: updated });
    }

    if (action === 'typing') {
      const friendship = await base44.asServiceRole.entities.Friendship.get(String(body.friendship_id || ''));
      if (!friendship || friendship.status !== 'accepted' || !friendship.members.includes(user.id)) return Response.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
      await base44.asServiceRole.entities.Friendship.update(friendship.id, { typing_user_id: body.typing ? user.id : '', typing_updated_at: new Date().toISOString() });
      return Response.json({ ok: true });
    }

    if (action === 'mark_read') {
      const friendship = await base44.asServiceRole.entities.Friendship.get(String(body.friendship_id || ''));
      if (!friendship || !friendship.members.includes(user.id)) return Response.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
      const received = await base44.asServiceRole.entities.DirectMessage.filter({ friendship_id: friendship.id, recipient_id: user.id }, '-created_date', 500);
      const unread = received.filter((message) => !(message.read_by || []).includes(user.id));
      if (unread.length) await base44.asServiceRole.entities.DirectMessage.bulkUpdate(unread.map((message) => ({ id: message.id, read_by: [...new Set([...(message.read_by || []), user.id])] })));
      return Response.json({ ok: true });
    }

    if (action === 'clear_chat') {
      const friendship = await base44.asServiceRole.entities.Friendship.get(String(body.friendship_id || ''));
      if (!friendship || !friendship.members.includes(user.id)) return Response.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
      const clearedAt = { ...(friendship.cleared_at || {}) };
      clearedAt[user.id] = new Date().toISOString();
      await base44.asServiceRole.entities.Friendship.update(friendship.id, { cleared_at: clearedAt });
      return Response.json({ ok: true });
    }

    if (action === 'refriend') {
      const friendship = await base44.asServiceRole.entities.Friendship.get(String(body.friendship_id || ''));
      if (!friendship || !friendship.members.includes(user.id)) return Response.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
      if (friendship.status !== 'removed') return Response.json({ error: 'Bu arkadaşlık geri eklenemez' }, { status: 400 });
      await base44.asServiceRole.entities.Friendship.update(friendship.id, { status: 'accepted' });
      return Response.json({ ok: true });
    }

    if (['hide', 'unfriend', 'block', 'unblock'].includes(action)) {
      const friendship = await base44.asServiceRole.entities.Friendship.get(String(body.friendship_id || ''));
      if (!friendship || !friendship.members.includes(user.id)) return Response.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
      if (action === 'hide') {
        const hiddenFor = [...new Set([...(friendship.hidden_for || []), user.id])];
        await base44.asServiceRole.entities.Friendship.update(friendship.id, { hidden_for: hiddenFor });
      } else if (action === 'unfriend') {
        await base44.asServiceRole.entities.Friendship.update(friendship.id, { status: 'removed' });
      } else if (action === 'block') {
        const blockedBy = [...new Set([...(friendship.blocked_by || []), user.id])];
        await base44.asServiceRole.entities.Friendship.update(friendship.id, { status: 'blocked', blocked_by: blockedBy });
      } else {
        if (!(friendship.blocked_by || []).includes(user.id)) return Response.json({ error: 'Bu engeli kaldıramazsınız' }, { status: 403 });
        const blockedBy = (friendship.blocked_by || []).filter((id) => id !== user.id);
        await base44.asServiceRole.entities.Friendship.update(friendship.id, { status: blockedBy.length ? 'blocked' : 'accepted', blocked_by: blockedBy });
      }
      return Response.json({ ok: true });
    }

    if (action === 'send') {
      const text = String(body.text || '').trim();
      if (!text || text.length > 2000) return Response.json({ error: 'Mesaj 1-2000 karakter olmalıdır' }, { status: 400 });
      const friendship = await base44.asServiceRole.entities.Friendship.get(String(body.friendship_id || ''));
      if (!friendship || friendship.status !== 'accepted' || !friendship.members.includes(user.id)) {
        return Response.json({ error: 'Yalnızca arkadaşlarınıza mesaj gönderebilirsiniz' }, { status: 403 });
      }
      // Küfür/argo filtresi
      const badWords = findProfanity(text);
      if (badWords.length) {
        const senderName = user.username || user.full_name || 'Kullanıcı';
        await base44.asServiceRole.entities.Report.create({
          reporter_id: user.id, reporter_name: senderName,
          target_id: user.id, target_name: senderName,
          context: 'dm', context_id: friendship.id,
          reason: `Küfür/Argo filtre: "${text}" (${badWords.join(', ')})`,
          status: 'pending'
        }).catch(() => {});
        return Response.json({ error: 'Mesajınız uygunsuz içerik tespit edildiği için engellendi.', filtered: true }, { status: 400 });
      }
      const recipientId = friendship.requester_id === user.id ? friendship.recipient_id : friendship.requester_id;
      const senderName = friendship.requester_id === user.id ? friendship.requester_name : friendship.recipient_name;
      const recipientName = friendship.requester_id === user.id ? friendship.recipient_name : friendship.requester_name;
      const visibleToBoth = (friendship.hidden_for || []).filter((id) => id !== user.id && id !== recipientId);
      if (visibleToBoth.length !== (friendship.hidden_for || []).length) await base44.asServiceRole.entities.Friendship.update(friendship.id, { hidden_for: visibleToBoth });
      const message = await base44.asServiceRole.entities.DirectMessage.create({ friendship_id: friendship.id, sender_id: user.id, sender_name: senderName, recipient_id: recipientId, recipient_name: recipientName, participants: friendship.members, read_by: [user.id], text });
      await notifyUser(base44, {
        user_id: recipientId, title: senderName, body: text.substring(0, 100),
        type: 'dm', link: '/arkadaslar', ref_id: friendship.id
      });
      return Response.json({ message });
    }

    if (action === 'start_admin_chat') {
      // Kullanıcı adminle arkadaş olmadan da özel mesaj başlatabilir.
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }, 'created_date', 1);
      const target = admins[0];
      if (!target) return Response.json({ error: 'Yönetici bulunamadı' }, { status: 404 });
      if (target.id === user.id) return Response.json({ error: 'Kendinize mesaj yazamazsınız' }, { status: 400 });
      const existing = await base44.asServiceRole.entities.Friendship.filter({
        $or: [
          { requester_id: user.id, recipient_id: target.id },
          { requester_id: target.id, recipient_id: user.id }
        ]
      }, '-created_date', 20);
      const blocked = existing.find((item) => item.status === 'blocked');
      if (blocked) return Response.json({ error: 'Bu görüşme kullanılamıyor' }, { status: 403 });
      const already = existing.find((item) => item.status === 'accepted');
      if (already) return Response.json({ friendship: already });
      const me = cleanUser(user); const other = cleanUser(target);
      const friendship = await base44.asServiceRole.entities.Friendship.create({
        requester_id: me.id, requester_name: me.name, requester_member_id: me.member_id, requester_avatar: me.avatar,
        recipient_id: other.id, recipient_name: other.name, recipient_member_id: other.member_id, recipient_avatar: other.avatar,
        members: [me.id, other.id], status: 'accepted'
      });
      return Response.json({ friendship });
    }

    return Response.json({ error: 'Geçersiz işlem' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'İşlem başarısız' }, { status: 500 });
  }
}