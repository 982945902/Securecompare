import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, Trophy, TrendingUp, Users } from 'lucide-react';
import { Category } from '../App';

type Props = {
  category: Category;
  value: number;
  percentile: number;
  onReset: () => void;
};

export function CompareResult({ category, value, percentile, onReset }: Props) {
  const [animatedPercentile, setAnimatedPercentile] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = percentile / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= percentile) {
        setAnimatedPercentile(percentile);
        clearInterval(timer);
      } else {
        setAnimatedPercentile(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [percentile]);

  const getMessage = () => {
    if (percentile >= 90) return { emoji: '🏆', text: '恭喜！你超越了绝大多数人！', color: 'text-yellow-600' };
    if (percentile >= 75) return { emoji: '🎉', text: '很不错！你处于上游水平！', color: 'text-green-600' };
    if (percentile >= 50) return { emoji: '👍', text: '你处于中等偏上水平', color: 'text-blue-600' };
    if (percentile >= 25) return { emoji: '💪', text: '还有提升空间，加油！', color: 'text-orange-600' };
    return { emoji: '🌱', text: '每个人都有自己的节奏', color: 'text-purple-600' };
  };

  const message = getMessage();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white p-10 rounded-2xl shadow-2xl max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">{category.icon}</div>
        <h2 className="text-3xl mb-2">比较结果</h2>
        <p className="text-gray-500">基于加密统计分析</p>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl mb-6">
        <div className="text-center mb-6">
          <div className="text-7xl mb-4">{message.emoji}</div>
          <p className={`text-2xl ${message.color} mb-2`}>{message.text}</p>
        </div>

        <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${animatedPercentile}%` }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500"
          />
        </div>

        <div className="text-center">
          <div className="text-5xl mb-2">
            {animatedPercentile}<span className="text-3xl">%</span>
          </div>
          <p className="text-gray-600">
            你超越了 <span className="text-purple-600">{animatedPercentile}%</span> 的匿名用户
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-xl text-center">
          <Users className="mx-auto mb-2 text-blue-600" size={24} />
          <p className="text-sm text-gray-600">样本量</p>
          <p className="text-xl">10,247</p>
        </div>
        <div className="bg-green-50 p-4 rounded-xl text-center">
          <TrendingUp className="mx-auto mb-2 text-green-600" size={24} />
          <p className="text-sm text-gray-600">排名</p>
          <p className="text-xl">#{Math.round((100 - percentile) * 102.47)}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl text-center">
          <Trophy className="mx-auto mb-2 text-purple-600" size={24} />
          <p className="text-sm text-gray-600">等级</p>
          <p className="text-xl">{percentile >= 75 ? 'A' : percentile >= 50 ? 'B' : percentile >= 25 ? 'C' : 'D'}</p>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-xl mb-6">
        <p className="text-sm text-gray-600 text-center">
          🔒 你的原始数据已被安全加密，系统只保存统计结果
        </p>
      </div>

      <button
        onClick={onReset}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 flex items-center justify-center gap-2"
      >
        <RefreshCw size={20} />
        再比较一次
      </button>
    </motion.div>
  );
}
