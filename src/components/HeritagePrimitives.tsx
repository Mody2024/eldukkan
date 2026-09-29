import type { ReactNode } from 'react';

type PanelProps = {
  children: ReactNode;
  title?: string;
  code?: string;
  className?: string;
};

export function HeritagePanel({ children, title, code, className = '' }: PanelProps) {
  return (
    <section className={`heritage-panel ${className}`}>
      {(title || code) && (
        <div className="heritage-panel__header">
          <span>{title || 'SYSTEM PANEL'}</span>
          <small>{code || 'V2'}</small>
        </div>
      )}
      <div className="heritage-panel__body">{children}</div>
    </section>
  );
}

type ButtonProps = {
  children: ReactNode;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

export function HeritageMechanicalButton({
  children, type = 'button', onClick, disabled = false, className = '',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`heritage-mechanical-button ${className}`}
    >
      <span>{children}</span>
    </button>
  );
}

export function HeritageLCD({ value, label }: { value: string; label?: string }) {
  return (
    <div className="heritage-lcd" aria-label={label || value}>
      {label && <span>{label}</span>}
      <strong>{value}</strong>
    </div>
  );
}

export function HeritageLED({ tone = 'green', label }: { tone?: 'green' | 'red' | 'amber' | 'blue'; label?: string }) {
  return (
    <span className="heritage-led-wrap">
      <i className={`heritage-led heritage-led--${tone}`} />
      {label && <span>{label}</span>}
    </span>
  );
}

export function HeritageSpeakerGrille() {
  return (
    <span className="heritage-speaker-grille" aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
    </span>
  );
}

export function HeritageScrew({ className = '' }: { className?: string }) {
  return <span className={`heritage-screw ${className}`} aria-hidden="true" />;
}
