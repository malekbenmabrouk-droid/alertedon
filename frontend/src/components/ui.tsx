import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { Illustration, type ArtName } from "./viz/Illustration";
import type { Tone } from "../lib/labels";
import type { GroupeSanguin } from "../types/api";

type Variant = "primary" | "secondary" | "quiet" | "ink";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
  icon?: IconName;
  iconRight?: IconName;
  iconOnly?: boolean;
  loading?: boolean;
  shortcut?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon, iconRight, iconOnly, loading, shortcut, className = "", children, disabled, type = "button", ...rest },
  ref,
) {
  const cls = ["btn", `btn-${variant}`, size === "sm" && "btn-sm", iconOnly && "btn-icon", className].filter(Boolean).join(" ");
  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Icon name="loader" className="spin" /> : icon ? <Icon name={icon} /> : null}
      {!iconOnly && children}
      {iconRight && !loading && <Icon name={iconRight} />}
      {shortcut && !iconOnly && <kbd className="sm-hide">{shortcut}</kbd>}
    </button>
  );
});

/** Blood group as a round seal, the one recurring "blood" mark of the interface. */
export function Seal({ groupe, size, ghost }: { groupe: GroupeSanguin; size?: "sm" | "lg" | "xl"; ghost?: boolean }) {
  return (
    <span className={`seal${size ? ` ${size}` : ""}${ghost ? " ghost" : ""}${groupe.length > 2 ? " long" : ""}`} title={`Groupe ${groupe}`} aria-label={`Groupe ${groupe}`} role="img">
      {groupe}
    </span>
  );
}

export function Status({ tone = "neutral", children }: { tone?: Tone | "pulse"; children: ReactNode }) {
  return <span className="status" data-tone={tone}>{children}</span>;
}

export function Meter({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="meter" data-done={pct >= 1}>
      <div className="meter-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)} aria-label={label}>
        <span className="meter-fill" style={{ width: `${pct * 100}%` }} />
      </div>
      <span className="val">{Math.round(pct * 100)}%</span>
    </div>
  );
}

export function Skeleton({ width = "100%", height = 12 }: { width?: number | string; height?: number }) {
  return <span className="skeleton" style={{ width, height }} aria-hidden="true" />;
}

export function SkeletonRows({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Chargement" style={{ display: "grid", gap: 22, padding: "8px 0" }}>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 24 }}>
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} width={`${50 + ((r * 7 + c * 13) % 45)}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

interface EmptyProps {
  art?: ArtName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  tone?: "danger";
}

export function EmptyState({ art = "drop", title, children, action, tone }: EmptyProps) {
  return (
    <div className="empty" data-tone={tone} role={tone === "danger" ? "alert" : undefined}>
      <Illustration name={art} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : "Erreur inattendue.";
  return (
    <EmptyState art="alert" tone="danger" title="Ces données n'ont pas pu être chargées"
      action={onRetry && <Button size="sm" icon="refresh" onClick={onRetry}>Réessayer</Button>}>
      {message}
    </EmptyState>
  );
}

export function PageIntro({ overline, title, lede, actions }: { overline?: ReactNode; title: ReactNode; lede?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-intro">
      <div>
        {overline && <div className="overline">{overline}</div>}
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  );
}

export function SectionHead({ title, aside, id }: { title: ReactNode; aside?: ReactNode; id?: string }) {
  return (
    <div className="section-head">
      <h2 id={id}>{title}</h2>
      {aside && <div className="aside">{aside}</div>}
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return <span className="avatar" aria-hidden="true">{initials}</span>;
}
