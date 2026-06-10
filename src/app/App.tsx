import { useState, useEffect } from 'react';
import { CompareCategories } from './components/CompareCategories';
import { CompareForm } from './components/CompareForm';
import { CompareResult } from './components/CompareResult';
import { ModeSelector } from './components/ModeSelector';
import { BattleMatching } from './components/BattleMatching';
import { BattleResult } from './components/BattleResult';
import { InviteChallenge } from './components/InviteChallenge';
import { InviteAccept } from './components/InviteAccept';
import { EncryptedLeaderboard } from './components/EncryptedLeaderboard';

export type Category = {
  id: string;
  title: string;
  icon: string;
  unit: string;
  placeholder: string;
  min: number;
  max: number;
};

export const categories: Category[] = [
  {
    id: 'salary',
    title: '年薪',
    icon: '💰',
    unit: '万元',
    placeholder: '输入你的年薪（万元）',
    min: 0,
    max: 1000,
  },
  {
    id: 'height',
    title: '身高',
    icon: '📏',
    unit: 'cm',
    placeholder: '输入你的身高（cm）',
    min: 140,
    max: 220,
  },
  {
    id: 'age',
    title: '年龄',
    icon: '🎂',
    unit: '岁',
    placeholder: '输入你的年龄',
    min: 18,
    max: 100,
  },
  {
    id: 'length',
    title: '长度',
    icon: '🍆',
    unit: 'cm',
    placeholder: '你懂的...',
    min: 5,
    max: 30,
  },
];

export type Mode = 'solo' | 'battle' | 'invite' | 'leaderboard';

export type CompareState = {
  mode: Mode | null;
  category: Category | null;
  value: number | null;
  percentile: number | null;
};

export type BattleState = {
  isMatching: boolean;
  result: 'win' | 'lose' | 'draw' | null;
};

function readChallengeToken(): string | null {
  const hash = window.location.hash;
  const match = hash.match(/[#&]challenge=([^&]+)/);
  return match ? match[1] : null;
}

export default function App() {
  const [challengeToken, setChallengeToken] = useState<string | null>(() => readChallengeToken());

  const [state, setState] = useState<CompareState>({
    mode: null,
    category: null,
    value: null,
    percentile: null,
  });

  const [battleState, setBattleState] = useState<BattleState>({
    isMatching: false,
    result: null,
  });

  useEffect(() => {
    const onHashChange = () => {
      const token = readChallengeToken();
      setChallengeToken(token);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleSelectMode = (mode: Mode) => {
    setState({ ...state, mode });
  };

  const handleSelectCategory = (category: Category) => {
    setState({ ...state, category, value: null, percentile: null });
  };

  const handleCompare = (value: number) => {
    if (state.mode === 'solo') {
      const percentile = calculatePercentile(state.category!.id, value);
      setState({ ...state, value, percentile });
    } else if (state.mode === 'battle') {
      setState({ ...state, value });
      setBattleState({ isMatching: true, result: null });

      setTimeout(() => {
        const opponentValue = generateOpponentValue(state.category!, value);
        const result = value > opponentValue ? 'win' : value < opponentValue ? 'lose' : 'draw';
        setBattleState({ isMatching: false, result });
      }, 3000);
    } else if (state.mode === 'invite') {
      // Invite mode: show link generation screen with entered value
      setState({ ...state, value });
    }
  };

  const handleReset = () => {
    setState({ mode: null, category: null, value: null, percentile: null });
    setBattleState({ isMatching: false, result: null });
  };

  const handleClearChallenge = () => {
    window.location.hash = '';
    setChallengeToken(null);
    handleReset();
  };

  // If there's an incoming challenge token, show the accept screen
  if (challengeToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-8">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="text-5xl mb-4">🔐 匿名比较器</h1>
            <p className="text-gray-600">基于加密技术的隐私比较平台 · 你的数据永不泄露</p>
          </header>
          <InviteAccept token={challengeToken} onClearChallenge={handleClearChallenge} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-5xl mb-4">🔐 匿名比较器</h1>
          <p className="text-gray-600">
            基于加密技术的隐私比较平台 · 你的数据永不泄露
          </p>
        </header>

        {!state.mode && (
          <ModeSelector onSelectMode={handleSelectMode} />
        )}

        {state.mode && !state.category && (
          <CompareCategories
            categories={categories}
            onSelect={handleSelectCategory}
            onBack={() => setState({ ...state, mode: null })}
          />
        )}

        {state.category && state.value === null && state.mode !== 'leaderboard' && (
          <CompareForm
            category={state.category}
            mode={state.mode!}
            onCompare={handleCompare}
            onBack={() => setState({ ...state, category: null })}
          />
        )}

        {state.mode === 'leaderboard' && state.category && (
          <EncryptedLeaderboard
            category={state.category}
            onBack={() => setState({ ...state, category: null })}
          />
        )}

        {state.mode === 'solo' && state.percentile !== null && (
          <CompareResult
            category={state.category!}
            value={state.value!}
            percentile={state.percentile}
            onReset={handleReset}
          />
        )}

        {state.mode === 'battle' && battleState.isMatching && (
          <BattleMatching category={state.category!} />
        )}

        {state.mode === 'battle' && !battleState.isMatching && battleState.result && (
          <BattleResult
            category={state.category!}
            myValue={state.value!}
            result={battleState.result}
            onReset={handleReset}
          />
        )}

        {state.mode === 'invite' && state.category && state.value !== null && (
          <InviteChallenge
            category={state.category}
            value={state.value}
            onBack={() => setState({ ...state, value: null })}
          />
        )}
      </div>
    </div>
  );
}

function calculatePercentile(categoryId: string, value: number): number {
  const distributions: Record<string, { mean: number; stdDev: number }> = {
    salary: { mean: 25, stdDev: 15 },
    height: { mean: 170, stdDev: 8 },
    age: { mean: 35, stdDev: 12 },
    length: { mean: 13, stdDev: 2.5 },
  };

  const dist = distributions[categoryId];
  const z = (value - dist.mean) / dist.stdDev;
  const percentile = normalCDF(z) * 100;

  return Math.max(1, Math.min(99, Math.round(percentile)));
}

function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

function generateOpponentValue(category: Category, userValue: number): number {
  const range = userValue * 0.3;
  const min = Math.max(category.min, userValue - range);
  const max = Math.min(category.max, userValue + range);
  const opponentValue = min + Math.random() * (max - min);

  if (category.id === 'salary') {
    return Math.round(opponentValue * 10) / 10;
  }
  return Math.round(opponentValue);
}
