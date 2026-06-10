import { useEffect, useState } from 'react';
import { ArrowLeft, Lock, Medal, RefreshCw, Send } from 'lucide-react';
import type { Category } from '../App';
import {
  loadLeaderboard,
  submitLeaderboardValue,
  type LeaderboardBucket,
} from '../protocol/leaderboardApi';

type Props = {
  category: Category;
  onBack: () => void;
};

type Status = 'idle' | 'loading' | 'submitting' | 'ready' | 'error';

export function EncryptedLeaderboard({ category, onBack }: Props) {
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('匿名玩家');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [rankRange, setRankRange] = useState<{ start: number; end: number } | null>(null);
  const [buckets, setBuckets] = useState<LeaderboardBucket[]>([]);

  useEffect(() => {
    void refresh();
  }, []);

  const refresh = async () => {
    setStatus('loading');
    setError(null);
    try {
      const response = await loadLeaderboard(category);
      setBuckets(response.buckets);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : '排行榜加载失败');
      setStatus('error');
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < category.min || numericValue > category.max) {
      setError(`请输入 ${category.min} 到 ${category.max} 之间的数值`);
      return;
    }

    setStatus('submitting');
    setError(null);
    try {
      const response = await submitLeaderboardValue({
        category,
        value: numericValue,
        label: label.trim() || '匿名玩家',
      });
      setRankRange(response.rankRange);
      setBuckets(response.buckets);
      setValue('');
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : '排行榜提交失败');
      setStatus('error');
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={20} />
        返回类别选择
      </button>

      <section className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <div className="text-5xl mb-3">{category.icon}</div>
            <h2 className="text-3xl mb-2">加密排行榜 · {category.title}</h2>
            <p className="text-gray-600">
              浏览器本地生成 m-H-ORE 加密排序材料，服务端只接收密文并维护顺序索引。
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={status === 'loading' || status === 'submitting'}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-50"
          >
            <RefreshCw size={18} />
            刷新
          </button>
        </div>

        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="显示昵称"
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
            disabled={status === 'submitting'}
          />
          <input
            type="number"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={`${category.min} - ${category.max} ${category.unit}`}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
            disabled={status === 'submitting'}
          />
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
          >
            {status === 'submitting' ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
            加密提交
          </button>
        </form>

        <div className="mt-4 flex items-center gap-2 text-sm text-purple-800 bg-purple-50 rounded-xl p-3">
          <Lock size={16} />
          <span>提交包不包含明文 value；服务端 adapter 只暴露密文比较接口。</span>
        </div>

        {rankRange && (
          <div className="mt-4 bg-green-50 text-green-800 rounded-xl p-3">
            已插入加密索引，当前排名区间：#{rankRange.start}
            {rankRange.end !== rankRange.start ? ` - #${rankRange.end}` : ''}
          </div>
        )}

        {error && <div className="mt-4 bg-red-50 text-red-700 rounded-xl p-3">{error}</div>}
      </section>

      <section className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-5">
          <Medal className="text-purple-600" size={24} />
          <h3 className="text-2xl">Encrypted Order Index</h3>
        </div>

        {buckets.length === 0 ? (
          <div className="text-gray-500 py-8 text-center">还没有加密提交。</div>
        ) : (
          <div className="space-y-3">
            {buckets.map((bucket) => (
              <div
                key={bucket.bucketId}
                className="border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <div className="text-sm text-gray-500">
                    #{bucket.rankStart}
                    {bucket.rankEnd !== bucket.rankStart ? ` - #${bucket.rankEnd}` : ''}
                    {' · '}
                    {bucket.count} 个同值加密提交
                  </div>
                  <div className="font-medium text-gray-900">
                    {bucket.entries.map((entry) => entry.label).join(', ')}
                  </div>
                </div>
                <div className="text-xs text-gray-400 font-mono">{bucket.bucketId.slice(0, 12)}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
