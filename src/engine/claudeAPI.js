// Claude API integration for MealTime AI mode

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

async function callClaude(apiKey, systemPrompt, userMessage) {
  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

// Build taste profile from onboarding picks
export async function buildTasteProfile(apiKey, picks, mealDuration, language, vibe) {
  const system = `You are a content recommendation engine. Given a user's content preferences from an onboarding quiz, return a JSON object describing their taste profile. Return ONLY valid JSON, no markdown, no explanation.`;

  const cardDescriptions = picks.map(p => {
    const choices = {
      card1: { A: 'Gullak (warm Hindi family comedy)', B: 'The Office US (dry Western workplace comedy)' },
      card2: { A: 'Scam 1992 (gripping Indian financial thriller)', B: 'Fleabag (intimate British dark comedy-drama)' },
      card3: { A: 'House of Secrets: Burari (dark Indian true crime)', B: 'Kurzgesagt (light animated science explainer)' },
      card4: { A: 'Zakir Khan - Hindi emotional warm standup', B: 'John Mulaney - English sharp storytelling standup' },
      card5: { A: 'Visa2Explore - practical Hindi India travel', B: 'Yes Theory - high energy English adventure' },
      card6: { A: 'Shark Tank India - business reality, Hindi', B: 'Hot Ones SRK - celebrity fun, English' },
      card7: { A: 'A 42-min immersive drama episode', B: 'A 6-min quick animated explainer' },
      card8: { A: 'Something that makes me laugh', B: 'Something that makes me think' },
    };
    const chosen = (choices[p.cardId] || {})[p.choice] || p.choice;
    return `- Chose: ${chosen}`;
  }).join('\n');

  const user = `User onboarding responses:
${cardDescriptions}
Meal duration: ${mealDuration}
Language preference: ${language}
Default vibe: ${vibe}

Return JSON with this exact structure:
{
  "summary": "2-sentence description of this person's taste",
  "topGenres": ["genre1", "genre2", "genre3"],
  "tone": "warm|sharp|dark|light|mixed",
  "languageLean": "Hindi|English|Both",
  "durationPref": "short|medium|long",
  "avoids": ["tag1", "tag2"],
  "tagWeights": { "warm": 3, "funny": 2, "dark": -1, ... }
}`;

  const raw = await callClaude(apiKey, system, user);
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// Get AI-powered recommendations with reason lines
export async function getAIRecommendations(apiKey, candidates, profile, mood) {
  const system = `You are MealTime, an AI that recommends exactly the right content for someone to watch during a meal. You understand their taste deeply and surface content that fits the moment. Be warm, specific, and human in your reason lines — not generic.`;

  const candidateList = candidates.slice(0, 12).map((c, i) =>
    `${i + 1}. [${c.id}] "${c.title}" (${c.platform}) — ${c.duration}min — ${c.genre} — Tags: ${c.tags.join(', ')} — Score: ${c._score}`
  ).join('\n');

  const user = `User taste profile: ${profile.tasteProfile?.summary || 'Enjoys Indian content, mix of comedy and drama'}
Top genres: ${profile.tasteProfile?.topGenres?.join(', ') || 'Comedy, Drama'}
Current mood: ${mood || 'anything'}
Meal duration preference: ${profile.mealDuration || '25-35 min'}

Content candidates (pre-scored by algorithm):
${candidateList}

Pick the best 5 from this list. For each, write a personalised 1-sentence reason why THIS person would enjoy it right now. Be specific — reference their taste, not just the genre.

Return ONLY valid JSON array:
[
  { "id": "C001", "reason": "Because you gravitate toward warm Hindi comedy set in real India — this is the best of it." },
  ...
]`;

  const raw = await callClaude(apiKey, system, user);
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// Validate API key with a minimal test call
export async function validateApiKey(apiKey) {
  try {
    await callClaude(apiKey, 'You are a test.', 'Reply with just: ok');
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}
