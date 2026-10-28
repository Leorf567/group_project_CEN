// Initials avatar with a stable color derived from the name.
const HUES = [262, 330, 200, 160, 24, 290];

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export default function Avatar({ name, size = 40 }) {
  const hash = [...(name || '')].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const hue = HUES[hash % HUES.length];
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hue} 80% 62%), hsl(${(hue + 40) % 360} 80% 56%))`,
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
