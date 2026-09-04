import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { findProfanity } from '../../shared/profanity.ts';
import { notifyUser } from '../../shared/notifyUser.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Oturum gerekli' }, { status: 401 });
    const body = await req.json();
    const action = body.action;
    const userName = user.username || user.full_name || 'Kullanıcı';
    const userAvatar = user.avatar || '';

    // start: Yeni sohbet başlat veya mevcut aktif sohbeti aç
    // Kullanıcı sohbeti sildiyse (deleted_for içinde) YENİ sohbet oluşturulur
    if (action === 'start') {
      const targetId = String(body.target_id || '');
      if (!targetId || targetId === user.id) return Response.json({ error: 'Geçersiz kullanıcı' }, { status: 400 });
      const target = await base44.asServiceRole.entities.User.get(targetId).catch(() => null);
      if (!target) return Response.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
      const targetName = target.username || target.full_name || 'Kullanıcı';
      const targetAvatar = target.avatar || '';

      // İki kullanıcı arasındaki sohbetleri user1_id/user2_id ile bul (members array filter güvenilir değil)
      const allConvos = await base44.asServiceRole.entities.Conversation.filter({
        $or: [
          { user1_id: user.id, user2_id: targetId },
          { user1_id: targetId, user2_id: user.id }
        ]
      }, '-created_date', 10).catch(() => []);
      const between = allConvos || [];
      // Mevcut sohbet varsa onu kullan — silinmişse bile geri aç (yeni oluşturma)
      if (between.length > 0) {
        const convo = between[0];
        if ((convo.deleted_for || []).includes(user.id)) {
          const newDeletedFor = (convo.deleted_for || []).filter((id) => id !== user.id);
          // Clean slate: son mesajı temizle — tekrar açınca eski mesaj görünmesin
          await base44.asServiceRole.entities.Conversation.update(convo.id, { deleted_for: newDeletedFor, last_message_text: '', last_message_at: null });
          return Response.json({ conversation: { ...convo, deleted_for: newDeletedFor, last_message_text: '', last_message_at: null } });
        }
        return Response.json({ conversation: convo });
      }

      // Hiç sohbet yoksa yeni oluştur
      const conversation = await base44.asServiceRole.entities.Conversation.create({
        user1_id: user.id, user1_name: userName, user1_avatar: userAvatar,
        user2_id: targetId, user2_name: targetName, user2_avatar: targetAvatar,
        members: [user.id, targetId], deleted_for: [],
        last_message_text: '', last_sender_id: '', last_sender_name: '',
        unread_user1: 0, unread_user2: 0
      });
      return Response.json({ conversation });
    }

    // send: Mesaj gönder
    if (action === 'send') {
      const conversationId = String(body.conversation_id || '');
      const content = String(body.content || '').trim();
      if (!conversationId || !content) return Response.json({ error: 'eksik parametre' }, { status: 400 });
      if (content.length > 2000) return Response.json({ error: 'Mesaj 1-2000 karakter olmalıdır' }, { status: 400 });

      const conversation = await base44.asServiceRole.entities.Conversation.get(conversationId).catch(() => null);
      if (!conversation) return Response.json({ error: 'Sohbet bulunamadı' }, { status: 404 });
      if (!(conversation.members || []).includes(user.id)) return Response.json({ error: 'Bu sohbette yetkiniz yok' }, { status: 403 });
      if ((conversation.deleted_for || []).includes(user.id)) return Response.json({ error: 'Bu sohbeti sildiniz' }, { status: 403 });

      // Arkadaşlık durumu kontrolü — engelli veya silinmişse uyarı ver
      const friendId = conversation.user1_id === user.id ? conversation.user2_id : conversation.user1_id;
      const friendships = await base44.asServiceRole.entities.Friendship.filter({
        $or: [
          { requester_id: user.id, recipient_id: friendId },
          { requester_id: friendId, recipient_id: user.id }
        ]
      }, '-created_date', 10).catch(() => []);
      const friendship = friendships[0];
      if (friendship) {
        if (friendship.status === 'blocked') {
          const blockedBy = friendship.blocked_by || [];
          if (blockedBy.includes(friendId)) return Response.json({ error: 'Kullanıcı sizi engelledi' }, { status: 403 });
          if (blockedBy.includes(user.id)) return Response.json({ error: 'Bu kullanıcıyı engellediniz' }, { status: 403 });
        }
        if (friendship.status !== 'accepted') return Response.json({ error: 'Arkadaş olmanız gerek' }, { status: 403 });
      }

      // Küfür filtresi
      const badWords = findProfanity(content);
      if (badWords.length) {
        await base44.asServiceRole.entities.Report.create({
          reporter_id: user.id, reporter_name: userName,
          target_id: user.id, target_name: userName,
          context: 'dm', context_id: conversationId,
          reason: `Küfür/Argo filtre: "${content}" (${badWords.join(', ')})`,
          status: 'pending'
        }).catch(() => {});
        return Response.json({ error: 'Mesajınız uygunsuz içerik tespit edildiği için engellendi.', filtered: true }, { status: 400 });
      }

      const receiverId = conversation.user1_id === user.id ? conversation.user2_id : conversation.user1_id;
      const receiverName = conversation.user1_id === user.id ? conversation.user2_name : conversation.user1_name;

      const message = await base44.asServiceRole.entities.ChatMessage.create({
        conversation_id: conversationId,
        sender_id: user.id, sender_name: userName,
        receiver_id: receiverId,
        content, deleted_for: [], read_by: [user.id]
      });

      // Sohbeti güncelle — son mesaj ve okunmamış sayısı
      const updates: any = {
        last_message_text: content,
        last_message_at: new Date().toISOString(),
        last_sender_id: user.id, last_sender_name: userName
      };
      if (conversation.user1_id === user.id) {
        updates.unread_user2 = (conversation.unread_user2 || 0) + 1;
      } else {
        updates.unread_user1 = (conversation.unread_user1 || 0) + 1;
      }
      await base44.asServiceRole.entities.Conversation.update(conversationId, updates);

      // Alıcıya bildirim
      await notifyUser(base44, {
        user_id: receiverId, title: userName, body: content.substring(0, 100),
        type: 'dm', link: '/arkadaslar', ref_id: conversationId
      });

      return Response.json({ message });
    }

    // delete_conversation: Sohbeti SADECE bu kullanıcı için sil + tüm mesajları temizle (clean slate)
    if (action === 'delete_conversation') {
      const conversationId = String(body.conversation_id || '');
      const conversation = await base44.asServiceRole.entities.Conversation.get(conversationId).catch(() => null);
      if (!conversation) return Response.json({ error: 'Sohbet bulunamadı' }, { status: 404 });
      if (!(conversation.members || []).includes(user.id)) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      const deletedFor = [...new Set([...(conversation.deleted_for || []), user.id])];
      await base44.asServiceRole.entities.Conversation.update(conversationId, { deleted_for: deletedFor });
      // Tüm mesajları bu kullanıcı için sil — tekrar açınca eski mesajlar görünmesin
      const messages = await base44.asServiceRole.entities.ChatMessage.filter({ conversation_id: conversationId }, 'created_date', 500).catch(() => []);
      if (messages.length) {
        await base44.asServiceRole.entities.ChatMessage.bulkUpdate(messages.map((m) => ({ id: m.id, deleted_for: [...new Set([...(m.deleted_for || []), user.id])] })));
      }
      return Response.json({ ok: true });
    }

    // toggle_offline: Bu sohbette çevrim dışı görün (sadece bu sohbet, odalar etkilenmez)
    if (action === 'toggle_offline') {
      const conversationId = String(body.conversation_id || '');
      const conversation = await base44.asServiceRole.entities.Conversation.get(conversationId).catch(() => null);
      if (!conversation) return Response.json({ error: 'Sohbet bulunamadı' }, { status: 404 });
      if (!(conversation.members || []).includes(user.id)) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      const offlineFor = conversation.offline_for || [];
      const newOfflineFor = offlineFor.includes(user.id)
        ? offlineFor.filter((id) => id !== user.id)
        : [...offlineFor, user.id];
      await base44.asServiceRole.entities.Conversation.update(conversationId, { offline_for: newOfflineFor });
      return Response.json({ ok: true, offline_for: newOfflineFor });
    }

    // delete_message: Tek mesajı SADECE bu kullanıcı için sil
    // Karşı taraf mesajı görmeye devam eder
    if (action === 'delete_message') {
      const messageId = String(body.message_id || '');
      const message = await base44.asServiceRole.entities.ChatMessage.get(messageId).catch(() => null);
      if (!message) return Response.json({ error: 'Mesaj bulunamadı' }, { status: 404 });
      if (message.sender_id !== user.id && message.receiver_id !== user.id) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      const deletedFor = [...new Set([...(message.deleted_for || []), user.id])];
      await base44.asServiceRole.entities.ChatMessage.update(messageId, { deleted_for: deletedFor });
      return Response.json({ ok: true });
    }

    // mark_read: Sohbetteki tüm mesajları okundu işaretle
    if (action === 'mark_read') {
      const conversationId = String(body.conversation_id || '');
      const conversation = await base44.asServiceRole.entities.Conversation.get(conversationId).catch(() => null);
      if (!conversation) return Response.json({ error: 'Sohbet bulunamadı' }, { status: 404 });
      if (!(conversation.members || []).includes(user.id)) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      const messages = await base44.asServiceRole.entities.ChatMessage.filter({ conversation_id: conversationId, receiver_id: user.id }, 'created_date', 500).catch(() => []);
      const unread = (messages || []).filter((m) => !(m.read_by || []).includes(user.id));
      if (unread.length) {
        await base44.asServiceRole.entities.ChatMessage.bulkUpdate(unread.map((m) => ({ id: m.id, read_by: [...new Set([...(m.read_by || []), user.id])] })));
      }
      const unreadUpdate = conversation.user1_id === user.id ? { unread_user1: 0 } : { unread_user2: 0 };
      await base44.asServiceRole.entities.Conversation.update(conversationId, unreadUpdate);
      return Response.json({ ok: true });
    }

    // typing: Yazıyor göstergesi
    if (action === 'typing') {
      const conversationId = String(body.conversation_id || '');
      const conversation = await base44.asServiceRole.entities.Conversation.get(conversationId).catch(() => null);
      if (!conversation || !(conversation.members || []).includes(user.id)) return Response.json({ error: 'yetkisiz' }, { status: 403 });
      await base44.asServiceRole.entities.Conversation.update(conversationId, { typing_user_id: body.typing ? user.id : '', typing_updated_at: new Date().toISOString() });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Geçersiz işlem' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'İşlem başarısız' }, { status: 500 });
  }
}