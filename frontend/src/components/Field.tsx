import { useId, type ReactElement, type ReactNode, cloneElement } from "react";

interface FieldProps {
  label: string;
  help?: ReactNode;
  error?: string | null;
  children: ReactElement<Record<string, unknown>>;
}

/** Wires label, help and error text to the control for assistive tech. */
export function Field({ label, help, error, children }: FieldProps) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const control = cloneElement(children, {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": [helpId, errId].filter(Boolean).join(" ") || undefined,
  });
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {control}
      {error ? (
        <span className="error" id={errId}>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="6" fill="currentColor" /><path d="M6 3v3.5M6 8.5v.01" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" /></svg>
          {error}
        </span>
      ) : (
        help && <span className="help" id={helpId}>{help}</span>
      )}
    </div>
  );
}
