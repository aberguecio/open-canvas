import { useEffect, useState } from 'react';
import { fetchSettings, updateSettings, Settings } from '../services/ImageService';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [uploadLimit, setUploadLimit] = useState(1);
  const [rotationInterval, setRotationInterval] = useState(4);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await fetchSettings();
      setSettings(data);
      setUploadLimit(data.uploadLimitPerDay);
      setRotationInterval(data.rotationIntervalHours);
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({
        uploadLimitPerDay: uploadLimit,
        rotationIntervalHours: rotationInterval,
      });
      alert('Settings saved successfully!');
      loadSettings();
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Admin Settings</h1>
      <form onSubmit={handleSave}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Upload Limit Per User Per Day
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={uploadLimit}
            onChange={(e) => setUploadLimit(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              borderRadius: '4px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
            }}
          />
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Maximum number of images each user can upload per day
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Image Rotation Interval (Hours)
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={rotationInterval}
            onChange={(e) => setRotationInterval(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              borderRadius: '4px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
            }}
          />
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            How often the displayed image rotates (in hours)
          </p>
        </div>

        <button type="submit" disabled={saving} style={{ width: '100%' }}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--color-button-bg)', borderRadius: '8px' }}>
        <p style={{ fontSize: '0.85rem', margin: 0 }}>
          Last updated: {new Date(settings.updatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
