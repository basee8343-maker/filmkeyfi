// Role-specific animated message bubble effects.
// Wraps a chat message bubble and adds animated effects (flames, hearts, lightning)
// based on the sender's role. Visible to ALL users in the room/chat.

const ROLE_EFFECTS = {
  founder: { type: 'flame', color: '#ff4500', glow: '#ff6b00' },
  queen_admin: { type: 'heart', color: '#ec4899', glow: '#f472b6' },
  admin_helper: { type: 'lightning', color: '#3b82f6', glow: '#60a5fa' },
};

function FlameEffect({ color, glow }) {
  return (
    <>
      {/* Animated flame border */}
      <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
        background: `linear-gradient(0deg, ${color}, ${glow}, ${color})`,
        backgroundSize: '100% 300%',
        animation: 'msg-flame-border 2s linear infinite',
        padding: '2px',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        borderRadius: '0.5rem',
      }} />
      {/* Flame glow behind bubble */}
      <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
        boxShadow: `0 0 12px 0px ${color}99, 0 0 6px 1px ${glow}66`,
        animation: 'msg-flame-glow 1.5s ease-in-out infinite alternate',
      }} />
      {/* Rising flame particles */}
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="absolute pointer-events-none" style={{
          left: `${15 + i * 23}%`,
          bottom: '100%',
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          background: i % 2 ? color : glow,
          boxShadow: `0 0 6px ${glow}`,
          animation: `msg-flame-particle 1.8s ease-out ${i * 0.4}s infinite`,
        }} />
      ))}
    </>
  );
}

function HeartEffect({ color, glow }) {
  return (
    <>
      {/* Animated pink gradient border */}
      <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
        background: `linear-gradient(135deg, ${color}, ${glow}, #fff0fa, ${color})`,
        backgroundSize: '300% 300%',
        animation: 'msg-heart-border 3s ease infinite',
        padding: '2px',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        borderRadius: '0.5rem',
      }} />
      {/* Heart glow behind bubble */}
      <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
        boxShadow: `0 0 10px 0px ${color}88, 0 0 4px 1px ${glow}55`,
        animation: 'msg-heart-glow 2s ease-in-out infinite alternate',
      }} />
      {/* Floating hearts */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="absolute pointer-events-none text-[8px]" style={{
          left: `${20 + i * 30}%`,
          bottom: '100%',
          animation: `msg-heart-particle 2.5s ease-out ${i * 0.6}s infinite`,
          filter: `drop-shadow(0 0 3px ${glow})`,
        }}>
          ❤
        </div>
      ))}
    </>
  );
}

function LightningEffect({ color, glow }) {
  return (
    <>
      {/* Animated electric border */}
      <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
        background: `linear-gradient(90deg, ${color}, ${glow}, #dbeafe, ${color})`,
        backgroundSize: '300% 100%',
        animation: 'msg-lightning-border 1.5s linear infinite',
        padding: '2px',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        borderRadius: '0.5rem',
      }} />
      {/* Electric glow */}
      <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
        boxShadow: `0 0 10px 0px ${color}88, 0 0 5px 1px ${glow}55`,
        animation: 'msg-lightning-glow 1s ease-in-out infinite',
      }} />
      {/* Electric spark particles */}
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="absolute pointer-events-none" style={{
          left: `${10 + i * 25}%`,
          top: '-2px',
          width: '3px',
          height: '3px',
          borderRadius: '50%',
          background: glow,
          boxShadow: `0 0 5px ${color}, 0 0 3px #fff`,
          animation: `msg-electric-spark 1.2s ease-out ${i * 0.3}s infinite`,
        }} />
      ))}
    </>
  );
}

export default function RoleMessageEffect({ roleKey, children, className = '' }) {
  const effect = ROLE_EFFECTS[roleKey];
  if (!effect) return <div className={className}>{children}</div>;

  return (
    <div className={`relative inline-block ${className}`}>
      {effect.type === 'flame' && <FlameEffect color={effect.color} glow={effect.glow} />}
      {effect.type === 'heart' && <HeartEffect color={effect.color} glow={effect.glow} />}
      {effect.type === 'lightning' && <LightningEffect color={effect.color} glow={effect.glow} />}
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

export { ROLE_EFFECTS };