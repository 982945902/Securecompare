import { Swords, User, Link } from 'lucide-react';
import { Mode } from '../App';

type Props = {
  onSelectMode: (mode: Mode) => void;
};

export function ModeSelector({ onSelectMode }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
      <button
        onClick={() => onSelectMode('solo')}
        className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative">
          <div className="w-16 h-16 mx-auto mb-5 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <User size={32} className="text-blue-600" />
          </div>
          <h3 className="text-xl mb-2">单人模式</h3>
          <p className="text-gray-600 text-sm mb-4">与全球数据库比较</p>
          <div className="text-xs text-gray-500 space-y-1 text-left">
            <p>✓ 查看你的百分位排名</p>
            <p>✓ 匿名统计分析</p>
            <p>✓ 隐私保护</p>
          </div>
        </div>
      </button>

      <button
        onClick={() => onSelectMode('battle')}
        className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-orange-50 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative">
          <div className="w-16 h-16 mx-auto mb-5 bg-red-100 rounded-full flex items-center justify-center group-hover:bg-red-200 transition-colors">
            <Swords size={32} className="text-red-600" />
          </div>
          <h3 className="text-xl mb-2">随机对战</h3>
          <p className="text-gray-600 text-sm mb-4">实时匹配在线玩家</p>
          <div className="text-xs text-gray-500 space-y-1 text-left">
            <p>✓ 随机匹配对手</p>
            <p>✓ 实时PK对决</p>
            <p>✓ 胜负即时揭晓</p>
          </div>
          <div className="mt-3">
            <span className="bg-red-100 text-red-600 text-xs px-3 py-1 rounded-full animate-pulse">
              🔥 HOT
            </span>
          </div>
        </div>
      </button>

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
    </div>
  );
}
