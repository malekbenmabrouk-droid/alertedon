import { useEffect, useId, useState } from "react";

interface BloodDropProps {
  /** Filled share, 0 to 1. */
  value: number;
  size?: number;
  label: string;
  children?: React.ReactNode;
}

const DROP = "M50 3C50 3 9 53 9 84a41 41 0 0 0 82 0C91 53 50 3 50 3Z";
const H = 130;

/** Collection gauge: the drop fills up as bags are collected. */
export function BloodDrop({ value, size = 120, label, children }: BloodDropProps) {
  const id = useId().replace(/:/g, "");
  const pct = Math.max(0, Math.min(1, value));
  // Start empty and rise on mount so the eye catches the level.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(pct));
    return () => cancelAnimationFrame(t);
  }, [pct]);
  const top = 3 + (1 - shown) * (H - 3);

  return (
    <figure className="drop" style={{ width: size }} role="img" aria-label={`${label} : ${Math.round(pct * 100)} %`}>
      <svg viewBox="0 0 100 130" width={size} height={size * 1.3} aria-hidden="true">
        <defs>
          <clipPath id={`c${id}`}>
            <path d={DROP} />
          </clipPath>
          <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--blood)" />
            <stop offset="1" stopColor="var(--wine-2)" />
          </linearGradient>
        </defs>
        <path d={DROP} fill="var(--blush)" />
        <g clipPath={`url(#c${id})`}>
          <g className="drop-level" style={{ transform: `translateY(${top}px)` }}>
            <path d="M-20 4 Q 5 -2 30 4 T 80 4 T 130 4 V 140 H -20 Z" fill={`url(#g${id})`} />
          </g>
        </g>
        <path d={DROP} fill="none" stroke="var(--wine-2)" strokeOpacity="0.35" strokeWidth="1.2" />
        <path d="M30 70c-2 10 0 22 9 30" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {children && <figcaption className="drop-caption">{children}</figcaption>}
    </figure>
  );
}
