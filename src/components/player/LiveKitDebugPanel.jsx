export default function LiveKitDebugPanel({ voice }) {
  if (!import.meta.env.DEV) return null;
  const state = voice.connectionState;
  return (
    <aside className="absolute left-2 top-2 z-[70] max-w-64 rounded-lg border border-white/15 bg-black/85 p-2 font-mono text-[10px] leading-4 text-white/80 pointer-events-none">
      <p className="font-bold text-white">LiveKit Debug</p>
      <p>LiveKit Connection: {state === 'connected' ? 'ON' : 'OFF'}</p>
      <p>Room State: {state}</p>
      <p>Participant Count: {voice.debug.participantCount}</p>
      <p>Local Mic State: {voice.active ? 'ON' : 'OFF'}</p>
      <p>Local Audio Track: {voice.active ? 'published' : 'muted'}</p>
      <p>Remote Participants: {voice.debug.remoteParticipants}</p>
      <p>Remote Audio Track: {voice.debug.remoteTracks}</p>
      <p>Remote Playback: {voice.debug.playback}</p>
      <p>Connection State: {state}</p>
      <p>Reconnect State: {state === 'reconnecting' ? 'ACTIVE' : 'IDLE'}</p>
    </aside>
  );
}