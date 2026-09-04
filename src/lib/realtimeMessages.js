export const sortMessages = (messages) => [...messages].sort((a, b) => {
  const time = new Date(a.created_date || 0) - new Date(b.created_date || 0);
  return time || String(a.id).localeCompare(String(b.id));
});

export const upsertMessage = (messages, incoming) => {
  const index = messages.findIndex((message) => message.id === incoming.id);
  if (index >= 0) {
    const next = [...messages];
    next[index] = { ...next[index], ...incoming };
    return next;
  }
  const incomingTime = new Date(incoming.created_date || 0).getTime();
  const incomingId = String(incoming.id);
  let lo = 0, hi = messages.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const midTime = new Date(messages[mid].created_date || 0).getTime();
    if (midTime < incomingTime || (midTime === incomingTime && String(messages[mid].id).localeCompare(incomingId) < 0)) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  const next = [...messages];
  next.splice(lo, 0, incoming);
  return next;
};

export const mergeMessages = (current, incoming) => {
  const map = new Map();
  for (const m of current) map.set(m.id, m);
  for (const m of incoming) map.set(m.id, { ...(map.get(m.id) || {}), ...m });
  return sortMessages([...map.values()]);
};