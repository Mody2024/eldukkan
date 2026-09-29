import type { ChangeEvent, ReactNode } from 'react';
import './heritage-primitives.css';

export function HeritagePanel({ children, title, code, className = '' }: { children: ReactNode; title?: string; code?: string; className?: string }) {
  return (
    <section className={`heritage-panel ${className}`}>
      {(title || code) && <div className="heritage-panel__header"><span>{title || 'SYSTEM PANEL'}</span><small>{code || 'V2'}</small></div>}
      <div className="heritage-panel__body">{children}</div>
    </section>
  );
}

export function HeritageBezel({ children, className = '', label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div className={`heritage-bezel ${className}`}>
      <span className="heritage-screw heritage-bezel__screw--tl" /><span className="heritage-screw heritage-bezel__screw--tr" />
      <span className="heritage-screw heritage-bezel__screw--bl" /><span className="heritage-screw heritage-bezel__screw--br" />
      {label && <span className="heritage-bezel__label">{label}</span>}
      {children}
    </div>
  );
}

export function HeritageDisplay({ children, label, className = '' }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <div className={`heritage-display ${className}`}>
      {label && <span>{label}</span>}
      <div>{children}</div>
    </div>
  );
}

export function HeritageMechanicalButton({ children, type = 'button', onClick, disabled = false, className = '' }: { children: ReactNode; type?: 'button' | 'submit' | 'reset'; onClick?: () => void; disabled?: boolean; className?: string }) {
  return <button type={type} onClick={onClick} disabled={disabled} className={`heritage-mechanical-button ${className}`}><span>{children}</span></button>;
}

export function HeritageLCD({ value, label }: { value: string; label?: string }) {
  return <div className="heritage-lcd" aria-label={label || value}>{label && <span>{label}</span>}<strong>{value}</strong></div>;
}

export function HeritageLED({ tone = 'green', label }: { tone?: 'green' | 'red' | 'amber' | 'blue'; label?: string }) {
  return <span className="heritage-led-wrap"><i className={`heritage-led heritage-led--${tone}`} />{label && <span>{label}</span>}</span>;
}

export function HeritageSpeakerGrille() {
  return <span className="heritage-speaker-grille" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</span>;
}

export function HeritageScrew({ className = '' }: { className?: string }) {
  return <span className={`heritage-screw ${className}`} aria-hidden="true" />;
}

export function HeritageToggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label?: string }) {
  return (
    <label className="heritage-toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="heritage-toggle__track"><i /></span>
      {label && <span>{label}</span>}
    </label>
  );
}

export function HeritageSlider({ value, min, max, step = 1, onChange, label }: { value: number; min: number; max: number; step?: number; onChange: (value: number) => void; label?: string }) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value));
  return (
    <label className="heritage-slider">
      {label && <span>{label}</span>}
      <input type="range" min={min} max={max} step={step} value={value} onChange={handleChange} />
      <output>{value}</output>
    </label>
  );
}

export function HeritageDial({ value, label }: { value?: string; label?: string }) {
  return <span className="heritage-dial-large" aria-label={label || value || 'Dial'}><i /><b>{value}</b></span>;
}

export function HeritageFormField({ label, children, help, className = '' }: { label: string; children: ReactNode; help?: string; className?: string }) {
  return <label className={`heritage-form-field ${className}`}><span>{label}</span>{children}{help && <small>{help}</small>}</label>;
}

export function HeritageStatusBar({ children, tone = 'ready' }: { children: ReactNode; tone?: 'ready' | 'info' | 'warning' | 'error' }) {
  return <div className={`heritage-status-bar heritage-status-bar--${tone}`}><i />{children}</div>;
}

export function HeritageDialog({ children, open, title, onClose }: { children: ReactNode; open: boolean; title: string; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="heritage-dialog-backdrop" role="presentation" onClick={onClose}>
      <section className="heritage-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="heritage-dialog__header"><span>{title}</span><button type="button" onClick={onClose} aria-label="Close">×</button></div>
        <div className="heritage-dialog__body">{children}</div>
      </section>
    </div>
  );
}

export function HeritageDrawer({ children, open, title, onClose }: { children: ReactNode; open: boolean; title: string; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="heritage-drawer-backdrop" role="presentation" onClick={onClose}>
      <aside className="heritage-drawer" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="heritage-drawer__header"><span>{title}</span><button type="button" onClick={onClose} aria-label="Close">×</button></div>
        <div className="heritage-drawer__body">{children}</div>
      </aside>
    </div>
  );
}

export function HeritageProductCard({ children, className = '', code = 'ITEM' }: { children: ReactNode; className?: string; code?: string }) {
  return (
    <article className={`heritage-product-card ${className}`}>
      <div className="heritage-product-card__code">{code}</div>
      {children}
    </article>
  );
}
