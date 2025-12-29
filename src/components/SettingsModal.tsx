import { useSettings } from '../contexts/SettingsContext';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const { settings, setColorblindMode } = useSettings();

  return (
    <div className="modal-overlay" onClick={() => onClose()}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Settings</h2>

        <div className="settings-option">
          <label className="settings-label">
            <span>Colorblind Mode</span>
            <span className="settings-description">Use blue & orange instead of green & yellow</span>
          </label>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.colorblindMode}
              onChange={(e) => setColorblindMode(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <button className="btn-glass" onClick={() => onClose()}>Close</button>
      </div>
    </div>
  );
}
