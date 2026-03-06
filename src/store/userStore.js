import { useState, createContext, useContext, useCallback } from 'react';

const UserContext = createContext(null);

const DEFAULT_PROFILE = {
  completed: false,
  picks: [],
  mealDuration: null,
  language: null,
  vibe: null,
  tasteVector: null,
  tasteProfile: null,
  history: [],
  feedback: {},
  tagWeights: {},
  lastMood: null,        // persist mood across sessions
  sessionCount: 0,       // track total sessions for decay calculations
  lastSessionTime: null,  // detect lunch vs dinner
  lastWatched: null,      // track what was last clicked for post-watch feedback
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

// Detect meal context from current time
export function getMealContext() {
  const h = new Date().getHours();
  if (h >= 7 && h < 10) return { meal: 'breakfast', greeting: 'Good morning' };
  if (h >= 11 && h < 15) return { meal: 'lunch', greeting: 'Lunchtime' };
  if (h >= 18 && h < 22) return { meal: 'dinner', greeting: 'Dinner time' };
  if (h >= 15 && h < 18) return { meal: 'snack', greeting: 'Good afternoon' };
  return { meal: 'late-night', greeting: 'Late night' };
}

export function UserProvider({ children }) {
  const [profile, setProfileState] = useState(loadFromStorage);
  const [settings, setSettingsState] = useState(loadSettings);

  const setProfile = useCallback((updater) => {
    setProfileState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      localStorage.setItem('mealtime_profile', JSON.stringify(next));
      return next;
    });
  }, []);

  const setSettings = useCallback((updater) => {
    setSettingsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      localStorage.setItem('mealtime_settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const resetProfile = useCallback(() => {
    localStorage.removeItem('mealtime_profile');
    setProfileState({ ...DEFAULT_PROFILE });
  }, []);

  const addToHistory = useCallback((contentId) => {
    setProfile(prev => ({
      ...prev,
      history: [contentId, ...prev.history.filter(id => id !== contentId)].slice(0, 200),
      lastWatched: contentId,
    }));
  }, [setProfile]);

  const setFeedback = useCallback((contentId, value) => {
    setProfile(prev => ({
      ...prev,
      feedback: { ...prev.feedback, [contentId]: value },
    }));
  }, [setProfile]);

  // Track session start
  const startSession = useCallback(() => {
    setProfile(prev => ({
      ...prev,
      sessionCount: (prev.sessionCount || 0) + 1,
      lastSessionTime: new Date().toISOString(),
      lastWatched: null, // reset for new session
    }));
  }, [setProfile]);

  // Persist mood
  const setLastMood = useCallback((mood) => {
    setProfile(prev => ({ ...prev, lastMood: mood }));
  }, [setProfile]);

  // Clear last watched (after feedback is given or dismissed)
  const clearLastWatched = useCallback(() => {
    setProfile(prev => ({ ...prev, lastWatched: null }));
  }, [setProfile]);

  return (
    <UserContext.Provider value={{
      profile, setProfile, settings, setSettings, resetProfile,
      addToHistory, setFeedback, startSession, setLastMood, clearLastWatched,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserStore() {
  return useContext(UserContext);
}
