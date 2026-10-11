import { useId } from 'react';

// ISMS mark: an isometric stock cube on a teal tile.
export default function Logo({ size = 36, wordmark = false }: { size?: number; wordmark?: boolean }) {
  const gid = useId();
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="ISMS logo" style={{ flexShrink: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2dd4bf" />
            <stop offset="1" stopColor="#0f766e" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="10" fill={`url(#${gid})`} />
        <polygon points="20,8.5 30.5,14.25 20,20 9.5,14.25" fill="#fff" fillOpacity="0.97" />
        <polygon points="9.5,14.25 20,20 20,31.5 9.5,25.75" fill="#fff" fillOpacity="0.72" />
        <polygon points="30.5,14.25 20,20 20,31.5 30.5,25.75" fill="#fff" fillOpacity="0.5" />
      </svg>
      {wordmark && (
        <span style={{ lineHeight: 1.1 }}>
          <span style={{ display: 'block', fontSize: 17, fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.3px' }}>ISMS</span>
          <span style={{ display: 'block', fontSize: 10, color: 'var(--color-ink-mute)', letterSpacing: '0.06em' }}>Inventory &amp; Stock</span>
        </span>
      )}
    </span>
  );
}
