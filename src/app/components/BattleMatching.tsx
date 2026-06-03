import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Wifi, Users, Globe, Zap } from 'lucide-react';
import { Category } from '../App';

type Props = {
  category: Category;
};

const matchingSteps = [
  { icon: <Wifi size={32} />, text: '连接加密服务器...' },
  { icon: <Users size={32} />, text: '搜索在线玩家...' },
  { icon: <Globe size={32} />, text: '匹配合适对手...' },
  { icon: <Zap size={32} />, text: '建立安全连接...' },
];

export function BattleMatching({ category }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);

  useEffect(() => {
    // 模拟在线用户数
    setOnlineUsers(Math.floor(Math.random() * 500) + 200);

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % matchingSteps.length);
    }, 750);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">{category.icon}</div>
        <h2 className="text-3xl mb-2">对战匹配中</h2>
        <p className="text-gray-500">正在为你寻找势均力敌的对手</p>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl mb-6">
        <div className="flex justify-center mb-6">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="text-purple-600"
          >
            {matchingSteps[currentStep].icon}
          </motion.div>
        </div>

        <p className="text-center text-purple-900 mb-4">
          {matchingSteps[currentStep].text}
        </p>

        <div className="flex justify-center gap-2 mb-6">
          {matchingSteps.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-12 rounded-full transition-colors ${
                index === currentStep ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        <div className="bg-white p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">当前在线</span>
            <span className="text-lg text-green-600">{onlineUsers} 人</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">匹配队列</span>
            <span className="text-lg text-orange-600">{Math.floor(onlineUsers / 10)} 人</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">预计等待</span>
            <span className="text-lg text-blue-600">3 秒</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-xl">
          <div className="text-3xl mb-2">👤</div>
          <p className="text-sm text-gray-600">你</p>
          <p className="text-xs text-blue-600 mt-1">已就绪</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-xl">
          <div className="text-3xl mb-2 animate-pulse">❓</div>
          <p className="text-sm text-gray-600">对手</p>
          <p className="text-xs text-gray-500 mt-1">匹配中...</p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>使用端到端加密技术</span>
        </div>
      </div>
    </div>
  );
}
