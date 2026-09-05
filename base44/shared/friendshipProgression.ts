export function calculateFriendshipLevel(totalMessages) {
  const total = Math.max(0, Number(totalMessages) || 0);
  const level = Math.min(1000, Math.floor(total / 50) + 1);
  return { level, currentLevelMessages: level === 1000 ? 50 : total % 50 };
}

export async function incrementFriendshipProgression(base44, firstUserId, secondUserId, messageId) {
  const [userAId, userBId] = [String(firstUserId), String(secondUserId)].sort();
  const pairKey = `${userAId}:${userBId}`;
  const records = await base44.asServiceRole.entities.FriendshipProgression.filter({ pair_key: pairKey }, 'created_date', 10);
  let progression = records[0];
  if (!progression) {
    progression = await base44.asServiceRole.entities.FriendshipProgression.create({ pair_key: pairKey, user_a_id: userAId, user_b_id: userBId, members: [userAId, userBId], total_messages: 0, level: 1, current_level_message_count: 0 });
  }
  if (progression.last_counted_message_id === messageId) return progression;
  const totalMessages = (progression.total_messages || 0) + 1;
  const calculated = calculateFriendshipLevel(totalMessages);
  return await base44.asServiceRole.entities.FriendshipProgression.update(progression.id, { total_messages: totalMessages, level: calculated.level, current_level_message_count: calculated.currentLevelMessages, last_counted_message_id: messageId });
}