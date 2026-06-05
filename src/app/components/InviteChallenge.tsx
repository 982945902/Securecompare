import { useState } from 'react';
import { motion } from 'motion/react';
import { Copy, Check, Share2, ArrowLeft } from 'lucide-react';
import { Category } from '../App';

type Props = {
  category: Category;
  value: number;
  onBack: () => void;
};

function encodeChallenge(categoryId: string, value: number): string {
  const payload = JSON.stringify({ c: categoryId, v: value });
  return btoa(payload);
}

export function InviteChallenge({ category, value, onBack }: Props) {
  const [copied, setCopied] = useState(false);

  const token = encodeChallenge(category.id, value);
  const link = `${window.location.origin}${window.location.pathname}#challenge=${token}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert(link);
    }
  };

  const handleShare = () => {
    const text = `我向你发起了${category.title}匿名PK挑战！点击链接来一决高下 🔐\n${link}`;
    if (navigator.share) {
      navigator.share({ title: '匿名比较器挑战', text });
    } else {
      handleCopy();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white p-10 rounded-2xl shadow-2xl max-w-xl mx-auto"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        返回
      </button>

      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center text-4xl">
          {category.icon}
        </div>
        <h2 className="text-3xl mb-2 text-gray-800">挑战链接已生成</h2>
        <p className="text-gray-500">
          你的{category.title}数据已加密，发送链接给好友，他们接受挑战后你将看到胜负结果
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">挑战链接</p>
        <p className="text-sm text-gray-700 break-all font-mono leading-relaxed">{link}</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-700">
        🔒 隐私说明：你的具体数值已加密编码在链接中，对方接受挑战时只会看到胜负结果，不会看到你的具体数值。
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className={`flex-1 py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
            copied
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {copied ? <Check size={20} /> : <Copy size={20} />}
          {copied ? '已复制！' : '复制链接'}
        </button>
        <button
          onClick={handleShare}
          className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 text-white py-4 rounded-xl hover:from-green-600 hover:to-teal-600 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <Share2 size={20} />
          分享给好友
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        链接有效期 24 小时 · 对手接受挑战后结果即时揭晓
      </p>
    </motion.div>
  );
}
