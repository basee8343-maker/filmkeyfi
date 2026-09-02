export const sortMessages = (messages) => [...messages].sort((a, b) => {
  const time = new Date(a.created_date || 0) - new Date(b.created_date || 0);
  return time || String(a.id).localeCompare(String(b.id));
});

export const upsertMessage = (messages, incoming) => {
  const index = messages.findIndex((message) => message.id === incoming.id);
  if (index < 0) return sortMessages([...messages, incoming]);
  const next = [...messages];
  next[index] = { ...next[index], ...incoming };
  return sortMessages(next);
};

export const mergeMessages = (current, incoming) => incoming.reduce(upsertMessage, current);