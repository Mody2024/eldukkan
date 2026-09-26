import { X, SlidersHorizontal, Check } from 'lucide-react';

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'trending';

type Props = {
  open: boolean;
  categories: string[];
  activeCategory: string | null;
  sortBy: SortOption;
  onCategory: (category: string | null) => void;
  onSort: (sort: SortOption) => void;
  onClose: () => void;
};

export default function MobileFilterSheet({ open, categories, activeCategory, sortBy, onCategory, onSort, onClose }: Props) {
  if (!open) return null;

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'featured', label: 'Featured' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Top Rated' },
    { value: 'trending', label: 'Trending' },
  ];

  return (
    <div className="md:hidden fixed inset-0 z-[75] bg-stone-950/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute inset-x-0 bottom-0 mobile-safe-bottom rounded-t-3xl bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 shadow-2xl p-4 max-h-[78vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                <SlidersHorizontal size={18} />
              </div>
              <div>
                <p className="font-black dark:text-white">Filter & sort</p>
                <p className="text-xs text-stone-500">Choose how you want to browse.</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500" aria-label="Close filters">
              <X size={18} />
            </button>
          </div>

          <section className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wide text-stone-500">Sort</h3>
            <div className="grid grid-cols-1 gap-1.5">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onSort(option.value)}
                  className={`w-full min-h-12 rounded-xl px-3 flex items-center justify-between text-sm font-bold transition ${sortBy === option.value ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-200'}`}
                >
                  <span>{option.label}</span>
                  {sortBy === option.value && <Check size={17} />}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2 mt-5">
            <h3 className="text-xs font-black uppercase tracking-wide text-stone-500">Category</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onCategory(null)}
                className={`min-h-12 rounded-xl px-3 text-sm font-bold transition ${!activeCategory ? 'bg-brand-500 text-white' : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-200'}`}
              >
                All products
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => onCategory(category)}
                  className={`min-h-12 rounded-xl px-3 text-sm font-bold transition text-left rtl:text-right ${activeCategory === category ? 'bg-brand-500 text-white' : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-200'}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </section>

          <button type="button" onClick={onClose} className="w-full min-h-12 mt-5 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-black">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
