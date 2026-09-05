import { useMessageRealtime } from '@/components/messages/MessageRealtimeProvider';

export default function useSocialBadges() {
  return useMessageRealtime().badges;
}