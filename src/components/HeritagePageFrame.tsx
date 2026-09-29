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
  device: string;
  detail: string;
  icon: typeof Radio;
};

function getFrame(pathname: string): FrameKind {
  if (pathname === '/') return { key: 'browse', label: 'STORE FRONT', code: 'CH-01', subtitle: 'Browse the catalog / live stock', device: 'CATALOG RECEIVER', detail: 'CHANNEL 01', icon: Radio };
  if (pathname.startsWith('/category')) return { key: 'category', label: 'CATEGORY TUNER', code: 'CH-02', subtitle: 'Filter and scan one category', device: 'ROTARY TUNER', detail: 'BAND SELECT', icon: SlidersHorizontal };
  if (pathname.startsWith('/product')) return { key: 'product', label: 'PRODUCT DECK', code: 'VD-03', subtitle: 'Inspect item / choose quantity', device: 'CASSETTE DECK', detail: 'TAPE BAY 03', icon: CassetteTape };
  if (pathname.startsWith('/cart')) return { key: 'cart', label: 'CASH REGISTER', code: 'POS-04', subtitle: 'Review basket / totals', device: 'COUNTER REGISTER', detail: 'DRAWER 04', icon: ShoppingCart };
  if (pathname.startsWith('/checkout')) return { key: 'checkout', label: 'PAYMENT TERMINAL', code: 'POS-05', subtitle: 'Customer details / payment', device: 'DESK PAYPHONE', detail: 'LINE 05', icon: Banknote };
  if (pathname.startsWith('/tracking')) return { key: 'tracking', label: 'ORDER TRACKER', code: 'VCR-06', subtitle: 'Playback fulfillment status', device: 'VHS TRACKER', detail: 'REEL 06', icon: Archive };
  if (pathname.startsWith('/account')) return { key: 'account', label: 'HI-FI ACCOUNT', code: 'HF-07', subtitle: 'Orders / preferences / memory', device: 'PERSONAL HI-FI', detail: 'PROFILE 07', icon: CircleUserRound };
  if (pathname.startsWith('/wishlist')) return { key: 'wishlist', label: 'CATALOG RACK', code: 'CR-08', subtitle: 'Saved items / personal shelf', device: 'INDEX FILE', detail: 'FOLDER 08', icon: CassetteTape };
  if (pathname.startsWith('/login')) return { key: 'login', label: 'ACCESS KEYPAD', code: 'KEY-09', subtitle: 'Sign in / create account', device: 'HOME COMPUTER', detail: 'LOGIN 09', icon: KeyRound };
  return { key: 'service', label: 'SERVICE CONSOLE', code: 'SV-10', subtitle: 'ElDukkan customer service', device: 'SERVICE CRT', detail: 'HELP 10', icon: Headset };
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
        <div className="heritage-page-frame__device">
          <div className="heritage-page-frame__device-label">{frame.device}</div>
          <div className="heritage-page-frame__device-row">
            <span className="heritage-page-frame__meter"><i /></span>
            <strong>{frame.code}</strong>
            <span className="heritage-page-frame__knob" />
          </div>
          <div className="heritage-page-frame__device-detail">{frame.detail}</div>
        </div>
      </div>
      <div className="heritage-page-frame__content">{children}</div>
    </div>
  );
}
