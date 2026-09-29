import { Link } from 'react-router-dom';
import './heritage-hero.css';
import { ArrowRight, Radio, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { useTranslation } from '../lib/i18n';
import { HeritageBezel, HeritageLCD, HeritageStatusBar } from './HeritagePrimitives';

export default function HeritageCatalogHero() {
  const { storeName, heroHeadline, heroSubheadline, heroImageUrl } = useStore();
  const { language } = useTranslation();
  const rtl = language === 'ar';

  return (
    <HeritageBezel className="heritage-catalog-hero" label="CRT CATALOG / CH-01">
      <div className="heritage-catalog-hero__screen">
        <div className="heritage-catalog-hero__noise" />
        <div className="heritage-catalog-hero__scan" />
        <div className="heritage-catalog-hero__copy">
          <div className="heritage-catalog-hero__eyebrow"><Radio size={13} /> {storeName} / LIVE CATALOG</div>
          <h1>{heroHeadline || (rtl ? 'الدكان فاتح. اختار اللي محتاجه.' : 'The shop is open. Find what you need.')}</h1>
          <p>{heroSubheadline || (rtl ? 'منتجات حقيقية من الكتالوج الحالي، بأسلوب بسيط وسهل.' : 'Real products from the current catalog, presented simply and clearly.')}</p>
          <div className="heritage-catalog-hero__actions">
            <Link to="#products-grid" className="heritage-hero-button">{rtl ? 'تصفح المنتجات' : 'Browse products'} <ArrowRight size={14} /></Link>
            <HeritageStatusBar tone="ready">{rtl ? 'الكتالوج متاح الآن' : 'CATALOG ONLINE'}</HeritageStatusBar>
          </div>
        </div>
        <div className="heritage-catalog-hero__visual">
          {heroImageUrl ? (
            <img src={heroImageUrl} alt="" loading="eager" decoding="async" />
          ) : (
            <div className="heritage-catalog-hero__placeholder"><Sparkles size={30} /><span>SHOP / CH 01</span></div>
          )}
          <div className="heritage-catalog-hero__lcds">
            <HeritageLCD label="SYSTEM" value="READY" />
            <HeritageLCD label="CHANNEL" value="01" />
          </div>
        </div>
      </div>
    </HeritageBezel>
  );
}
