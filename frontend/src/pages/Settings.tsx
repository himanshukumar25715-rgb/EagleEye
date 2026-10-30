import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, Shield, Bell, HardDrive, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../api/client';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState({
    weapon_confidence: '0.50',
    weapon_cooldown_sec: '30',
    fight_confidence: '0.60',
    fight_cooldown_sec: '10',
    unattended_bag_radius_px: '150',
    unattended_bag_seconds: '60',
    crowd_threshold: '15',
    crowd_duration_sec: '10',
    video_retention_days: '30',
    evidence_retention_days: '90',
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await apiRequest<any[]>('/settings');
        const map: any = {};
        data.forEach((item) => {
          map[item.key] = JSON.parse(item.value_json);
        });
        setSettings((prev) => ({ ...prev, ...map }));
      } catch {
        // Fallback default
      }
    }
    loadSettings();
  }, []);

  const handleChange = (key: string, val: string) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      for (const [key, value] of Object.entries(settings)) {
        await apiRequest('/settings', {
          method: 'PUT',
          body: JSON.stringify({
            key,
            value_json: JSON.stringify(value),
            scope: 'global',
          }),
        });
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (e: any) {
      alert(`Error saving settings: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-brand-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-brand-yellow" />
          <span>System & Detection Tuning</span>
        </h2>
        <p className="text-sm text-brand-textMuted mt-1">
          Adjust false-alarm filters, AI confidence thresholds, and storage retention policies (Admin restricted).
        </p>
      </div>

      {success && (
        <div className="p-3 bg-brand-card border border-brand-yellow rounded-lg text-xs font-bold text-brand-yellow flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-brand-yellow" />
          <span>Surveillance parameters successfully saved and propagated to CV workers!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* CV Rules Tuning */}
        <div className="p-5 rounded-xl bg-brand-card border border-brand-border space-y-4">
          <h3 className="text-sm font-bold text-brand-white flex items-center gap-2 border-b border-brand-border pb-3">
            <Shield className="w-4 h-4 text-brand-yellow" />
            Detection Rules & Verification Sensitivity (Section 9.2)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-brand-textMuted font-semibold mb-1">
                Weapon Detection Confidence (0.30 - 0.95)
              </label>
              <input
                type="number"
                step="0.05"
                min="0.30"
                max="0.95"
                value={settings.weapon_confidence}
                onChange={(e) => handleChange('weapon_confidence', e.target.value)}
                className="w-full px-3 py-2 bg-brand-darkest border border-brand-border rounded-lg text-brand-white focus:outline-none focus:border-brand-yellow"
              />
              <span className="text-[10px] text-brand-textMuted mt-1 block">Default: 0.50 with 3/5 multi-frame persistence</span>
            </div>

            <div>
              <label className="block text-brand-textMuted font-semibold mb-1">
                Weapon Track Cooldown (seconds)
              </label>
              <input
                type="number"
                value={settings.weapon_cooldown_sec}
                onChange={(e) => handleChange('weapon_cooldown_sec', e.target.value)}
                className="w-full px-3 py-2 bg-brand-darkest border border-brand-border rounded-lg text-brand-white focus:outline-none focus:border-brand-yellow"
              />
              <span className="text-[10px] text-brand-textMuted mt-1 block">Prevents re-triggering for the same person/track</span>
            </div>

            <div>
              <label className="block text-brand-textMuted font-semibold mb-1">
                Fight / Violence Score Threshold (0.40 - 0.90)
              </label>
              <input
                type="number"
                step="0.05"
                value={settings.fight_confidence}
                onChange={(e) => handleChange('fight_confidence', e.target.value)}
                className="w-full px-3 py-2 bg-brand-darkest border border-brand-border rounded-lg text-brand-white focus:outline-none focus:border-brand-yellow"
              />
              <span className="text-[10px] text-brand-textMuted mt-1 block">Averaged over 2.0s temporal motion window</span>
            </div>

            <div>
              <label className="block text-brand-textMuted font-semibold mb-1">
                Unattended Bag Stationary Radius (pixels)
              </label>
              <input
                type="number"
                value={settings.unattended_bag_radius_px}
                onChange={(e) => handleChange('unattended_bag_radius_px', e.target.value)}
                className="w-full px-3 py-2 bg-brand-darkest border border-brand-border rounded-lg text-brand-white focus:outline-none focus:border-brand-yellow"
              />
              <span className="text-[10px] text-brand-textMuted mt-1 block">Radius within which person must be absent</span>
            </div>

            <div>
              <label className="block text-brand-textMuted font-semibold mb-1">
                Unattended Bag Timeout (seconds)
              </label>
              <input
                type="number"
                value={settings.unattended_bag_seconds}
                onChange={(e) => handleChange('unattended_bag_seconds', e.target.value)}
                className="w-full px-3 py-2 bg-brand-darkest border border-brand-border rounded-lg text-brand-white focus:outline-none focus:border-brand-yellow"
              />
              <span className="text-[10px] text-brand-textMuted mt-1 block">Default: 60s (Configurable 30s to 5m)</span>
            </div>

            <div>
              <label className="block text-brand-textMuted font-semibold mb-1">
                Overcrowding Zone Threshold (person count)
              </label>
              <input
                type="number"
                value={settings.crowd_threshold}
                onChange={(e) => handleChange('crowd_threshold', e.target.value)}
                className="w-full px-3 py-2 bg-brand-darkest border border-brand-border rounded-lg text-brand-white focus:outline-none focus:border-brand-yellow"
              />
              <span className="text-[10px] text-brand-textMuted mt-1 block">Triggers if sustained for $\ge$ 10s</span>
            </div>
          </div>
        </div>

        {/* Retention Card */}
        <div className="p-5 rounded-xl bg-brand-card border border-brand-border space-y-4">
          <h3 className="text-sm font-bold text-brand-white flex items-center gap-2 border-b border-brand-border pb-3">
            <HardDrive className="w-4 h-4 text-brand-yellow" />
            Storage & Audit Retention
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-brand-textMuted font-semibold mb-1">
                Raw Footage Retention (days)
              </label>
              <input
                type="number"
                value={settings.video_retention_days}
                onChange={(e) => handleChange('video_retention_days', e.target.value)}
                className="w-full px-3 py-2 bg-brand-darkest border border-brand-border rounded-lg text-brand-white focus:outline-none focus:border-brand-yellow"
              />
            </div>

            <div>
              <label className="block text-brand-textMuted font-semibold mb-1">
                Flagged Evidence & SHA-256 Hashes Retention (days)
              </label>
              <input
                type="number"
                value={settings.evidence_retention_days}
                onChange={(e) => handleChange('evidence_retention_days', e.target.value)}
                className="w-full px-3 py-2 bg-brand-darkest border border-brand-border rounded-lg text-brand-white focus:outline-none focus:border-brand-yellow"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-brand-yellow hover:bg-brand-yellowHover text-white font-extrabold rounded-lg text-sm flex items-center gap-2 shadow transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </form>
    </div>
  );
};

