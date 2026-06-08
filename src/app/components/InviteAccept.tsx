import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Frown, Equal, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Category, categories } from '../App';

type ChallengePayload = {
  c: string;
  v: number;
};

type Props = {
  token: string;
  onClearChallenge: () => void;
};

function decodeChallenge(token: string): ChallengePayload | null {
  try {
    const json = atob(token);
    return JSON.parse(json) as ChallengePayload;
  } catch {
    return null;
  }
}

export function InviteAccept({ token, onClearChallenge }: Props) {
  const [inputValue, setInputValue] = useState('');
  const [result, setResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [myValue, setMyValue] = useState<number | null>(null);
  const [error, setError] = useState('');

  const payload = decodeChallenge(token);
  const category: Category | undefined = categories.find((c) => c.id === payload?.c);

  if (!payload || !category) {
    return (
      <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-xl mx-auto text-center">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-2xl mb-2 text-gray-700">无效的挑战链接</h2>
        <p className="text-gray-500 mb-6">该链接可能已过期或已被修改</p>
        <button
          onClick={onClearChallenge}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl"
        >
          返回首页
        </button>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(inputValue);
    if (isNaN(val) || val < category.min || val > category.max) {
      setError(`请输入 ${category.min}–${category.max} 之间的数值`);
      return;
    }
    setError('');
    setMyValue(val);

    const opponentValue = payload.v;
    let r: 'win' | 'lose' | 'draw';
    if (val > opponentValue) r = 'win';
    else if (val < opponentValue) r = 'lose';
    else r = 'draw';

    setResult(r);

    if (r === 'win') {
      setTimeout(() => {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }, 400);
    }
  };

  const getResultConfig = (r: 'win' | 'lose' | 'draw') => {
    switch (r) {
      case 'win':
        return {
          icon: <Trophy size={72} className="text-yellow-500" />,
          title: '你赢了！',
          message: '恭喜你击败了挑战者！',
          color: 'from-yellow-400 to-orange-500',
          bgColor: 'from-yellow-50 to-orange-50',
          textColor: 'text-yellow-600',
          emoji: '🎉',
        };
      case 'lose':
        return {
          icon: <Frown size={72} className="text-blue-500" />,
          title: '挑战失败',
          message: '挑战者更胜一筹！',
          color: 'from-blue-400 to-purple-500',
          bgColor: 'from-blue-50 to-purple-50',
          textColor: 'text-blue-600',
          emoji: '😢',
        };
      case 'draw':
        return {
          icon: <Equal size={72} className="text-green-500" />,
          title: '平局！',
          message: '势均力敌，难分高下！',
          color: 'from-green-400 to-teal-500',
          bgColor: 'from-green-50 to-teal-50',
          textColor: 'text-green-600',
          emoji: '🤝',
        };
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <AnimatePresence mode="wait">
        {result === null ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-10 rounded-2xl shadow-2xl"
          >
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">{category.icon}</div>
              <h2 className="text-3xl mb-2 text-gray-800">你收到了一个挑战！</h2>
              <p className="text-gray-500">
                有人向你发起了 <span className="font-semibold text-purple-600">{category.title}</span> 匿名PK
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-6 text-sm text-purple-700 text-center">
              🔒 挑战者数值已加密，接受挑战后只显示胜负，不泄露任何具体数值
            </div>

            <form onSubmit={handleSubmit}>
              <label className="block text-sm text-gray-600 mb-2">
                输入你的{category.title}（{category.unit}）
              </label>
              <input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={category.placeholder}
                min={category.min}
                max={category.max}
                step={category.id === 'salary' ? 0.1 : 1}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg mb-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
              <button
                type="submit"
                className="w-full mt-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
              >
                接受挑战 ⚔️
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white p-10 rounded-2xl shadow-2xl"
          >
            {(() => {
              const cfg = getResultConfig(result);
              return (
                <>
                  <div className="text-center mb-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                      className="mb-4 flex justify-center"
                    >
                      {cfg.icon}
                    </motion.div>
                    <h2 className={`text-4xl mb-2 ${cfg.textColor}`}>{cfg.title}</h2>
                    <p className="text-xl text-gray-600">{cfg.message}</p>
                  </div>

                  <div className={`bg-gradient-to-br ${cfg.bgColor} p-8 rounded-2xl mb-6`}>
                    <div className="grid grid-cols-3 gap-4">
                      <div className={`text-center p-6 rounded-xl ${result === 'lose' ? 'bg-white shadow-lg scale-105' : 'bg-white/50'}`}>
                        <div className="text-3xl mb-2">🎭</div>
                        <p className="text-sm text-gray-600 mb-2">挑战者</p>
                        <p className="text-gray-400 text-lg">🔒 保密</p>
                      </div>
                      <div className="flex items-center justify-center text-4xl">{cfg.emoji}</div>
                      <div className={`text-center p-6 rounded-xl ${result === 'win' ? 'bg-white shadow-lg scale-105' : 'bg-white/50'}`}>
                        <div className="text-3xl mb-2">👤</div>
                        <p className="text-sm text-gray-600 mb-2">你</p>
                        <p className="text-gray-700">
                          {myValue}
                          <span className="text-sm ml-1">{category.unit}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl mb-6 text-center text-sm text-gray-500">
                    🔒 隐私保护：双方具体数值均已加密，不会泄露给任何人
                  </div>

                  <button
                    onClick={onClearChallenge}
                    className={`w-full bg-gradient-to-r ${cfg.color} text-white py-4 rounded-xl hover:opacity-90 transition-all duration-300 flex items-center justify-center gap-2`}
                  >
                    <RefreshCw size={20} />
                    发起我自己的挑战
                  </button>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
