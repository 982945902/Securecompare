import { ArrowLeft } from 'lucide-react';
import { Category } from '../App';

type Props = {
  categories: Category[];
  onSelect: (category: Category) => void;
  onBack: () => void;
};

export function CompareCategories({ categories, onSelect, onBack }: Props) {
  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        返回模式选择
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelect(category)}
            className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
          >
            <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
              {category.icon}
            </div>
            <h3 className="text-2xl mb-2">{category.title}</h3>
            <p className="text-gray-500">点击匿名比较</p>
          </button>
        ))}
      </div>
    </div>
  );
}
