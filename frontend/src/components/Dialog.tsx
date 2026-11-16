import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui";

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** "sheet" slides in from the side (forms), "dialog" is centred (short choices). */
  variant?: "sheet" | "dialog";
  className?: string;
  /** No visible header (command palette). */
  bare?: boolean;
  label?: string;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useModal(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    (node?.querySelector<HTMLElement>("[data-autofocus]") ?? node?.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab" && node) {
        const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!items.length) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);
  return ref;
}

export function Dialog({ open, onClose, title, description, children, footer, variant = "dialog", className = "", bare, label }: OverlayProps) {
  const ref = useModal(open, onClose);
  const titleId = useId();
  const descId = useId();
  if (!open) return null;

  const a11y = {
    role: "dialog" as const,
    "aria-modal": true,
    "aria-labelledby": bare ? undefined : titleId,
    "aria-label": bare ? label : undefined,
    "aria-describedby": description ? descId : undefined,
  };
  const head = !bare && (
    <div className={variant === "sheet" ? "sheet-head" : "dialog-head"}>
      <div>
        <h2 id={titleId}>{title}</h2>
        {description && <p id={descId}>{description}</p>}
      </div>
      <Button variant="quiet" size="sm" iconOnly icon="close" aria-label="Fermer" onClick={onClose} />
    </div>
  );

  if (variant === "sheet") {
    return createPortal(
      <>
        <div className="scrim" onClick={onClose} aria-hidden="true" />
        <div ref={ref} className={`sheet ${className}`} {...a11y}>
          {head}
          <div className="sheet-body">{children}</div>
          {footer && <div className="sheet-foot">{footer}</div>}
        </div>
      </>,
      document.body,
    );
  }

  return createPortal(
    <div className="dialog-layer" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`dialog ${className}`} {...a11y}>
        {head}
        {bare ? children : <div className="dialog-body">{children}</div>}
        {footer && <div className="dialog-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
