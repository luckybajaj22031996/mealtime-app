import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { getRecommendations, buildReasonLine } from '../engine/scorer';
import { getAIRecommendations } from '../engine/claudeAPI';
import { validateApiKey } from '../engine/claudeAPI';
import { CONTENT_DB } from '../data/contentDB';
import './Home.css';

const MOODS = [
  { id: 'anything', label: 'Anything', emoji: '✨' },
  { id: 'laugh', label: 'Make me laugh', emoji: '😂' },
  { id: 'think', label: 'Make me think', emoji: '🧠' },
  { id: 'chill', label: 'Just chill', emoji: '😌' },
];

export default function Home() {
  const navigate = useNavigate();
  const { profile, settings, setSettings, addToHistory, setFeedback } = useUserStore();
  const [mood, setMood] = useState('anything');
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiUsed, setAiUsed] = useState(false);

  // AI key input state — inline on home page
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [keyValidating, setKeyValidating] = useState(false);
  const [keyStatus, setKeyStatus] = useState(''); // 'valid' | 'invalid' | ''

  // Refs so loadRecs never has stale closures
  const profileRef = useRef(profile);
  const settingsRef = useRef(settings);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const loadRecs = useCallback(async (selectedMood, overrideSettings) => {
    const currentProfile = profileRef.current;
    const currentSettings = overrideSettings || settingsRef.current;

    setLoading(true);
    setError('');
    setAiUsed(false);

    const useAI = currentSettings.aiEnabled && currentSettings.apiKey;
    const candidates = getRecommendations(currentProfile, selectedMood, 5, useAI);

    if (useAI && candidates.length >= 5) {
      try {
        const aiPicks = await getAIRecommendations(currentSettings.apiKey, candidates, currentProfile, selectedMood);
        const enriched = aiPicks.map(pick => {
          const content = CONTENT_DB.find(c => c.id === pick.id);
          return content ? {
            ...content,
            _reason: pick.reason,
            _score: candidates.find(c => c.id === pick.id)?._score || 0,
            _userFeedback: (currentProfile.feedback || {})[pick.id] || null,
          } : null;
        }).filter(Boolean);

        if (enriched.length >= 3) {
          setRecs(enriched.slice(0, 5));
          setAiUsed(true);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('AI recs failed, falling back:', e.message);
      }
    }

    const withReasons = candidates.map(c => ({
      ...c,
      _reason: buildReasonLine(c, currentProfile),
      _userFeedback: (currentProfile.feedback || {})[c.id] || null,
    }));
    setRecs(withReasons);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRecs(mood);
  }, [mood, loadRecs]);

  const handleRefresh = () => loadRecs(mood);

  const handleMoodChange = (newMood) => setMood(newMood);

  // Toggle AI — if no key saved, show inline input instead of just flipping
  const handleToggleAI = () => {
    if (settings.aiEnabled) {
      // Turn off
      setSettings({ aiEnabled: false });
      setShowKeyInput(false);
      setKeyStatus('');
      setTimeout(() => loadRecs(mood), 50);
    } else {
      // Turn on — show key input if no key saved yet
      if (settings.apiKey) {
        setSettings({ aiEnabled: true });
        setTimeout(() => loadRecs(mood, { ...settingsRef.current, aiEnabled: true }), 50);
      } else {
        setShowKeyInput(true);
      }
    }
  };

  const handleSaveKey = async () => {
    if (!keyInput.trim()) return;
    setKeyValidating(true);
    setKeyStatus('');
    const result = await validateApiKey(keyInput.trim());
    setKeyValidating(false);
    if (result.valid) {
      const newSettings = { apiKey: keyInput.trim(), aiEnabled: true };
      setSettings(newSettings);
      setKeyStatus('valid');
      setShowKeyInput(false);
      setKeyInput('');
      setTimeout(() => loadRecs(mood, { ...settingsRef.current, ...newSettings }), 50);
    } else {
      setKeyStatus('invalid');
    }
  };

  const handleWatch = (content) => {
    addToHistory(content.id);
    window.open(content.url, '_blank', 'noopener noreferrer');
  };

  const handleFeedback = (contentId, value) => {
    setFeedback(contentId, value);
    setRecs(prev => prev.map(r =>
      r.id === contentId ? { ...r, _userFeedback: value } : r
    ));
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const aiActive = settings.aiEnabled && settings.apiKey;

  return (
    <div className="home-root noise">
      {/* Header */}
      <header className="home-header">
        <div className="home-logo">🍽 MealTime</div>
        <div className="home-header-right">
          <div className="home-ai-toggle">
            <span className={`home-ai-label ${aiActive ? 'ai-on' : ''}`}>AI</span>
            <button
              className={`toggle-small ${aiActive ? 'on' : ''}`}
              onClick={handleToggleAI}
              title={aiActive ? 'AI on — click to turn off' : 'Turn on AI mode'}
            >
              <span className="toggle-small-thumb" />
            </button>
          </div>
          <button className="home-settings-btn" onClick={() => navigate('/settings')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Inline API key input */}
      {showKeyInput && (
        <div className="home-key-panel fade-in">
          <p className="home-key-title">Enter your Claude API key to enable AI mode</p>
          <div className="home-key-row">
            <input
              type="password"
              className="home-key-input"
              placeholder="sk-ant-..."
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
              autoFocus
            />
            <button
              className="home-key-save"
              onClick={handleSaveKey}
              disabled={keyValidating || !keyInput.trim()}
            >
              {keyValidating ? '…' : 'Save'}
            </button>
            <button className="home-key-cancel" onClick={() => { setShowKeyInput(false); setKeyStatus(''); }}>
              ✕
            </button>
          </div>
          {keyStatus === 'invalid' && (
            <p className="home-key-error">Invalid key — check and try again</p>
          )}
          <p className="home-key-note">Get your key at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">console.anthropic.com</a></p>
        </div>
      )}

      {/* Greeting */}
      <div className="home-greeting fade-up">
        <p className="home-greeting-text">{greeting()}. What's the vibe?</p>
      </div>

      {/* Mood filter */}
      <div className="home-mood-row">
        {MOODS.map(m => (
          <button
            key={m.id}
            className={`mood-btn ${mood === m.id ? 'active' : ''}`}
            onClick={() => handleMoodChange(m.id)}
          >
            <span className="mood-emoji">{m.emoji}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* AI badge */}
      {aiUsed && (
        <div className="home-ai-badge fade-in">
          <span className="ai-dot" />
          AI-powered picks · tuned to your taste
        </div>
      )}

      {/* Recommendations */}
      <div className="home-recs-section">
        <div className="home-recs-header">
          <h2 className="home-recs-title">
            {loading ? 'Finding your picks…' : '5 picks for this meal'}
          </h2>
          {!loading && (
            <button className="home-refresh-btn" onClick={handleRefresh}>↻ Refresh</button>
          )}
        </div>

        {loading && (
          <div className="home-loading">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="rec-skeleton">
                <div className="skeleton" style={{height:20, width:'60%', marginBottom:8}} />
                <div className="skeleton" style={{height:14, width:'40%', marginBottom:12}} />
                <div className="skeleton" style={{height:14, width:'90%'}} />
              </div>
            ))}
          </div>
        )}

        {error && <p className="home-error">{error}</p>}

        {!loading && !error && (
          <div className="home-recs-list">
            {recs.map((rec, idx) => (
              <RecCard
                key={rec.id}
                rec={rec}
                index={idx}
                onWatch={handleWatch}
                onFeedback={handleFeedback}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecCard({ rec, index, onWatch, onFeedback }) {
  const feedback = rec._userFeedback;

  const genreEmoji = {
    'Comedy / Sitcom': '😄',
    'Stand-up Comedy': '🎤',
    'True Crime / Documentary': '🔍',
    'Drama': '🎭',
    'Travel / Lifestyle': '✈️',
    'Reality / Talk Show': '📺',
  };

  const platformColor = {
    'Netflix': '#E50914',
    'Prime Video': '#00A8E0',
    'SonyLIV': '#4A90E2',
    'Disney+ Hotstar': '#8B5CF6',
    'Apple TV+': '#888',
    'YouTube': '#FF0000',
    'BBC/Streaming': '#888',
    'JioHotstar': '#8B5CF6',
  };

  return (
    <div className="rec-card fade-up" style={{ animationDelay: `${index * 0.07}s`, opacity: 0 }}>
      <div className="rec-card-top">
        <div className="rec-card-left">
          <div className="rec-index">{index + 1}</div>
          <div className="rec-info">
            <h3 className="rec-title">{rec.title}</h3>
            <div className="rec-meta">
              <span className="rec-platform" style={{ color: platformColor[rec.platform] || '#888' }}>
                {rec.platform}
              </span>
              <span className="rec-dot">·</span>
              <span className="rec-duration">{rec.duration} min</span>
              <span className="rec-dot">·</span>
              <span className="rec-genre">{genreEmoji[rec.genre]}</span>
            </div>
          </div>
        </div>
        <button className="rec-watch-btn" onClick={() => onWatch(rec)} title="Watch now">▶</button>
      </div>
      <p className="rec-reason">{rec._reason}</p>
      <div className="rec-card-footer">
        <div className="rec-tags">
          {rec.tags.slice(0, 3).map(tag => (
            <span key={tag} className="rec-tag">{tag}</span>
          ))}
        </div>
        <div className="rec-feedback">
          <button
            className={`rec-fb-btn ${feedback === 'up' ? 'active-up' : ''}`}
            onClick={() => onFeedback(rec.id, feedback === 'up' ? null : 'up')}
          >👍</button>
          <button
            className={`rec-fb-btn ${feedback === 'down' ? 'active-down' : ''}`}
            onClick={() => onFeedback(rec.id, feedback === 'down' ? null : 'down')}
          >👎</button>
        </div>
      </div>
    </div>
  );
}
