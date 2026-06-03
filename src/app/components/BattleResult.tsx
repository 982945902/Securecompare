import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Frown, Equal, Share2, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Category } from '../App';

type Props = {
  category: Category;
  myValue: number;
  opponentValue: number;
  result: 'win' | 'lose' | 'draw';
  onReset: () => void;
};

export function BattleResult({ category, myValue, opponentValue, result, onReset }: Props) {
  const [showValues, setShowValues] = useState(false);

  useEffect(() => {
    if (result === 'win') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    setTimeout(() => setShowValues(true), 500);
  }, [result]);

  const getResultConfig = () => {
    switch (result) {
      case 'win':
        return {
          icon: <Trophy size={80} className="text-yellow-500" />,
          title: '胜利！',
          emoji: '🎉',
          message: '你赢了这场对决！',
          color: 'from-yellow-400 to-orange-500',
          bgColor: 'from-yellow-50 to-orange-50',
          textColor: 'text-yellow-600',
        };
      case 'lose':
        return {
          icon: <Frown size={80} className="text-blue-500" />,
          title: '失败',
          emoji: '😢',
          message: '对手更胜一筹',
          color: 'from-blue-400 to-purple-500',
          bgColor: 'from-blue-50 to-purple-50',
          textColor: 'text-blue-600',
        };
      case 'draw':
        return {
          icon: <Equal size={80} className="text-green-500" />,
          title: '平局',
          emoji: '🤝',
          message: '势均力敌！',
          color: 'from-green-400 to-teal-500',
          bgColor: 'from-green-50 to-teal-50',
          textColor: 'text-green-600',
        };
    }
  };

  const config = getResultConfig();
  const difference = Math.abs(myValue - opponentValue);

  const handleShare = () => {
    const text = `我在匿名比较器的${category.title}对战中${
      result === 'win' ? '获胜' : result === 'lose' ? '落败' : '打成平局'
    }！来挑战我吧 🔐`;

    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      alert('已复制分享文本到剪贴板！');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white p-10 rounded-2xl shadow-2xl max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mb-4 flex justify-center"
        >
          {config.icon}
        </motion.div>
        <h2 className={`text-4xl mb-2 ${config.textColor}`}>{config.title}</h2>
        <p className="text-xl text-gray-600">{config.message}</p>
      </div>

      <div className={`bg-gradient-to-br ${config.bgColor} p-8 rounded-2xl mb-6`}>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`text-center p-6 rounded-xl ${
              result === 'win' ? 'bg-white shadow-lg scale-105' : 'bg-white/50'
            }`}
          >
            <div className="text-4xl mb-2">👤</div>
            <p className="text-sm text-gray-600 mb-2">你</p>
            {showValues && (
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`text-2xl ${result === 'win' ? 'text-green-600' : 'text-gray-700'}`}
              >
                {myValue}
                <span className="text-sm ml-1">{category.unit}</span>
              </motion.p>
            )}
          </motion.div>

          <div className="flex items-center justify-center">
            <div className="text-4xl">{config.emoji}</div>
          </div>

          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`text-center p-6 rounded-xl ${
              result === 'lose' ? 'bg-white shadow-lg scale-105' : 'bg-white/50'
            }`}
          >
            <div className="text-4xl mb-2">🎭</div>
            <p className="text-sm text-gray-600 mb-2">对手</p>
            {showValues && (
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`text-2xl ${result === 'lose' ? 'text-red-600' : 'text-gray-700'}`}
              >
                {opponentValue}
                <span className="text-sm ml-1">{category.unit}</span>
              </motion.p>
            )}
          </motion.div>
        </div>

        {showValues && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white p-4 rounded-xl text-center"
          >
            <p className="text-sm text-gray-600 mb-1">差距</p>
            <p className="text-3xl text-purple-600">
              {difference}
              <span className="text-lg ml-1">{category.unit}</span>
            </p>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-purple-50 p-4 rounded-xl text-center">
          <p className="text-sm text-gray-600 mb-1">对战结果</p>
          <p className={`text-2xl ${config.textColor}`}>
            {result === 'win' ? '✓ 胜' : result === 'lose' ? '✗ 败' : '= 平'}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl text-center">
          <p className="text-sm text-gray-600 mb-1">对战时长</p>
          <p className="text-2xl text-blue-600">3.2s</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleShare}
          className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <Share2 size={20} />
          分享战绩
        </button>
        <button
          onClick={onReset}
          className={`flex-1 bg-gradient-to-r ${config.color} text-white py-4 rounded-xl hover:opacity-90 transition-all duration-300 flex items-center justify-center gap-2`}
        >
          <RefreshCw size={20} />
          再战一局
        </button>
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        🔒 对战数据端到端加密 · 对手身份完全匿名
      </div>
    </motion.div>
  );
}
