import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useMessageRealtime } from '@/components/messages/MessageRealtimeProvider';

export default function GlobalTypingIndicator({ userId }) {
  const { conversations } = useMessageRealtime();
  const active = conversations
    .filter((item) => item.typing_user_id && item.typing_user_id !== userId)
    .sort((a, b) => new Date(b.typing_updated_at || 0) - new Date(a.typing_updated_at || 0))[0];

  if (!active) return null;
  const name = active.typing_user_id === active.user1_id ? active.user1_name : active.user2_name;

  return (
    <Link
      to={`/arkadaslar?view=chats&chat=${active.id}`}
      className="fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-[80] flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary/30 bg-card/95 px-4 py-2 text-sm font-semibold text-foreground shadow-lg backdrop-blur-md"
    >
      <MessageCircle className="h-4 w-4 text-primary" />
      <span>{name || 'Bir kullanıcı'} yazıyor...</span>
      <span className="flex gap-0.5" aria-hidden="true"><i className="h-1 w-1 animate-pulse rounded-full bg-primary" /><i className="h-1 w-1 animate-pulse rounded-full bg-primary" /><i className="h-1 w-1 animate-pulse rounded-full bg-primary" /></span>
    </Link>
  );
}