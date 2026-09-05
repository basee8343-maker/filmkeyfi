import { useMessageRealtime } from '@/components/messages/MessageRealtimeProvider';

export default function useConversations() {
  const { conversations, loading, reload, optimisticHide } = useMessageRealtime();
  return { conversations, loading, reload, optimisticHide };
}