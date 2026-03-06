import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { validateApiKey } from '../engine/claudeAPI';
import { CONTENT_DB } from '../data/contentDB';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();
  const { profile, settings, setSettings, resetProfile } = useUserStore();
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey || '');
  const [validating, setValidating] = useState(false);
  const [keyStatus, setKeyStatus] = useState('');
  const [showReset, setShowReset] = useState(false);

  const handleToggleAI = () => {
    if (settings.aiEnabled) {
      setSettings({ aiEnabled: false });
      setKeyStatus('');
    } else {
      setSettings({ aiEnabled: true });
    }
  };

  const handleSaveKey = async () => {
    if (!apiKeyInput.trim()) return;
    setValidating(true);
    setKeyStatus('');
    const result = await validateApiKey(apiKeyInput.trim());
    setValidating(false);
    if (result.valid) {
      setSettings({ apiKey: apiKeyInput.trim(), aiEnabled: true });
      setKeyStatus('valid');
    } else {
      setKeyStatus('invalid:' + (result.error || 'Invalid key'));
    }
  };

  const handleReset = () => {
    resetProfile();
    navigate('/onboarding');
  };

  const historyItems = (profile.history || []).slice(0, 10).map(id =>
    CONTENT_DB.find(c => c.id === id)
  ).filter(Boolean);

  const likedItems = Object.entries(profile.feedback || {})
    .filter(([, v]) => v === 'up')
    .map(([id]) => CONTENT_DB.find(c => c.id === id))
    .filter(Boolean)
    .slice(0, 5);

  const topGenres = profile.tasteProfile?.topGenres || [];
  const summary = profile.tasteProfile?.summary || null;

  return (
    <div className="settings-root noise">
      <header className="settings-header">
        <button className="settings-back" onClick={() => navigate('/home')}>
          ← Back
        </button>
        <h1 className="settings-title">Settings</h1>
        <div />
      </header>

      <div className="settings-body">

        {/* Taste Profile */}
        <section className="settings-section fade-up">
          <h2 className="settings-section-title">Your Taste Profile</h2>
          {summary ? (
            <div className="profile-summary">
              <p className="profile-summary-text">{summary}</p>
              {topGenres.length > 0 && (
                <div className="profile-genres">
                  {topGenres.map(g => <span key={g} className="profile-genre-tag">{g}</span>)}
                </div>
              )}
            </div>
          ) : (
            <div className="profile-summary">
              <p className="profile-summary-text" style={{fontStyle:'normal', color:'var(--text3)'}}>
                Profile built from your onboarding picks.
                {profile.language && <> Language: <strong style={{color:'var(--text2)'}}>{profile.language}</strong>.</>}
                {profile.vibe && <> Default vibe: <strong style={{color:'var(--text2)'}}>{profile.vibe}</strong>.</>}
              </p>
              {profile.mealDuration && (
                <p className="profile-duration">Meal window: <strong>{profile.mealDuration} min</strong></p>
              )}
            </div>
          )}
          <button
            className="settings-redo-btn"
            onClick={() => { resetProfile(); navigate('/onboarding'); }}
          >
            Redo onboarding
          </button>
        </section>

        {/* AI Mode */}
        <section className="settings-section fade-up" style={{ animationDelay: '0.08s' }}>
          <div className="settings-section-header">
            <h2 className="settings-section-title">AI Mode</h2>
            <Toggle on={settings.aiEnabled} onToggle={handleToggleAI} />
          </div>
          <p className="settings-section-desc">
            {settings.aiEnabled
              ? 'Claude picks your 5 and writes personalised reason lines. Uses your API key — typically &lt;$0.01 per session.'
              : 'Hardcoded scoring mode. Works offline. No API key needed.'}
          </p>

          {settings.aiEnabled && (
            <div className="api-key-section">
              <label className="api-key-label">Claude API Key</label>
              <div className="api-key-row">
                <input
                  type="password"
                  className="api-key-input"
                  placeholder="sk-ant-..."
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                />
                <button
                  className="api-key-save"
                  onClick={handleSaveKey}
                  disabled={validating || !apiKeyInput.trim()}
                >
                  {validating ? '…' : 'Save'}
                </button>
              </div>
              {keyStatus === 'valid' && (
                <p className="api-key-status valid">✓ Key saved and verified</p>
              )}
              {keyStatus.startsWith('invalid:') && (
                <p className="api-key-status invalid">✗ {keyStatus.replace('invalid:', '')}</p>
              )}
              {settings.apiKey && keyStatus === '' && (
                <p className="api-key-status saved">Key saved. AI mode active.</p>
              )}
              <p className="api-key-note">
                Get your key at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>.
                Your key is stored only in your browser.
              </p>
            </div>
          )}
        </section>

        {/* Watch History */}
        {historyItems.length > 0 && (
          <section className="settings-section fade-up" style={{ animationDelay: '0.12s' }}>
            <h2 className="settings-section-title">Recently Watched</h2>
            <div className="settings-list">
              {historyItems.map(item => (
                <div key={item.id} className="settings-list-item">
                  <span className="settings-list-title">{item.title}</span>
                  <span className="settings-list-meta">{item.platform} · {item.duration}min</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Liked */}
        {likedItems.length > 0 && (
          <section className="settings-section fade-up" style={{ animationDelay: '0.16s' }}>
            <h2 className="settings-section-title">You Liked</h2>
            <div className="settings-list">
              {likedItems.map(item => (
                <div key={item.id} className="settings-list-item">
                  <span className="settings-list-title">👍 {item.title}</span>
                  <span className="settings-list-meta">{item.genre}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reset */}
        <section className="settings-section settings-section-danger fade-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="settings-section-title" style={{ color: 'var(--red)' }}>Reset</h2>
          <p className="settings-section-desc">Clears your profile, history, and feedback. You'll redo onboarding.</p>
          {!showReset ? (
            <button className="settings-danger-btn" onClick={() => setShowReset(true)}>Reset everything</button>
          ) : (
            <div className="settings-confirm">
              <p className="settings-confirm-text">Are you sure? This can't be undone.</p>
              <div className="settings-confirm-btns">
                <button className="settings-danger-btn confirm" onClick={handleReset}>Yes, reset</button>
                <button className="btn-ghost" onClick={() => setShowReset(false)}>Cancel</button>
              </div>
            </div>
          )}
        </section>

        <p className="settings-version">MealTime v1.0 · 200 curated content pieces</p>
      </div>
    </div>
  );
}

function Toggle({ on, onToggle }) {
  return (
    <button
      className={`toggle ${on ? 'on' : ''}`}
      onClick={onToggle}
      role="switch"
      aria-checked={on}
    >
      <span className="toggle-thumb" />
    </button>
  );
}
