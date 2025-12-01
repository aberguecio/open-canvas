import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
        style={{
          padding: '0.4rem',
          borderRadius: '4px',
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-button-bg)',
          color: 'var(--color-text)',
          cursor: 'pointer',
          fontSize: '0.9rem'
        }}
        title="Select theme"
      >
        <option value="light">☀️ Light</option>
        <option value="dark">🌙 Dark</option>
        <option value="system">💻 System</option>
      </select>
    </div>
  );
}
