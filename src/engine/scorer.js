import { CONTENT_DB } from '../data/contentDB';

// Onboarding forced-choice weight mappings
export const ONBOARDING_CARDS = [
  {
    id: 'card1',
    question: "Which would you rather watch?",
    label: "Comedy style",
    optionA: { id: 'C004', title: 'Gullak', platform: 'SonyLIV', desc: 'Warm family comedy set in small-town UP', tags: ['warm','Indian','family','Hindi'] },
    optionB: { id: 'C026', title: 'The Office US', platform: 'Netflix', desc: 'Dry workplace cringe comedy', tags: ['western','dry humour','workplace','English'] },
  },
  {
    id: 'card2',
    question: "Which would you rather watch?",
    label: "Drama tone",
    optionA: { id: 'D001', title: 'Scam 1992', platform: 'SonyLIV', desc: 'Gripping financial thriller based on true events', tags: ['gripping','plot-driven','intense','Indian'] },
    optionB: { id: 'D018', title: 'Fleabag', platform: 'Prime Video', desc: 'Intimate, sharp British dark comedy-drama', tags: ['character-driven','British','intimate','dark humour'] },
  },
  {
    id: 'card3',
    question: "Which would you rather watch?",
    label: "Documentary style",
    optionA: { id: 'T001', title: 'House of Secrets: Burari', platform: 'Netflix', desc: 'Dark Indian true crime documentary', tags: ['dark','true crime','India','intense'] },
    optionB: { id: 'T014', title: 'Kurzgesagt: Why Humans Run the World', platform: 'YouTube', desc: 'Beautiful animated science explainer', tags: ['educational','animated','science','light'] },
  },
  {
    id: 'card4',
    question: "Which would you rather watch?",
    label: "Stand-up style",
    optionA: { id: 'S001', title: 'Zakir Khan: Haq Se Single', platform: 'Prime Video', desc: 'Hindi, emotional, warm comedy about relationships', tags: ['Hindi','emotional','warm','Indian'] },
    optionB: { id: 'S013', title: 'John Mulaney: New in Town', platform: 'Netflix', desc: 'English, sharp storytelling comedy', tags: ['English','sharp','storytelling','western'] },
  },
  {
    id: 'card5',
    question: "Which would you rather watch?",
    label: "Travel content",
    optionA: { id: 'TR005', title: 'Visa2Explore: Northeast India', platform: 'YouTube', desc: 'Practical Indian travel + food tour, Hindi', tags: ['Hindi','practical','India','food'] },
    optionB: { id: 'TR017', title: 'Yes Theory: Saying Yes 24 Hours', platform: 'YouTube', desc: 'High-energy adventure, English', tags: ['English','adventure','high energy','western'] },
  },
  {
    id: 'card6',
    question: "Which would you rather watch?",
    label: "Reality content",
    optionA: { id: 'R001', title: 'Shark Tank India', platform: 'SonyLIV', desc: 'Business pitches, Indian entrepreneurs, Hindi', tags: ['business','informative','India','Hindi'] },
    optionB: { id: 'R011', title: 'Hot Ones: Shah Rukh Khan', platform: 'YouTube', desc: 'Celebrity interview, hot wings, pure fun', tags: ['entertainment','celebrity','fun','English'] },
  },
  {
    id: 'card7',
    question: "Which would you rather watch?",
    label: "Duration comfort",
    optionA: { id: 'D001', title: 'A 42-min drama episode', platform: '', desc: 'Something immersive you get lost in', tags: ['long','immersive','commitment'] },
    optionB: { id: 'T013', title: 'A 6-min animated explainer', platform: '', desc: 'Quick, punchy — done before the meal', tags: ['short','quick','snack'] },
  },
  {
    id: 'card8',
    question: "Which would you rather watch?",
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
    // "skip" = no preference — don't adjust weights for this card
    if (pick.choice === 'skip') return;
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
    chill: ['light','fun','warm','comedy','scenic','nostalgic','gentle'],
    think: ['educational','informative','insightful','think','fascinating','science'],
    laugh: ['comedy','funny','light','laugh','fun','relatable'],
    anything: [],
  };
  bump(vibeMap[vibe] || [], 2);

  return weights;
}

// Genre weights — normalised to 0-100, averaged per tag to prevent tag-count bias
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
    const sum = tags.reduce((s, tag) => s + (tagWeights[tag] || 0), 0);
    gw[genre] = tags.length > 0 ? sum / tags.length : 0;
  });

  // Normalise to 0-100
  const values = Object.values(gw);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  Object.keys(gw).forEach(genre => {
    gw[genre] = Math.round(((gw[genre] - min) / range) * 100);
  });

  return gw;
}

// Duration fit — smooth Gaussian curve instead of step function
function durationFitScore(contentDuration, mealDuration) {
  const targets = { under15: 12, '15-25': 20, '25-35': 30, '35-45': 40 };
  const target = targets[mealDuration] || 25;
  const diff = contentDuration - target; // positive = too long, negative = too short

  // Asymmetric: content shorter than meal is less of a problem than content longer than meal
  // Too short: you can watch another one. Too long: you can't finish it.
  if (diff >= 0) {
    // Content is longer than meal window — penalise with sigma=10
    const sigma = 10;
    return Math.round(100 * Math.exp(-0.5 * (diff / sigma) ** 2));
  } else {
    // Content is shorter than meal window — gentler penalty with sigma=18
    // A 6-min video for a 30-min meal scores ~50 instead of ~6
    const sigma = 18;
    return Math.round(100 * Math.exp(-0.5 * (diff / sigma) ** 2));
  }
}

// Tag match — respects negative weights now
function tagMatchScore(content, tagWeights) {
  if (!tagWeights || Object.keys(tagWeights).length === 0) return 50;
  let total = 0;
  let count = 0;
  content.tags.forEach(tag => {
    const w = tagWeights[tag];
    if (w !== undefined) {
      total += w;
      count++;
    }
  });
  if (count === 0) return 40;
  const avg = total / count;
  return Math.max(0, Math.min(100, 50 + avg * 15));
}

// Language filter
function languageMatch(content, languagePref) {
  if (!languagePref || languagePref === 'both') return true;
  if (languagePref === 'hindi') return content.language.includes('Hindi');
  if (languagePref === 'english') return content.language.includes('English');
  return true;
}

// Cross-content learning: feedback propagates to matching tags
function applyFeedbackToTagWeights(baseWeights, feedback) {
  const weights = { ...baseWeights };
  const bump = (tags, delta) => {
    tags.forEach(tag => { weights[tag] = (weights[tag] || 0) + delta; });
  };

  Object.entries(feedback).forEach(([contentId, value]) => {
    const content = CONTENT_DB.find(c => c.id === contentId);
    if (!content) return;
    if (value === 'up') bump(content.tags, 0.5);
    else if (value === 'down') bump(content.tags, -0.8);
  });

  return weights;
}

// Scoring — rebalanced weights
function scoreContent(content, profile, genreWeights, enrichedTagWeights, mood) {
  const qualityWeight = 0.15;
  const durationWeight = 0.20;
  const tagWeight = 0.25;
  const genreWeight = 0.10;
  const noveltyWeight = 0.15;
  const moodWeight = 0.15;   // new: mood fit based on tags

  const qualityScore = content.qualityScore;
  const durScore = durationFitScore(content.duration, profile.mealDuration);
  const tagScore = tagMatchScore(content, enrichedTagWeights);
  const genreScore = genreWeights[content.genre] ?? 50;

  // Mood fit — scored per content based on its actual tags, not just genre
  const moodScore = computeMoodFit(content, mood);

  // Novelty — graduated penalty, not binary
  const history = (profile.history || []);
  const historyIndex = history.indexOf(content.id);
  let noveltyScore = 100;
  if (historyIndex !== -1) {
    if (historyIndex < 5) noveltyScore = 0;
    else if (historyIndex < 10) noveltyScore = 15;
    else if (historyIndex < 20) noveltyScore = 35;
    else noveltyScore = 60;
  }

  // Feedback boost — reduced, let tag learning do the work
  const feedback = (profile.feedback || {})[content.id];
  let feedbackBoost = 0;
  if (feedback === 'up') feedbackBoost = 10;
  else if (feedback === 'down') feedbackBoost = -25;

  const total = (
    qualityScore * qualityWeight +
    durScore * durationWeight +
    tagScore * tagWeight +
    genreScore * genreWeight +
    noveltyScore * noveltyWeight +
    moodScore * moodWeight +
    feedbackBoost
  );

  return {
    ...content,
    _score: Math.round(total),
    _durScore: durScore,
    _tagScore: tagScore,
    _genreScore: genreScore,
    _noveltyScore: noveltyScore,
    _moodScore: moodScore,
  };
}

// Tag-based mood scoring — each content piece scored 0-100 for mood fit
function computeMoodFit(content, mood) {
  if (!mood || mood === 'anything') return 50;

  const moodSignals = {
    laugh: {
      boost: ['funny','fun','comedy','hilarious','light','laugh','witty','cringe comedy',
              'comedy-drama','quirky','absurd','satire','dry humour','sharp','warm',
              'panel show','hot wings','comedy talk show','celebrity','relatable',
              'observational','clean comedy','food comedy','crowd interaction',
              'banter','self-aware','mockumentary','cringe'],
      penalty: ['dark','intense','crime','serial killer','murder','gripping','thriller',
                'psychological','shocking','investigative','kidnapping','corporate fraud',
                'educational','informative','science','documentary','explained','philosophy',
                'inspiring','business','startup','startups','entrepreneurship','motivation',
                'budget travel','solo travel','scenic','stunning visuals','drone',
                'profound','trauma','identity','unconventional','political thriller',
                'social commentary','economics','finance','award-winning','slow burn','dark comedy','scam','dark comedy drama'],
    },
    think: {
      boost: ['educational','informative','science','explained','history','philosophy',
              'mind-blowing','fascinating','thought-provoking','investigative','analytical',
              'gripping','intense','spy','thriller','drama','psychological','documentary',
              'social commentary','economics','finance','technology','startups','business',
              'inspiring','identity','unconventional','profound','smart','sharp writing',
              '4th wall','layered','corporate dystopia','political thriller','brilliant writing',
              'award-winning','based on true events','based on true story','facts','engaging'],
      penalty: ['funny','fun','comedy','hilarious','light','laugh','witty','quirky','absurd',
                'warm','relatable','cringe comedy','comedy-drama','panel show','hot wings',
                'comedy talk show','celebrity','gossip','compilation','challenge',
                'no thinking required','observational','clean comedy','crowd interaction',
                'food comedy','feel-good','feel good','heartwarming','scenic','budget travel',
                'food','street food','couple vlog','lifestyle','cafes','beaches'],
    },
    chill: {
      boost: ['warm','light','feel-good','gentle','scenic','calm','heartwarming','cozy',
              'nostalgic','nostalgia','family','feel good','optimism','uplifting','slice of life',
              'food','travel','street food','quiet','British countryside','lifestyle',
              'budget travel','adventure','fun','relatable','friendship','clean',
              'romantic','funny','couple vlog','beaches','cafes',
              'coming of age','siblings','banter','road trip'],
      penalty: ['dark','intense','crime','serial killer','murder','thriller','gripping',
                'shocking','psychological','corporate fraud','kidnapping','scam',
                'investigative','analytical','profound','trauma','corporate dystopia',
                'political thriller','raw','bold','gangster','survival',
                'startups','business','entrepreneurship','pitches','funding',
                'investing','finance','economics','dark comedy','dark comedy drama'],
    },
  };

  const signals = moodSignals[mood];
  if (!signals) return 50;

  const tags = content.tags;
  let score = 50;

  tags.forEach(tag => {
    if (signals.boost.includes(tag)) score += 12;
    if (signals.penalty.includes(tag)) score -= 15;
  });

  // Genre-level nudge for content with no mood-relevant tags
  const genre = content.genre;
  const genreNudge = {
    laugh: { 'Comedy / Sitcom': 5, 'Stand-up Comedy': 5, 'True Crime / Documentary': -8, 'Drama': -5 },
    think: { 'True Crime / Documentary': 5, 'Drama': 5, 'Comedy / Sitcom': -5, 'Stand-up Comedy': -8 },
    chill: { 'Travel / Lifestyle': 5, 'Comedy / Sitcom': 3, 'True Crime / Documentary': -5, 'Drama': -3 },
  };
  score += (genreNudge[mood] || {})[genre] || 0;

  return Math.max(0, Math.min(100, score));
}

function isMoodContradiction(content, mood) {
  if (!mood || mood === 'anything') return false;

  const tags = content.tags;

  if (mood === 'laugh') {
    const hasDark = tags.some(t => ['dark','serial killer','murder','kidnapping','shocking','crime','trauma'].includes(t));
    const hasFunny = tags.some(t => ['funny','fun','comedy','hilarious','light','quirky','witty','warm'].includes(t));
    if (hasDark && !hasFunny) return true;
  }

  if (mood === 'think') {
    const isMindless = tags.some(t => ['no thinking required','compilation','challenge','hot wings'].includes(t));
    const hasSubstance = tags.some(t => ['educational','informative','business','science','history','inspiring','startups','smart','philosophy'].includes(t));
    if (isMindless && !hasSubstance) return true;
  }

  if (mood === 'chill') {
    const hasIntense = tags.some(t => ['intense','serial killer','murder','kidnapping','shocking','gripping','thriller','raw','gangster','trauma','corporate dystopia'].includes(t));
    const hasCalm = tags.some(t => ['warm','light','gentle','fun','funny','scenic','heartwarming','romantic','feel-good','family','nostalgic'].includes(t));
    if (hasIntense && !hasCalm) return true;
  }

  return false;
}

// Weighted reservoir sampling — variety on refresh without pure randomness
function weightedSample(items, count) {
  if (items.length <= count) return [...items];

  const remaining = [...items];
  const selected = [];

  for (let i = 0; i < count; i++) {
    const minScore = Math.min(...remaining.map(r => r._score));
    const weights = remaining.map(r => Math.exp((r._score - minScore) / 8));
    const totalWeight = weights.reduce((s, w) => s + w, 0);

    let rand = Math.random() * totalWeight;
    let picked = 0;
    for (let j = 0; j < weights.length; j++) {
      rand -= weights[j];
      if (rand <= 0) { picked = j; break; }
    }

    selected.push(remaining[picked]);
    remaining.splice(picked, 1);
  }

  return selected;
}

// Main recommendation function
export function getRecommendations(profile, mood = null, count = 5, forAI = false) {
  if (!profile || !profile.completed) return [];

  // Fresh profile from localStorage
  let freshProfile = profile;
  try {
    const raw = localStorage.getItem('mealtime_profile');
    if (raw) freshProfile = { ...profile, ...JSON.parse(raw) };
  } catch {}

  // Enrich tag weights with cross-content feedback learning
  const enrichedTagWeights = applyFeedbackToTagWeights(
    freshProfile.tagWeights || {},
    freshProfile.feedback || {}
  );

  const genreWeights = deriveGenreWeights(enrichedTagWeights);

  // Filter by language and per-item mood contradiction (not genre-level exclusion)
  const filtered = CONTENT_DB.filter(c =>
    languageMatch(c, freshProfile.language) &&
    !isMoodContradiction(c, mood)
  );

  const scored = filtered.map(c => scoreContent(c, freshProfile, genreWeights, enrichedTagWeights, mood));
  scored.sort((a, b) => b._score - a._score);

  if (forAI) return scored.slice(0, 15);

  // Weighted sampling from top 12 for variety
  const pool = scored.slice(0, Math.min(12, scored.length));
  const selected = weightedSample(pool, count);
  selected.sort((a, b) => b._score - a._score);
  return selected;
}

// Reason lines — personal, not metadata
export function buildReasonLine(content, profile) {
  const feedback = (profile.feedback || {})[content.id];
  const tagWeights = profile.tagWeights || {};

  if (feedback === 'up') {
    return "You liked this before — still a great pick";
  }

  // Find strongest user-preference tag on this content
  let bestTag = null;
  let bestWeight = 0;
  content.tags.forEach(tag => {
    const w = tagWeights[tag] || 0;
    if (w > bestWeight) { bestWeight = w; bestTag = tag; }
  });

  const parts = [];

  // Duration context
  const dur = content.duration;
  if (dur <= 15) parts.push('Quick one');
  else if (dur <= 30) parts.push('Fits your meal');
  else parts.push(dur + ' min — settle in');

  // Taste-based reason
  if (bestTag && bestWeight >= 2) {
    const tagReasons = {
      'warm': 'warm and easy to sink into',
      'funny': 'guaranteed laughs',
      'light': 'no brainpower needed',
      'Indian': 'desi comfort content',
      'gripping': 'gripping — hard to pause',
      'educational': "you'll learn something new",
      'emotional': 'hits you in the feels',
      'adventure': 'pure energy and fun',
      'nostalgic': 'nostalgia in the best way',
      'quirky': 'weird in a good way',
      'British': 'dry British humour done right',
      'western': 'solid Western pick',
      'dark': 'dark and compelling',
      'business': 'scratches the business brain',
      'celebrity': 'celebrity fun, no guilt',
      'food': 'perfect to watch while eating',
      'relatable': 'uncomfortably relatable',
      'classic': 'a classic for a reason',
      'friendship': 'friendship goals energy',
    };
    const reason = tagReasons[bestTag];
    if (reason) parts.push(reason);
  }

  if (parts.length < 2 && content.qualityScore >= 90) {
    parts.push('universally loved');
  }

  if (content.platform === 'YouTube') parts.push('free on YouTube');

  if (parts.length === 0) {
    parts.push(content.genre.split(' / ')[0]);
    parts.push(content.duration + ' min');
  }

  return parts.slice(0, 3).join(' · ');
}
