import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Copy, Check, Share2, ArrowLeft, Loader2, Trophy, Frown, Equal } from 'lucide-react';
import { Category } from '../App';
import {
  createInviteChallenge,
  type InviteChallengeSession,
} from '../protocol/webrtcChallenge';
import type { CompareOutcome } from '../protocol/compareSession';
import { mpzProtocolEngine } from '../protocol/mpzProtocolEngine';

type Props = {
  category: Category;
  value: number;
  onBack: () => void;
};

export function InviteChallenge({ category, value, onBack }: Props) {
  const engineInfo = mpzProtocolEngine.info;
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState('');
  const [status, setStatus] = useState('正在创建 WebRTC 房间...');
  const [error, setError] = useState('');
  const [result, setResult] = useState<CompareOutcome | null>(null);
  const sessionRef = useRef<InviteChallengeSession | null>(null);

  useEffect(() => {
    let active = true;

    createInviteChallenge(category.id, value)
      .then((session) => {
        if (!active) {
          session.close();
          return;
        }
        sessionRef.current = session;
        setLink(`${window.location.origin}${window.location.pathname}#challenge=${session.token}`);
        setStatus('房间已创建，等待好友打开链接...');
        return session.waitForResult();
      })
      .then((nextResult) => {
        if (!active || !nextResult) return;
        setResult(nextResult);
        setStatus(engineInfo.mpcReady ? 'MPC 比较完成' : 'WebRTC 比较原型完成');
      })
      .catch((nextError) => {
        if (!active) return;
        setError(nextError instanceof Error ? nextError.message : 'WebRTC 连接失败');
        setStatus('连接失败');
      });

    return () => {
      active = false;
      sessionRef.current?.close();
    };
  }, [category.id, value]);

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert(link);
    }
  };

  const handleShare = () => {
    if (!link) return;
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
          发送链接给好友。链接只包含房间号，握手由 signaling 转发，双方通过 WebRTC DataChannel 连接。
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">挑战链接</p>
        <p className="text-sm text-gray-700 break-all font-mono leading-relaxed">
          {link || '正在生成...'}
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-700">
        协议状态：{engineInfo.label}。{engineInfo.notice}
      </div>

      <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-6 text-sm text-green-700 flex items-center gap-2">
        {!result && !error && <Loader2 size={18} className="animate-spin" />}
        {result === 'win' && <Trophy size={18} />}
        {result === 'lose' && <Frown size={18} />}
        {result === 'draw' && <Equal size={18} />}
        <span>{result ? resultLabel(result) : status}</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          disabled={!link}
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
          disabled={!link}
          className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 text-white py-4 rounded-xl hover:from-green-600 hover:to-teal-600 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Share2 size={20} />
          分享给好友
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        保持此页面打开；自测时请在另一个浏览器窗口打开挑战链接
      </p>
    </motion.div>
  );
}

function resultLabel(result: CompareOutcome): string {
  if (result === 'win') return '你赢了！你的数值更大。';
  if (result === 'lose') return '你输了，对方数值更大。';
  return '平局，双方数值相等。';
}
