import { useState } from 'react';
import type { FormEvent } from 'react';
import './heritage.css';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronDown, Heart, Languages, Menu, Moon, Search, ShoppingBag, Sun,
  Truck, UserRound, X, Zap,
} from 'lucide-react';
import { useStore } from '../store';
import ExperiencePicker from './ExperiencePicker';
import { useTranslation } from '../lib/i18n';

export default function HeritageHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const {
    theme, toggleTheme, cart, wishlist, userId, storeName, logoUrl,
    language, setLanguage, announcementBanner,
  } = useStore();
  const { t } = useTranslation();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/?q=${encodeURIComponent(value)}` : '/');
    setMobileOpen(false);
  };

  const labels = language === 'ar'
    ? { live: 'الدكان مفتوح', search: 'ابحث في الدكان', browse: 'تصفح القنوات', track: 'تتبع الطلب', wish: 'المفضلة', account: 'الحساب', cart: 'السلة', open: 'فتح القائمة', close: 'إغلاق القائمة', theme: theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن', language: 'English' }
    : { live: 'STORE LIVE', search: 'SEARCH THE STORE', browse: 'CHANNELS', track: 'TRACK ORDER', wish: 'WISHLIST', account: 'ACCOUNT', cart: 'CART', open: 'Open menu', close: 'Close menu', theme: theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE', language: 'العربية' };

  return (
    <>
      <div className="heritage-utility">
        <div className="heritage-utility__inner">
          <span className="heritage-status"><i className="heritage-led heritage-led--green" /> {labels.live}</span>
          <span className="heritage-utility__hint"><Truck size={13} /> {t('fast_delivery')}</span>
          <span className="heritage-utility__hint heritage-utility__help"><Zap size={13} /> {t('need_help')}</span>
        </div>
      </div>

      {announcementBanner && (
        <div className="heritage-announcement">
          <span className="heritage-announcement__light" />
          <span>{announcementBanner}</span>
        </div>
      )}

      <header className="heritage-header">
        <div className="heritage-header__bezel">
          <span className="heritage-screw heritage-screw--tl" />
          <span className="heritage-screw heritage-screw--tr" />
          <span className="heritage-screw heritage-screw--bl" />
          <span className="heritage-screw heritage-screw--br" />

          <div className="heritage-header__topline">
            <span className="heritage-machine-label">ELDUKKAN / RETAIL SYSTEM 02</span>
            <span className="heritage-machine-label heritage-machine-label--right">READY / 220V</span>
          </div>

          <div className="heritage-header__body">
            <Link to="/" className="heritage-brand-module" aria-label={storeName}>
              <div className="heritage-logo">
                {logoUrl ? (
                  <img src={logoUrl} alt="" width="56" height="56" loading="eager" decoding="async" />
                ) : (
                  <span>{storeName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="heritage-brand-copy">
                <strong>{storeName}</strong>
                <small>NEIGHBORHOOD DIGITAL SHOP</small>
              </div>
            </Link>

            <form onSubmit={submitSearch} className="heritage-search-console" data-guide="search">
              <div className="heritage-crt">
                <div className="heritage-crt__glass">
                  <div className="heritage-crt__scanlines" />
                  <span className="heritage-crt__tag">CH 01 / SEARCH</span>
                  <div className="heritage-crt__row">
                    <Search size={18} />
                    <input
                      data-ai-target="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={language === 'ar' ? 'ابحث عن منتج...' : 'Type product, category, or keyword...'}
                      aria-label={labels.search}
                    />
                    <button className="heritage-display-go" type="submit" aria-label={language === 'ar' ? 'بحث' : 'Search'}>GO</button>
                  </div>
                </div>
              </div>
              <div className="heritage-tuner">
                <span className="heritage-machine-label">TUNER</span>
                <span className="heritage-dial" aria-hidden="true"><i /></span>
                <span className="heritage-tuner-value">01</span>
              </div>
            </form>

            <div className="heritage-control-bank">
              <Link to="/wishlist" className="heritage-control" data-ai-target="wishlist" aria-label={labels.wish}>
                <Heart size={17} />
                <span className="heritage-control__label">{labels.wish}</span>
                {wishlist.length > 0 && <b>{wishlist.length}</b>}
              </Link>
              <Link to={userId ? '/account' : '/login'} className="heritage-control" data-ai-target="account" aria-label={labels.account}>
                <UserRound size={17} />
                <span className="heritage-control__label">{labels.account}</span>
              </Link>
              <button type="button" className="heritage-control heritage-control--mini" onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} aria-label={labels.language}>
                <Languages size={17} />
                <span>{language === 'en' ? 'AR' : 'EN'}</span>
              </button>
              <button type="button" className="heritage-control heritage-control--mini" onClick={toggleTheme} aria-label={labels.theme}>
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                <span>{theme === 'dark' ? 'SUN' : 'MOON'}</span>
              </button>
              <div className="heritage-picker"><ExperiencePicker /></div>
              <Link to="/cart" data-guide="cart" data-ai-target="cart" className="heritage-cart-key">
                <ShoppingBag size={18} />
                <span>{labels.cart}</span>
                {cartCount > 0 && <b>{cartCount}</b>}
              </Link>
            </div>
          </div>

          <nav className="heritage-channel-strip" aria-label="Store navigation">
            <Link to="/" className="heritage-channel"><span>01</span>{labels.browse}</Link>
            <Link to="/tracking" className="heritage-channel"><span>02</span>{labels.track}</Link>
            <Link to="/wishlist" className="heritage-channel"><span>03</span>{labels.wish}</Link>
            <Link to={userId ? '/account' : '/login'} className="heritage-channel"><span>04</span>{labels.account}</Link>
            <span className="heritage-channel heritage-channel--info"><ChevronDown size={14} /> V2 / HERITAGE</span>
          </nav>

          <button
            type="button"
            className="heritage-mobile-toggle"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={mobileOpen ? labels.close : labels.open}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="heritage-mobile-panel">
            <form onSubmit={submitSearch} className="heritage-mobile-search">
              <Search size={17} />
              <input
                data-ai-target="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={language === 'ar' ? 'ابحث...' : 'Search the store...'}
                aria-label={labels.search}
              />
              <button type="submit">GO</button>
            </form>
            <div className="heritage-mobile-grid">
              <Link to="/" onClick={() => setMobileOpen(false)}>01 · {labels.browse}</Link>
              <Link to="/tracking" onClick={() => setMobileOpen(false)}>02 · {labels.track}</Link>
              <Link to="/wishlist" onClick={() => setMobileOpen(false)}>03 · {labels.wish}</Link>
              <Link to={userId ? '/account' : '/login'} onClick={() => setMobileOpen(false)}>04 · {labels.account}</Link>
              <Link to="/cart" onClick={() => setMobileOpen(false)}>05 · {labels.cart} {cartCount ? `[${cartCount}]` : ''}</Link>
              <button type="button" onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}>{labels.language}</button>
              <button type="button" onClick={toggleTheme}>{labels.theme}</button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
