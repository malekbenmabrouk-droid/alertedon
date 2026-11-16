interface RingProps {
  value: number;
  size?: number;
  stroke?: number;
  tone?: "blood" | "ok" | "ink";
  label: string;
  children?: React.ReactNode;
}

const COLORS = { blood: "var(--blood)", ok: "var(--ok)", ink: "var(--ink-2)" };

export function Ring({ value, size = 120, stroke = 6, tone = "blood", label, children }: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--nude-100)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={COLORS[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="ring-arc"
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}
