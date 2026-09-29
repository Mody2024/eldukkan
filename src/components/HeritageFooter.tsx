import { Link } from 'react-router-dom';
import { Headset, PackageSearch, ShieldCheck } from 'lucide-react';
import { useStore } from '../store';
import { useTranslation } from '../lib/i18n';
import './heritage-footer.css';

export default function HeritageFooter() {
  const { storeName, footerCreditsEnabled, footerCreditsText, sponsors } = useStore();
  const { language } = useTranslation();
  const rtl = language === 'ar';

  return (
    <footer className="heritage-footer">
      <div className="heritage-footer__deck">
        <div className="heritage-footer__topline">
          <span>ELDUKKAN / CUSTOMER DECK</span>
          <span>V2 / HERITAGE</span>
        </div>
        <div className="heritage-footer__grid">
          <section className="heritage-footer__brand">
            <div className="heritage-footer__brandline">
              <span className="heritage-footer__brandmark">{storeName.charAt(0).toUpperCase()}</span>
              <div><strong>{storeName}</strong><small>{rtl ? 'متجر إلكتروني عملي وواضح' : 'A practical digital shop'}</small></div>
            </div>
            <div className="heritage-footer__trust">
              <ShieldCheck size={15} />
              <span>{rtl ? 'دفع آمن وبيانات الطلب محمية' : 'Secure checkout and order-safe flow'}</span>
            </div>
          </section>

          <nav className="heritage-footer__column" aria-label="Shop">
            <h2>{rtl ? 'التسوق' : 'SHOP'}</h2>
            <Link to="/">{rtl ? 'كل المنتجات' : 'All products'}</Link>
            <Link to="/wishlist">{rtl ? 'المفضلة' : 'Wishlist'}</Link>
            <Link to="/cart">{rtl ? 'السلة' : 'Cart'}</Link>
          </nav>

          <nav className="heritage-footer__column" aria-label="Orders">
            <h2>{rtl ? 'الطلبات' : 'ORDERS'}</h2>
            <Link to="/tracking"><PackageSearch size={14} />{rtl ? 'تتبع الطلب' : 'Track order'}</Link>
            <Link to={useStore.getState().userId ? '/account' : '/login'}>{rtl ? 'الحساب' : 'Account'}</Link>
          </nav>

          <section className="heritage-footer__service">
            <h2>{rtl ? 'الخدمة' : 'SERVICE'}</h2>
            <div className="heritage-footer__phone"><Headset size={16} /><span>{rtl ? 'المساعدة متاحة من الدكان' : 'Store assistance is available'}</span></div>
            <div className="heritage-footer__lcd"><small>PAYMENT</small><strong>COD / CARD</strong></div>
          </section>
        </div>

        {sponsors.length > 0 && (
          <div className="heritage-footer__sponsors">
            {sponsors.map((sponsor, idx) => (
              sponsor.url
                ? <a key={idx} href={sponsor.url} target="_blank" rel="noopener noreferrer"><img src={sponsor.logo_url} alt={sponsor.name} loading="lazy" /></a>
                : <img key={idx} src={sponsor.logo_url} alt={sponsor.name} loading="lazy" />
            ))}
          </div>
        )}

        <div className="heritage-footer__bottom">
          <span>© {new Date().getFullYear()} {storeName}. {rtl ? 'كل الحقوق محفوظة.' : 'All rights reserved.'}</span>
          {footerCreditsEnabled && <span>{footerCreditsText || 'Built with care for ElDukkan'}</span>}
        </div>
      </div>
    </footer>
  );
}
