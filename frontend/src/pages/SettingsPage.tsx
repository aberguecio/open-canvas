import { useEffect, useState } from 'react';
import { fetchSettings, updateSettings, Settings } from '../services/ImageService';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [uploadLimit, setUploadLimit] = useState(1);
  const [rotationInterval, setRotationInterval] = useState(4);
  const [defaultDuration, setDefaultDuration] = useState(24);
  const [autoBanEnabled, setAutoBanEnabled] = useState(false);

  // Image processing settings
  const [ditheringEnabled, setDitheringEnabled] = useState(true);
  const [sharpenSigma, setSharpenSigma] = useState(1.0);
  const [saturationMultiplier, setSaturationMultiplier] = useState(1.15);
  const [contrastMultiplier, setContrastMultiplier] = useState(1.2);
  const [gamma, setGamma] = useState(2.2);

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

      // Image processing settings
      setDitheringEnabled(data.ditheringEnabled ?? true);
      setSharpenSigma(data.sharpenSigma ?? 1.0);
      setSaturationMultiplier(data.saturationMultiplier ?? 1.15);
      setContrastMultiplier(data.contrastMultiplier ?? 1.2);
      setGamma(data.gamma ?? 2.2);
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

        // Image processing settings
        ditheringEnabled: ditheringEnabled,
        sharpenSigma: sharpenSigma,
        saturationMultiplier: saturationMultiplier,
        contrastMultiplier: contrastMultiplier,
        gamma: gamma,
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

        <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

        <h2 style={{ marginBottom: '1.5rem' }}>Image Processing Settings</h2>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={ditheringEnabled}
              onChange={(e) => setDitheringEnabled(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 'bold' }}>Enable Dithering</span>
          </label>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', marginLeft: '1.5rem' }}>
            Apply Floyd-Steinberg dithering for better color gradients on e-ink display
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Sharpen Sigma: {sharpenSigma.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={sharpenSigma}
            onChange={(e) => setSharpenSigma(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Sharpening strength (0 = disabled, 1-3 = mild to strong). Recommended: 1.0
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Saturation: {saturationMultiplier.toFixed(2)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.05"
            value={saturationMultiplier}
            onChange={(e) => setSaturationMultiplier(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Color saturation multiplier (1.0 = original, &gt;1.0 = more vivid). Recommended: 1.15
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Contrast: {contrastMultiplier.toFixed(2)}x
          </label>
          <input
            type="range"
            min="0.8"
            max="2.0"
            step="0.1"
            value={contrastMultiplier}
            onChange={(e) => setContrastMultiplier(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Contrast multiplier (1.0 = original, &gt;1.0 = more contrast). Recommended: 1.2
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Gamma: {gamma.toFixed(2)}
          </label>
          <input
            type="range"
            min="1.0"
            max="3.0"
            step="0.1"
            value={gamma}
            onChange={(e) => setGamma(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Gamma correction for better midtone rendering. Recommended: 2.2
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
