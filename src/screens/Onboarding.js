import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { ONBOARDING_CARDS, buildTagWeightsFromPicks } from '../engine/scorer';
import { buildTasteProfile } from '../engine/claudeAPI';
import './Onboarding.css';

const STEPS = {
  WELCOME: 'welcome',
  CARDS: 'cards',
  QUESTIONS: 'questions',
  PROCESSING: 'processing',
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { setProfile, settings } = useUserStore();
  const [step, setStep] = useState(STEPS.WELCOME);
  const [cardIndex, setCardIndex] = useState(0);
  const [picks, setPicks] = useState([]);
  const [mealDuration, setMealDuration] = useState(null);
  const [language, setLanguage] = useState(null);
  const [vibe, setVibe] = useState(null);
  const [error, setError] = useState('');

  const totalCards = ONBOARDING_CARDS.length;
  const currentCard = ONBOARDING_CARDS[cardIndex];

  const handlePick = (choice) => {
    const newPicks = [...picks, { cardId: currentCard.id, choice }];
    setPicks(newPicks);
    if (cardIndex < totalCards - 1) {
      setCardIndex(cardIndex + 1);
    } else {
      setStep(STEPS.QUESTIONS);
    }
  };

  const handleFinish = async () => {
    if (!mealDuration || !language || !vibe) return;
    setStep(STEPS.PROCESSING);
    setError('');

    const tagWeights = buildTagWeightsFromPicks(picks, mealDuration, language, vibe);

    let tasteProfile = null;
    if (settings.aiEnabled && settings.apiKey) {
      try {
        tasteProfile = await buildTasteProfile(settings.apiKey, picks, mealDuration, language, vibe);
      } catch (e) {
        console.warn('AI profile build failed, using hardcoded:', e.message);
      }
    }

    setProfile({
      completed: true,
      picks,
      mealDuration,
      language,
      vibe,
      tagWeights,
      tasteProfile,
      history: [],
      feedback: {},
    });

    navigate('/home');
  };

  const progress = step === STEPS.CARDS
    ? Math.round((cardIndex / totalCards) * 100)
    : step === STEPS.QUESTIONS ? 100 : 0;

  return (
    <div className="onboarding-root noise">
      {step === STEPS.WELCOME && <WelcomeScreen onStart={() => setStep(STEPS.CARDS)} />}
      {step === STEPS.CARDS && (
        <CardsScreen
          card={currentCard}
          cardIndex={cardIndex}
          total={totalCards}
          progress={progress}
          onPick={handlePick}
        />
      )}
      {step === STEPS.QUESTIONS && (
        <QuestionsScreen
          mealDuration={mealDuration}
          language={language}
          vibe={vibe}
          setMealDuration={setMealDuration}
          setLanguage={setLanguage}
          setVibe={setVibe}
          onFinish={handleFinish}
          error={error}
        />
      )}
      {step === STEPS.PROCESSING && <ProcessingScreen aiEnabled={settings.aiEnabled} />}
    </div>
  );
}

function WelcomeScreen({ onStart }) {
  return (
    <div className="ob-welcome fade-up">
      <div className="ob-logo">🍽</div>
      <h1 className="ob-title">MealTime</h1>
      <p className="ob-subtitle">5 perfect things to watch<br />before your food gets cold.</p>
      <div className="ob-divider" />
      <p className="ob-body">Answer 8 quick questions — we'll figure out what you actually want to watch. No scrolling. No reruns out of habit.</p>
      <button className="btn-primary ob-start-btn" onClick={onStart}>Get started →</button>
      <p className="ob-footer">Takes about 2 minutes</p>
    </div>
  );
}

function CardsScreen({ card, cardIndex, total, progress, onPick }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (choice) => {
    setSelected(choice);
    setTimeout(() => {
      setSelected(null);
      onPick(choice);
    }, 220);
  };

  return (
    <div className="ob-cards-screen">
      <div className="ob-progress-bar">
        <div className="ob-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="ob-card-header">
        <span className="ob-step-label">{cardIndex + 1} of {total}</span>
        <span className="ob-card-label">{card.label}</span>
      </div>
      <p className="ob-card-question">{card.question}</p>
      <div className="ob-choices">
        <ChoiceCard
          option={card.optionA}
          choice="A"
          selected={selected}
          onSelect={handleSelect}
        />
        <div className="ob-vs">OR</div>
        <ChoiceCard
          option={card.optionB}
          choice="B"
          selected={selected}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}

function ChoiceCard({ option, choice, selected, onSelect }) {
  const isSelected = selected === choice;
  const isRejected = selected && selected !== choice;

  return (
    <button
      className={`ob-choice-card ${isSelected ? 'selected' : ''} ${isRejected ? 'rejected' : ''}`}
      onClick={() => onSelect(choice)}
    >
      <div className="ob-choice-title">{option.title}</div>
      {option.platform && <div className="ob-choice-platform">{option.platform}</div>}
      <div className="ob-choice-desc">{option.desc}</div>
      {isSelected && <div className="ob-choice-check">✓</div>}
    </button>
  );
}

function QuestionsScreen({ mealDuration, language, vibe, setMealDuration, setLanguage, setVibe, onFinish, error }) {
  const allAnswered = mealDuration && language && vibe;

  return (
    <div className="ob-questions fade-up">
      <h2 className="ob-q-title">Almost there</h2>
      <p className="ob-q-sub">3 quick things so we get the fit right.</p>

      <div className="ob-question-group">
        <label className="ob-q-label">How long is your typical meal?</label>
        <div className="ob-pill-group">
          {[
            { val: 'under15', label: 'Under 15 min' },
            { val: '15-25', label: '15–25 min' },
            { val: '25-35', label: '25–35 min' },
            { val: '35-45', label: '35–45 min' },
          ].map(opt => (
            <button
              key={opt.val}
              className={`ob-pill ${mealDuration === opt.val ? 'active' : ''}`}
              onClick={() => setMealDuration(opt.val)}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      <div className="ob-question-group">
        <label className="ob-q-label">Language comfort?</label>
        <div className="ob-pill-group">
          {[
            { val: 'hindi', label: 'Hindi only' },
            { val: 'both', label: 'Both equally' },
            { val: 'english', label: 'English only' },
          ].map(opt => (
            <button
              key={opt.val}
              className={`ob-pill ${language === opt.val ? 'active' : ''}`}
              onClick={() => setLanguage(opt.val)}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      <div className="ob-question-group">
        <label className="ob-q-label">Default meal vibe?</label>
        <div className="ob-pill-group">
          {[
            { val: 'laugh', label: 'Make me laugh' },
            { val: 'interesting', label: 'Something interesting' },
            { val: 'decompress', label: 'Just decompress' },
            { val: 'whatever', label: "Whatever's good" },
          ].map(opt => (
            <button
              key={opt.val}
              className={`ob-pill ${vibe === opt.val ? 'active' : ''}`}
              onClick={() => setVibe(opt.val)}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      {error && <p className="ob-error">{error}</p>}

      <button
        className="btn-primary ob-finish-btn"
        disabled={!allAnswered}
        onClick={onFinish}
      >
        Build my recommendations →
      </button>
    </div>
  );
}

function ProcessingScreen({ aiEnabled }) {
  return (
    <div className="ob-processing fade-in">
      <div className="ob-spinner" />
      <p className="ob-proc-title">
        {aiEnabled ? 'Claude is building your taste profile…' : 'Building your taste profile…'}
      </p>
      <p className="ob-proc-sub">This takes a moment.</p>
    </div>
  );
}
