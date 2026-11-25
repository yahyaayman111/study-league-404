import { useEffect } from "react";
import { createPortal } from "react-dom";

const PATHS = {
  trophy: <><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0z" /><path d="M17 5h3v2a4 4 0 0 1-4 4M7 5H4v2a4 4 0 0 0 4 4" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  book: <><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" /><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  coin: <><circle cx="12" cy="12" r="9" /><path d="M9 8h6M9 12h6M12 8v8" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  "chevron-left": <path d="m15 18-6-6 6-6" />,
  "chevron-right": <path d="m9 18 6-6-6-6" />,
  download: <><path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 21h14" /></>,
  upload: <><path d="M12 21V9M7 14l5-5 5 5" /><path d="M5 3h14" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
  sparkles: <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  chart: <><path d="M3 3v18h18" /><path d="m7 15 4-5 4 3 5-7" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  medal: <><circle cx="12" cy="9" r="5" /><path d="m8.5 13-2 8 5.5-3 5.5 3-2-8" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  alert: <><path d="M12 3 2 21h20z" /><path d="M12 9v5M12 18h.01" /></>,
  play: <path d="m8 5 11 7-11 7z" />,
  file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
  trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /><path d="M10 11v5M14 11v5" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></>,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  crown: <path d="m3 7 4 3 5-6 5 6 4-3-2 12H5z" />,
  flame: <path d="M12 22c4 0 7-2.7 7-6.5 0-4-3-6.5-4.5-9.5-.7 3-2.5 4-2.5 4S11 7 10 3C8 7 5 9.5 5 15.5 5 19.3 8 22 12 22z" />,
  star: <path d="m12 3 2.8 5.9 6.2.8-4.6 4.3 1.2 6.1L12 17.8 6.4 20.1l1.2-6.1L3 9.7l6.2-.8z" />,
  pen: <><path d="m12 19 7-7 3 3-7 7-4 1z" /><path d="m18 13-7-7-8 8v5h5z" /></>,
  arrow: <path d="M5 12h14M12 5l7 7-7 7" />,
  back: <path d="M19 12H5M12 19l-7-7 7-7" />,
  eyeoff: <><path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.6 8.5 2 12 2 12s3.5 7 10 7a10 10 0 0 0 4.2-.9" /></>,
};

export function LIcon({ name, size = 18, className = "" }) {
  return (
    <svg className={`lg-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name] || PATHS.sparkles}
    </svg>
  );
}

export function Avatar({ name = "?", size = 38 }) {
  return <span className="lg-avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>{name.slice(0, 1)}</span>;
}

export function Pill({ tone = "slate", children, icon }) {
  return <span className={`lg-pill ${tone}`}>{icon && <LIcon name={icon} size={12} />}{children}</span>;
}

export function Stat({ icon, label, value, hint, tone = "blue" }) {
  return (
    <div className="lg-stat">
      <div className={`lg-stat-icon ${tone}`}><LIcon name={icon} size={20} /></div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint && <small>{hint}</small>}
      </div>
    </div>
  );
}

export function SectionHead({ title, sub, action }) {
  return (
    <div className="lg-section-head">
      <div>
        <h3>{title}</h3>
        {sub && <p>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ icon = "sparkles", title, text, action }) {
  return (
    <div className="lg-empty">
      <div className="lg-empty-icon"><LIcon name={icon} size={26} /></div>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className = "" }) {
  return (
    <div className={`lg-tabs ${className}`} role="tablist">
      {tabs.map((tab) => (
        <button key={tab.key} type="button" role="tab" aria-selected={value === tab.key}
          className={`lg-tab ${value === tab.key ? "active" : ""}`} onClick={() => onChange(tab.key)}>
          {tab.icon && <LIcon name={tab.icon} size={15} />}
          {tab.label}
          {tab.count ? <b>{tab.count}</b> : null}
        </button>
      ))}
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, footer, size = "md", tone = "" }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return createPortal(
    <div className={`lg-modal-backdrop ${tone}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={`lg-modal ${size}`} role="dialog" aria-modal="true">
        <div className="lg-modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="lg-icon-btn" onClick={onClose} aria-label="إغلاق"><LIcon name="x" size={18} /></button>
        </div>
        <div className="lg-modal-body">{children}</div>
        {footer && <div className="lg-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function Field({ label, hint, children, required }) {
  return (
    <label className="lg-field">
      <span>{label}{required && <em> *</em>}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function toastNode(toast, onClose) {
  if (!toast) return null;
  return (
    <div className={`lg-toast ${toast.type || "success"}`} role="status">
      <LIcon name={toast.type === "error" ? "alert" : "check"} size={17} />
      <span>{toast.text}</span>
      <button type="button" onClick={onClose} aria-label="إغلاق"><LIcon name="x" size={14} /></button>
    </div>
  );
}

export function Loading({ text = "جارٍ تجهيز الملفات..." }) {
  return <div className="lg-loading"><span className="lg-spinner" />{text}</div>;
}

export function BadgeChip({ badge, small = false }) {
  return (
    <span className={`lg-badge-chip ${small ? "sm" : ""}`} title={`${badge.en} — ${badge.desc}`}>
      <span aria-hidden="true">{badge.icon}</span>
      <span>{badge.ar}</span>
    </span>
  );
}
