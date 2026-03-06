import { CONTENT_DB } from '../data/contentDB';

// Onboarding forced-choice weight mappings
// Each pick = [winner_id, loser_id] -> adjust tag weights
export const ONBOARDING_CARDS = [
  {
    id: 'card1',
    question: "Pick one to watch right now",
    label: "Comedy style",
    optionA: { id: 'C004', title: 'Gullak', platform: 'SonyLIV', desc: 'Warm family comedy set in small-town UP', tags: ['warm','Indian','family','Hindi'] },
    optionB: { id: 'C026', title: 'The Office US', platform: 'Netflix', desc: 'Dry workplace cringe comedy', tags: ['western','dry humour','workplace','English'] },
  },
  {
    id: 'card2',
    question: "Pick one to watch right now",
    label: "Drama tone",
    optionA: { id: 'D001', title: 'Scam 1992', platform: 'SonyLIV', desc: 'Gripping financial thriller based on true events', tags: ['gripping','plot-driven','intense','Indian'] },
    optionB: { id: 'D018', title: 'Fleabag', platform: 'Prime Video', desc: 'Intimate, sharp British dark comedy-drama', tags: ['character-driven','British','intimate','dark humour'] },
  },
  {
    id: 'card3',
    question: "Pick one to watch right now",
    label: "Documentary style",
    optionA: { id: 'T001', title: 'House of Secrets: Burari', platform: 'Netflix', desc: 'Dark Indian true crime documentary', tags: ['dark','true crime','India','intense'] },
    optionB: { id: 'T014', title: 'Kurzgesagt: Why Humans Run the World', platform: 'YouTube', desc: 'Beautiful animated science explainer', tags: ['educational','animated','science','light'] },
  },
  {
    id: 'card4',
    question: "Pick one to watch right now",
    label: "Stand-up style",
    optionA: { id: 'S001', title: 'Zakir Khan: Haq Se Single', platform: 'Prime Video', desc: 'Hindi, emotional, warm comedy about relationships', tags: ['Hindi','emotional','warm','Indian'] },
    optionB: { id: 'S013', title: 'John Mulaney: New in Town', platform: 'Netflix', desc: 'English, sharp storytelling comedy', tags: ['English','sharp','storytelling','western'] },
  },
  {
    id: 'card5',
    question: "Pick one to watch right now",
    label: "Travel content",
    optionA: { id: 'TR005', title: 'Visa2Explore: Northeast India', platform: 'YouTube', desc: 'Practical Indian travel + food tour, Hindi', tags: ['Hindi','practical','India','food'] },
    optionB: { id: 'TR017', title: 'Yes Theory: Saying Yes 24 Hours', platform: 'YouTube', desc: 'High-energy adventure, English', tags: ['English','adventure','high energy','western'] },
  },
  {
    id: 'card6',
    question: "Pick one to watch right now",
    label: "Reality content",
    optionA: { id: 'R001', title: 'Shark Tank India', platform: 'SonyLIV', desc: 'Business pitches, Indian entrepreneurs, Hindi', tags: ['business','informative','India','Hindi'] },
    optionB: { id: 'R011', title: 'Hot Ones: Shah Rukh Khan', platform: 'YouTube', desc: 'Celebrity interview, hot wings, pure fun', tags: ['entertainment','celebrity','fun','English'] },
  },
  {
    id: 'card7',
    question: "Pick one to watch right now",
    label: "Duration comfort",
    optionA: { id: 'D001', title: 'A 42-min drama episode', platform: '', desc: 'Something immersive you get lost in', tags: ['long','immersive','commitment'] },
    optionB: { id: 'T013', title: 'A 6-min animated explainer', platform: '', desc: 'Quick, punchy — done before the meal', tags: ['short','quick','snack'] },
  },
  {
    id: 'card8',
    question: "Pick one to watch right now",
    label: "Default mood",
    optionA: { id: 'mood_laugh', title: 'Something that makes me laugh', platform: '', desc: 'Comedy, light, fun energy', tags: ['comedy','light','fun','laugh'] },
    optionB: { id: 'mood_think', title: 'Something that makes me think', platform: '', desc: 'Documentary, drama, insight', tags: ['documentary','drama','insightful','think'] },
  },
];

// Build tag weight vector from onboarding picks
export function buildTagWeightsFromPicks(picks, mealDuration, language, vibe) {
  const weights = {};

  const bump = (tags, delta) => {
    tags.forEach(tag => { weights[tag] = (weights[tag] || 0) + delta; });
  };

  picks.forEach(pick => {
    const card = ONBOARDING_CARDS.find(c => c.id === pick.cardId);
    if (!card) return;
    const chosen = pick.choice === 'A' ? card.optionA : card.optionB;
    const rejected = pick.choice === 'A' ? card.optionB : card.optionA;
    bump(chosen.tags, 2);
    bump(rejected.tags, -1);
  });

  // Duration signal
  const durationMap = { 'under15': 'short', '15-25': 'short', '25-35': 'standard', '35-45': 'long' };
  const durTag = durationMap[mealDuration] || 'standard';
  bump([durTag], 3);

  // Language signal
  if (language === 'hindi') bump(['Hindi'], 4);
  else if (language === 'english') bump(['English'], 4);
  else { bump(['Hindi'], 2); bump(['English'], 2); }

  // Vibe signal
  const vibeMap = {
    decompress: ['light','fun','warm','comedy'],
    interesting: ['educational','informative','insightful','think'],
    laugh: ['comedy','funny','light','laugh'],
    whatever: [],
  };
  bump(vibeMap[vibe] || [], 2);

  return weights;
}

// Genre weights derived from tag weights
export function deriveGenreWeights(tagWeights) {
  const genreTagMap = {
    'Comedy / Sitcom': ['comedy','warm','light','fun','funny','sitcom'],
    'Stand-up Comedy': ['comedy','funny','standup','laugh'],
    'True Crime / Documentary': ['documentary','educational','dark','true crime','informative','think'],
    'Drama': ['drama','gripping','intense','plot-driven'],
    'Travel / Lifestyle': ['travel','food','lifestyle','scenic','adventure'],
    'Reality / Talk Show': ['reality','celebrity','entertainment','business','inspiring'],
  };

  const gw = {};
  Object.entries(genreTagMap).forEach(([genre, tags]) => {
    gw[genre] = tags.reduce((sum, tag) => sum + (tagWeights[tag] || 0), 0);
  });
  return gw;
}

// Duration fit score (0-100)
function durationFitScore(contentDuration, mealDuration) {
  const targets = { under15: 13, '15-25': 20, '25-35': 30, '35-45': 40 };
  const target = targets[mealDuration] || 25;
  const diff = Math.abs(contentDuration - target);
  if (diff <= 5) return 100;
  if (diff <= 10) return 85;
  if (diff <= 15) return 70;
  if (diff <= 20) return 55;
  return Math.max(0, 40 - diff);
}

// Tag match score (0-100)
function tagMatchScore(content, tagWeights) {
  if (!tagWeights || Object.keys(tagWeights).length === 0) return 50;
  const totalWeight = content.tags.reduce((sum, tag) => {
    return sum + Math.max(0, tagWeights[tag] || 0);
  }, 0);
  return Math.min(100, (totalWeight / content.tags.length) * 20);
}

// Language filter
function languageMatch(content, languagePref) {
  if (!languagePref || languagePref === 'both') return true;
  if (languagePref === 'hindi') return content.language.includes('Hindi');
  if (languagePref === 'english') return content.language.includes('English');
  return true;
}

// Main scoring function
function scoreContent(content, profile, genreWeights) {
  const qualityWeight = 0.25;
  const durationWeight = 0.25;
  const tagWeight = 0.25;
  const genreWeight = 0.15;
  const noveltyWeight = 0.10;

  const qualityScore = content.qualityScore;
  const durScore = durationFitScore(content.duration, profile.mealDuration);
  const tagScore = tagMatchScore(content, profile.tagWeights);
  const genreScore = Math.min(100, 50 + (genreWeights[content.genre] || 0) * 5);
  
  // Novelty: penalise recently watched
  const recentHistory = (profile.history || []).slice(0, 20);
  const noveltyScore = recentHistory.includes(content.id) ? 0 : 100;

  // Feedback boost/penalty
  const feedback = (profile.feedback || {})[content.id];
  const feedbackBoost = feedback === 'up' ? 15 : feedback === 'down' ? -30 : 0;

  const total = (
    qualityScore * qualityWeight +
    durScore * durationWeight +
    tagScore * tagWeight +
    genreScore * genreWeight +
    noveltyScore * noveltyWeight +
    feedbackBoost
  );

  return { ...content, _score: Math.round(total), _durScore: durScore, _tagScore: tagScore };
}

// Get top N candidates for AI or return final 5 for hardcoded mode
export function getRecommendations(profile, mood = null, count = 5, forAI = false) {
  if (!profile || !profile.completed) return [];

  // Always read fresh history/feedback from localStorage to avoid stale closures
  let freshProfile = profile;
  try {
    const raw = localStorage.getItem('mealtime_profile');
    if (raw) freshProfile = { ...profile, ...JSON.parse(raw) };
  } catch {}

  const genreWeights = deriveGenreWeights(freshProfile.tagWeights || {});
  
  // Apply mood override
  const moodGenreBoost = {
    laugh: { 'Comedy / Sitcom': 30, 'Stand-up Comedy': 25 },
    think: { 'True Crime / Documentary': 25, 'Drama': 15 },
    chill: { 'Travel / Lifestyle': 20, 'Reality / Talk Show': 15, 'Comedy / Sitcom': 10 },
    anything: {},
  };
  if (mood && moodGenreBoost[mood]) {
    Object.entries(moodGenreBoost[mood]).forEach(([genre, boost]) => {
      genreWeights[genre] = (genreWeights[genre] || 0) + boost;
    });
  }

  // Filter by language
  const filtered = CONTENT_DB.filter(c => languageMatch(c, freshProfile.language));

  // Score all
  const scored = filtered.map(c => scoreContent(c, freshProfile, genreWeights));

  // Sort by score — add small jitter so Refresh gives varied results
  scored.sort((a, b) => {
    const jitter = Math.random() * 6 - 3; // ±3 point random nudge
    return (b._score + jitter) - a._score;
  });

  if (forAI) return scored.slice(0, 15); // top 15 candidates for AI to pick from
  return scored.slice(0, count);
}

// Hardcoded reason line from score components
export function buildReasonLine(content, profile) {
  const parts = [];
  
  // Genre label
  const genreShort = {
    'Comedy / Sitcom': 'Comedy',
    'Stand-up Comedy': 'Stand-up',
    'True Crime / Documentary': 'Documentary',
    'Drama': 'Drama',
    'Travel / Lifestyle': 'Travel',
    'Reality / Talk Show': 'Reality',
  };
  parts.push(genreShort[content.genre] || content.genre);

  // Duration bucket
  if (content.duration <= 15) parts.push('Quick watch');
  else if (content.duration <= 30) parts.push('Fits your meal');
  else parts.push(`${content.duration} min`);

  // Quality signal
  if (content.qualityScore >= 90) parts.push('Critically loved');
  else if (content.qualityScore >= 80) parts.push('Highly rated');

  // Language
  if (content.language === 'Hindi') parts.push('Hindi');
  else if (content.language === 'English') parts.push('English');

  return parts.join(' · ');
}
