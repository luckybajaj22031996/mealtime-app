import { useState, useEffect, createContext, useContext } from 'react';

const UserContext = createContext(null);

const DEFAULT_PROFILE = {
  completed: false,
  picks: [],
  mealDuration: null,
  language: null,
  vibe: null,
  tasteVector: null,
  tasteProfile: null, // AI-generated narrative
  history: [],       // watched content IDs
  feedback: {},      // contentId -> 'up' | 'down'
  tagWeights: {},    // tag -> weight float
};

function loadFromStorage() {
  try {
    const raw = localStorage.getItem('mealtime_profile');
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_PROFILE };
  } catch { return { ...DEFAULT_PROFILE }; }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem('mealtime_settings');
    return raw ? JSON.parse(raw) : { aiEnabled: false, apiKey: '' };
  } catch { return { aiEnabled: false, apiKey: '' }; }
}

export function UserProvider({ children }) {
  const [profile, setProfileState] = useState(loadFromStorage);
  const [settings, setSettingsState] = useState(loadSettings);

  const setProfile = (updater) => {
    setProfileState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      localStorage.setItem('mealtime_profile', JSON.stringify(next));
      return next;
    });
  };

  const setSettings = (updater) => {
    setSettingsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      localStorage.setItem('mealtime_settings', JSON.stringify(next));
      return next;
    });
  };

  const resetProfile = () => {
    localStorage.removeItem('mealtime_profile');
    setProfileState({ ...DEFAULT_PROFILE });
  };

  const addToHistory = (contentId) => {
    setProfile(prev => ({
      ...prev,
      history: [contentId, ...prev.history.filter(id => id !== contentId)].slice(0, 200),
    }));
  };

  const setFeedback = (contentId, value) => {
    setProfile(prev => ({
      ...prev,
      feedback: { ...prev.feedback, [contentId]: value },
    }));
  };

  return (
    <UserContext.Provider value={{ profile, setProfile, settings, setSettings, resetProfile, addToHistory, setFeedback }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserStore() {
  return useContext(UserContext);
}
