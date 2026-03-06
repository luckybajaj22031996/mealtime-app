import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { getRecommendations, buildReasonLine } from '../engine/scorer';
import { getAIRecommendations } from '../engine/claudeAPI';
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
  const { profile, settings, addToHistory, setFeedback } = useUserStore();
  const [mood, setMood] = useState('anything');
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiUsed, setAiUsed] = useState(false);

  const loadRecs = useCallback(async (selectedMood) => {
    setLoading(true);
    setError('');
    setAiUsed(false);

    const candidates = getRecommendations(profile, selectedMood, 5, settings.aiEnabled && settings.apiKey);

    if (settings.aiEnabled && settings.apiKey && candidates.length >= 5) {
      try {
        const aiPicks = await getAIRecommendations(settings.apiKey, candidates, profile, selectedMood);
        const enriched = aiPicks.map(pick => {
          const content = CONTENT_DB.find(c => c.id === pick.id);
          return content ? { ...content, _reason: pick.reason, _score: candidates.find(c=>c.id===pick.id)?._score || 0 } : null;
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

    // Hardcoded fallback
    const withReasons = candidates.map(c => ({
      ...c,
      _reason: buildReasonLine(c, profile),
    }));
    setRecs(withReasons);
    setLoading(false);
  }, [profile, settings]);

  useEffect(() => {
    loadRecs(mood);
  }, [mood, loadRecs]);

  const handleMoodChange = (newMood) => {
    setMood(newMood);
  };

  const handleRefresh = () => loadRecs(mood);

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

  return (
    <div className="home-root noise">
      {/* Header */}
      <header className="home-header">
        <div className="home-logo">🍽 MealTime</div>
        <button className="home-settings-btn" onClick={() => navigate('/settings')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </header>

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
            {loading ? 'Finding your picks…' : `5 picks for this meal`}
          </h2>
          {!loading && (
            <button className="home-refresh-btn" onClick={handleRefresh}>
              ↻ Refresh
            </button>
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
    'SonyLIV': '#00208A',
    'Disney+ Hotstar': '#1A0C4E',
    'Apple TV+': '#555',
    'YouTube': '#FF0000',
  };

  return (
    <div
      className="rec-card fade-up"
      style={{ animationDelay: `${index * 0.07}s`, opacity: 0 }}
    >
      <div className="rec-card-top">
        <div className="rec-card-left">
          <div className="rec-index">{index + 1}</div>
          <div className="rec-info">
            <h3 className="rec-title">{rec.title}</h3>
            <div className="rec-meta">
              <span
                className="rec-platform"
                style={{ color: platformColor[rec.platform] || '#888' }}
              >{rec.platform}</span>
              <span className="rec-dot">·</span>
              <span className="rec-duration">{rec.duration} min</span>
              <span className="rec-dot">·</span>
              <span className="rec-genre">{genreEmoji[rec.genre]} {rec.genre}</span>
            </div>
          </div>
        </div>
        <button
          className="rec-watch-btn"
          onClick={() => onWatch(rec)}
          title="Watch now"
        >
          ▶
        </button>
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
            title="I liked this"
          >👍</button>
          <button
            className={`rec-fb-btn ${feedback === 'down' ? 'active-down' : ''}`}
            onClick={() => onFeedback(rec.id, feedback === 'down' ? null : 'down')}
            title="Not for me"
          >👎</button>
        </div>
      </div>
    </div>
  );
}
