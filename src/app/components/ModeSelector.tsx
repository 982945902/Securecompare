import { Link, ListOrdered } from 'lucide-react';
import { Mode } from '../App';

type Props = {
  onSelectMode: (mode: Mode) => void;
};

export function ModeSelector({ onSelectMode }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      <button
        onClick={() => onSelectMode('invite')}
        className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-teal-50 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative">
          <div className="w-16 h-16 mx-auto mb-5 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
            <Link size={32} className="text-green-600" />
          </div>
          <h3 className="text-xl mb-2">邀请PK</h3>
          <p className="text-gray-600 text-sm mb-4">生成链接挑战指定好友</p>
          <div className="text-xs text-gray-500 space-y-1 text-left">
            <p>✓ 生成专属挑战链接</p>
            <p>✓ 好友点击即可PK</p>
            <p>✓ 双方数据全程加密</p>
          </div>
          <div className="mt-3">
            <span className="bg-green-100 text-green-600 text-xs px-3 py-1 rounded-full">
              🔗 NEW
            </span>
          </div>
        </div>
      </button>

      <button
        onClick={() => onSelectMode('leaderboard')}
        className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative">
          <div className="w-16 h-16 mx-auto mb-5 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
            <ListOrdered size={32} className="text-purple-600" />
          </div>
          <h3 className="text-xl mb-2">加密排行榜</h3>
          <p className="text-gray-600 text-sm mb-4">异步提交加密成绩</p>
          <div className="text-xs text-gray-500 space-y-1 text-left">
            <p>✓ 浏览器本地生成密文</p>
            <p>✓ Cloudflare 持久化排序</p>
            <p>✓ 同浏览器提交自动更新</p>
          </div>
          <div className="mt-3">
            <span className="bg-purple-100 text-purple-600 text-xs px-3 py-1 rounded-full">
              ORE
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}
