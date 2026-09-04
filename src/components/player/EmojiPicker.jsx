import { useState } from 'react';

const ANIMATED_EMOJIS = ['😂', '❤️', '🔥', '👏', '🎉', '😍', '😱', '😢', '👍', '🍿', '🎬', '💀'];
const REGULAR_EMOJIS = ['😀', '😂', '😍', '🔥', '👍', '👏', '😱', '😢', '🎬', '🍿', '❤️', '🎉'];

const ANIM_MAP = {
  '😂': 'anim-emoji-bounce', '👏': 'anim-emoji-bounce', '😢': 'anim-emoji-bounce', '👍': 'anim-emoji-bounce',
  '❤️': 'anim-emoji-pulse', '🎉': 'anim-emoji-pulse', '😍': 'anim-emoji-pulse', '🍿': 'anim-emoji-pulse',
  '🔥': 'anim-emoji-shake', '😱': 'anim-emoji-shake', '🎬': 'anim-emoji-shake', '💀': 'anim-emoji-shake',
};

export default function EmojiPicker({ onSelect }) {
  const [tab, setTab] = useState('animated');
  return (
    <div className="border-t border-border bg-card/95">
      <div className="flex gap-1 px-2 pt-2">
        <button onClick={() => setTab('animated')} className={`text-[10px] font-semibold px-2 py-1 rounded ${tab === 'animated' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}>🎬 Hareketli</button>
        <button onClick={() => setTab('regular')} className={`text-[10px] font-semibold px-2 py-1 rounded ${tab === 'regular' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}>😊 Normal</button>
      </div>
      {tab === 'animated' ? (
        <div className="px-2 py-2 grid grid-cols-6 gap-1">
          {ANIMATED_EMOJIS.map((e) => (
            <button key={e} onClick={() => onSelect(e)} className={`text-2xl hover:bg-secondary rounded-lg p-1.5 anim-emoji ${ANIM_MAP[e] || ''}`}>{e}</button>
          ))}
        </div>
      ) : (
        <div className="px-2 py-2 flex flex-wrap gap-1">
          {REGULAR_EMOJIS.map((e) => (
            <button key={e} onClick={() => onSelect(e)} className="text-xl hover:bg-secondary rounded p-1">{e}</button>
          ))}
        </div>
      )}
    </div>
  );
}