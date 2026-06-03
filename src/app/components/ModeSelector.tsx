import { Swords, User } from 'lucide-react';
import { Mode } from '../App';

type Props = {
  onSelectMode: (mode: Mode) => void;
};

export function ModeSelector({ onSelectMode }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
      <button
        onClick={() => onSelectMode('solo')}
        className="bg-white p-10 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative">
          <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <User size={40} className="text-blue-600" />
          </div>
          <h3 className="text-2xl mb-3">单人模式</h3>
          <p className="text-gray-600 mb-4">与全球数据库比较</p>
          <div className="text-sm text-gray-500 space-y-1">
            <p>✓ 查看你的百分位排名</p>
            <p>✓ 匿名统计分析</p>
            <p>✓ 隐私保护</p>
          </div>
        </div>
      </button>

      <button
        onClick={() => onSelectMode('battle')}
        className="bg-white p-10 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-orange-50 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center group-hover:bg-red-200 transition-colors">
            <Swords size={40} className="text-red-600" />
          </div>
          <h3 className="text-2xl mb-3">对战模式</h3>
          <p className="text-gray-600 mb-4">实时匹配在线玩家</p>
          <div className="text-sm text-gray-500 space-y-1">
            <p>✓ 随机匹配对手</p>
            <p>✓ 实时PK对决</p>
            <p>✓ 胜负即时揭晓</p>
          </div>
          <div className="mt-4 inline-block">
            <span className="bg-red-100 text-red-600 text-xs px-3 py-1 rounded-full animate-pulse">
              🔥 HOT
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}
