// Animated username text effect based on role.
// Wraps a username and applies animated color/shadow CSS (flame, lightning, diamond, etc.)

const NAME_EFFECT_CLASSES = {
  flame: 'name-effect-flame',
  lightning: 'name-effect-lightning',
  heart: 'name-effect-heart',
  diamond: 'name-effect-diamond',
  star: 'name-effect-star',
  gold: 'name-effect-gold',
  smoke: 'name-effect-smoke',
};

export default function RoleNameEffect({ nameEffect, children, className = '', style = {} }) {
  if (!nameEffect || !NAME_EFFECT_CLASSES[nameEffect]) {
    return <span className={className} style={style}>{children}</span>;
  }
  return (
    <span className={`${NAME_EFFECT_CLASSES[nameEffect]} ${className}`} style={style}>
      {children}
    </span>
  );
}

export { NAME_EFFECT_CLASSES };