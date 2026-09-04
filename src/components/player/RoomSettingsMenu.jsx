import { useRef } from 'react';
import { X } from 'lucide-react';
import RoomSettingsContent from '@/components/player/RoomSettingsContent';

export default function RoomSettingsMenu({ open, onClose, room, canMod, participants, roomModerators, onAssignMod, onRemoveMod, roomName, setRoomName, onSaveName, password, setPassword, passwordOpen, setPasswordOpen, onVoice, onChat, onHidden, onPassword, onRemovePassword, onUnban, onPickMovie, onDeleteRoom, roomLevels, onSetLevel }) {
  const touchStart = useRef({ x: 0, y: 0 });
  if (!open) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 z-[65] flex w-full max-w-sm flex-col border-l border-border bg-card/95 pt-[max(env(safe-area-inset-top),0.75rem)] pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-2xl backdrop-blur-xl slide-in-left"
      onTouchStart={(e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touchStart.current.x; const dy = e.changedTouches[0].clientY - touchStart.current.y; if (dx > 80 && dx > Math.abs(dy) * 1.5) onClose(); }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border"><p className="font-bold">Oda Ayarları</p><button onClick={onClose} className="rounded-lg p-1.5 hover:bg-secondary"><X className="w-4 h-4" /></button></div>
      <RoomSettingsContent
        room={room} canMod={canMod} participants={participants} roomModerators={roomModerators}
        onAssignMod={onAssignMod} onRemoveMod={onRemoveMod} roomName={roomName} setRoomName={setRoomName}
        onSaveName={onSaveName} password={password} setPassword={setPassword} passwordOpen={passwordOpen}
        setPasswordOpen={setPasswordOpen} onVoice={onVoice} onChat={onChat} onHidden={onHidden}
        onPassword={onPassword} onRemovePassword={onRemovePassword} onUnban={onUnban} onPickMovie={onPickMovie}
        onDeleteRoom={onDeleteRoom} roomLevels={roomLevels} onSetLevel={onSetLevel}
      />
    </div>
  );
}