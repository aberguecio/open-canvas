import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <button
        onClick={() => setTheme('light')}
        style={{
          padding: '0.4rem 0.8rem',
          fontSize: '0.9rem',
          opacity: theme === 'light' ? 1 : 0.5,
        }}
        title="Light mode"
      >
        ☀️
      </button>
      <button
        onClick={() => setTheme('system')}
        style={{
          padding: '0.4rem 0.8rem',
          fontSize: '0.9rem',
          opacity: theme === 'system' ? 1 : 0.5,
        }}
        title="System preference"
      >
        💻
      </button>
      <button
        onClick={() => setTheme('dark')}
        style={{
          padding: '0.4rem 0.8rem',
          fontSize: '0.9rem',
          opacity: theme === 'dark' ? 1 : 0.5,
        }}
        title="Dark mode"
      >
        🌙
      </button>
    </div>
  );
}
