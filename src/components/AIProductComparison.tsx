import { ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

type AIProduct = {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  stock: number | null;
  category: string | null;
  rating: number | null;
  review_count?: number | null;
  description?: string;
};

type Props = {
  products: AIProduct[];
  language: 'en' | 'ar';
};

export default function AIProductComparison({ products, language }: Props) {
  const rows = [
    { key: 'price', en: 'Current price', ar: 'السعر الحالي' },
    { key: 'stock', en: 'Stock', ar: 'المخزون' },
    { key: 'category', en: 'Category', ar: 'الفئة' },
    { key: 'rating', en: 'Rating', ar: 'التقييم' },
  ] as const;

  const priceOf = (p: AIProduct) => p.sale_price ?? p.price;

  if (products.length < 2) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
      <table className="min-w-[520px] w-full text-xs">
        <thead>
          <tr className="border-b border-stone-200 dark:border-stone-700">
            <th className="p-3 text-left rtl:text-right text-stone-500 font-black">
              {language === 'ar' ? 'مقارنة' : 'Compare'}
            </th>
            {products.slice(0, 3).map((product) => (
              <th key={product.id} className="p-3 text-left rtl:text-right align-top">
                <Link to={'/product/' + product.id} className="font-black dark:text-white hover:text-brand-500 inline-flex items-center gap-1">
                  <span className="line-clamp-2">{product.name}</span>
                  <ArrowRight size={12} className="shrink-0" />
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b last:border-0 border-stone-100 dark:border-stone-800">
              <th className="p-3 text-left rtl:text-right text-stone-500 font-bold whitespace-nowrap">
                {language === 'ar' ? row.ar : row.en}
              </th>
              {products.slice(0, 3).map((product) => {
                const value = row.key === 'price'
                  ? 'EGP ' + priceOf(product)
                  : row.key === 'stock'
                    ? (Number(product.stock ?? 0) > 0
                      ? (language === 'ar' ? 'متوفر' : 'In stock')
                      : (language === 'ar' ? 'غير متوفر' : 'Out of stock'))
                    : row.key === 'category'
                      ? (product.category || '—')
                      : product.review_count && product.review_count > 0 && product.rating != null
                        ? (
                          <span className="inline-flex items-center gap-1">
                            <Star size={12} className="fill-brand-500 text-brand-500" />
                            {Number(product.rating).toFixed(1)} ({product.review_count})
                          </span>
                        )
                        : (language === 'ar' ? 'لا يوجد تقييمات' : 'No verified reviews');
                return <td key={product.id} className="p-3 font-bold dark:text-stone-200">{value}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
