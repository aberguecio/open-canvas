import { useEffect, useState } from 'react';
import { fetchSettings, updateSettings, Settings } from '../services/ImageService';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [uploadLimit, setUploadLimit] = useState(1);
  const [rotationInterval, setRotationInterval] = useState(4);
  const [defaultDuration, setDefaultDuration] = useState(24);
  const [autoBanEnabled, setAutoBanEnabled] = useState(false);
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
      setDefaultDuration(data.defaultImageDurationHours || 24);
      setAutoBanEnabled(data.autoBanEnabled || false);
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
        defaultImageDurationHours: defaultDuration,
        autoBanEnabled: autoBanEnabled,
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
            max="1000"
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
            Total cycle time target (how long to cycle through all images if possible)
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Default Image Duration (Hours)
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={defaultDuration}
            onChange={(e) => setDefaultDuration(Number(e.target.value))}
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
            Maximum time an image can stay visible (fallback when there are few images)
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--color-button-bg)', borderRadius: '8px', fontSize: '0.9rem' }}>
          <strong>Rotation Formula:</strong>
          <p style={{ margin: '0.5rem 0' }}>
            Duration = max(1h, min(<strong>Default Duration</strong>, <strong>Rotation Interval</strong> / <strong>Remaining Images</strong>))
          </p>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
            Images rotate faster when there are many in queue, but never exceed the default duration or go below 1 hour.
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoBanEnabled}
              onChange={(e) => setAutoBanEnabled(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 'bold' }}>Enable Auto-Ban</span>
          </label>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', marginLeft: '1.5rem' }}>
            Automatically ban users when their uploaded images are flagged by moderation
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
