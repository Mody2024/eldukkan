import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Archive, Banknote, CassetteTape, CircleUserRound, Headset, KeyRound, Radio, ShoppingCart, SlidersHorizontal } from 'lucide-react';
import './heritage-frame.css';
import './heritage-site.css';

type FrameKind = {
  key: string;
  label: string;
  code: string;
  subtitle: string;
  icon: typeof Radio;
};

function getFrame(pathname: string): FrameKind {
  if (pathname === '/') return { key: 'browse', label: 'STORE FRONT', code: 'CH-01', subtitle: 'Browse catalog / live stock', icon: Radio };
  if (pathname.startsWith('/category')) return { key: 'browse', label: 'CATEGORY TUNER', code: 'CH-02', subtitle: 'Filter and scan products', icon: SlidersHorizontal };
  if (pathname.startsWith('/product')) return { key: 'product', label: 'PRODUCT DECK', code: 'VD-03', subtitle: 'Inspect item / choose quantity', icon: CassetteTape };
  if (pathname.startsWith('/cart')) return { key: 'cart', label: 'CHECKOUT REGISTER', code: 'POS-04', subtitle: 'Review basket / totals', icon: ShoppingCart };
  if (pathname.startsWith('/checkout')) return { key: 'checkout', label: 'PAYMENT TERMINAL', code: 'POS-05', subtitle: 'Customer details / payment', icon: Banknote };
  if (pathname.startsWith('/tracking')) return { key: 'tracking', label: 'ORDER VCR', code: 'VCR-06', subtitle: 'Playback fulfillment status', icon: Archive };
  if (pathname.startsWith('/account')) return { key: 'account', label: 'HI-FI ACCOUNT', code: 'HF-07', subtitle: 'Orders / preferences / memory', icon: CircleUserRound };
  if (pathname.startsWith('/wishlist')) return { key: 'wishlist', label: 'CATALOG RACK', code: 'CR-08', subtitle: 'Saved items / personal shelf', icon: CassetteTape };
  if (pathname.startsWith('/login')) return { key: 'login', label: 'ACCESS KEYPAD', code: 'KEY-09', subtitle: 'Sign in / create account', icon: KeyRound };
  return { key: 'service', label: 'SERVICE CONSOLE', code: 'SV-10', subtitle: 'ElDukkan customer service', icon: Headset };
}

export default function HeritagePageFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const frame = getFrame(pathname);
  const Icon = frame.icon;

  return (
    <div className={`heritage-page-frame heritage-page-frame--${frame.key}`}>
      <div className="heritage-page-frame__deck">
        <div className="heritage-page-frame__screws" aria-hidden="true">
          <i /><i /><i /><i />
        </div>
        <div className="heritage-page-frame__identity">
          <span className="heritage-page-frame__icon"><Icon size={17} /></span>
          <span>
            <strong>{frame.label}</strong>
            <small>{frame.subtitle}</small>
          </span>
        </div>
        <div className="heritage-page-frame__display">
          <span>MODE</span>
          <strong>{frame.code}</strong>
          <em><i /> READY</em>
        </div>
      </div>
      <div className="heritage-page-frame__content">{children}</div>
    </div>
  );
}
