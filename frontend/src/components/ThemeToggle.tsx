import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem('isms_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* storage unavailable */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Light/dark switch. The chosen theme is stored in localStorage and applied as data-theme on <html>
// (index.html applies it before first paint to avoid a flash).
export default function ThemeToggle({ compact = true }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('isms_theme', theme); } catch { /* ignore */ }
  }, [theme]);

  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      onClick={() => setTheme(next)}
      className="icon-btn"
      title={`Switch to ${next} mode`}
      aria-label={`Switch to ${next} mode`}
    >
      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      {!compact && <span style={{ fontSize: 13 }}>{theme === 'dark' ? 'Light' : 'Dark'} mode</span>}
    </button>
  );
}
