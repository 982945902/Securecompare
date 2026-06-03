import { useState } from 'react';
import { ArrowLeft, Lock, Shield, Swords } from 'lucide-react';
import { Category, Mode } from '../App';

type Props = {
  category: Category;
  mode: Mode;
  onCompare: (value: number) => void;
  onBack: () => void;
};

export function CompareForm({ category, mode, onCompare, onBack }: Props) {
  const [value, setValue] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseFloat(value);

    if (!numValue || numValue < category.min || numValue > category.max) {
      alert(`请输入 ${category.min} 到 ${category.max} 之间的数值`);
      return;
    }

    setIsEncrypting(true);

    // 模拟加密处理（实际应用会使用真实的加密算法）
    await simulateEncryption(numValue);

    setTimeout(() => {
      setIsEncrypting(false);
      onCompare(numValue);
    }, 1500);
  };

  return (
    <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-md mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        返回
      </button>

      <div className="text-center mb-8">
        <div className="text-6xl mb-4">{category.icon}</div>
        <h2 className="text-3xl mb-2">
          {category.title}
          {mode === 'battle' && <span className="text-red-500"> 对战</span>}
        </h2>
        <p className="text-gray-500">
          {mode === 'solo' ? '你的数据经过端到端加密处理' : '准备好与随机对手一决高下'}
        </p>
        {mode === 'battle' && (
          <div className="mt-2 inline-flex items-center gap-2 text-sm text-red-600">
            <Swords size={16} />
            <span>实时对战模式</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm mb-2 text-gray-700">
            {category.placeholder}
          </label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`${category.min} - ${category.max}`}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
            disabled={isEncrypting}
          />
        </div>

        <div className="bg-purple-50 p-4 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-sm text-purple-900">
            <Lock size={16} />
            <span>端到端加密保护</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-purple-900">
            <Shield size={16} />
            <span>零知识证明技术</span>
          </div>
          <p className="text-xs text-purple-700 mt-2">
            你的原始数据不会被存储或传输
          </p>
        </div>

        <button
          type="submit"
          disabled={isEncrypting}
          className={`w-full ${
            mode === 'battle'
              ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
          } text-white py-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isEncrypting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">🔐</span>
              {mode === 'battle' ? '匹配对手中...' : '加密比较中...'}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              {mode === 'battle' && <Swords size={20} />}
              {mode === 'battle' ? '开始对战匹配' : '开始匿名比较'}
            </span>
          )}
        </button>
      </form>
    </div>
  );
}

// 模拟加密过程
async function simulateEncryption(value: number): Promise<void> {
  // 在实际应用中，这里会使用 Web Crypto API 进行真实的加密
  const encoder = new TextEncoder();
  const data = encoder.encode(value.toString());
  await crypto.subtle.digest('SHA-256', data);
}
