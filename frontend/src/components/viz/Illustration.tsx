// Small line illustrations for empty and success states. Stroke uses currentColor.
const ART = {
  drop: (
    <>
      <path d="M48 10C48 10 22 42 22 62a26 26 0 0 0 52 0C74 42 48 10 48 10Z" />
      <path d="M30 64h9l4-8 6 16 5-12 3 4h10" />
    </>
  ),
  letter: (
    <>
      <rect x="14" y="24" width="68" height="48" rx="3" />
      <path d="M14 28l34 24 34-24" />
      <path d="M48 62c-4-4-9-6-9-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5-5 7-9 11Z" />
    </>
  ),
  people: (
    <>
      <circle cx="36" cy="34" r="10" />
      <path d="M18 76c2-14 9-22 18-22s16 8 18 22" />
      <circle cx="64" cy="38" r="8" />
      <path d="M58 56c9 0 15 7 17 20" />
    </>
  ),
  search: (
    <>
      <circle cx="42" cy="42" r="20" />
      <path d="M57 57l17 17" />
      <path d="M34 42h16" />
    </>
  ),
  alert: (
    <>
      <path d="M48 14L84 76H12Z" />
      <path d="M48 38v18M48 64v1" />
    </>
  ),
} as const;

export type ArtName = keyof typeof ART;

export function Illustration({ name, size = 88 }: { name: ArtName; size?: number }) {
  return (
    <svg className="art" width={size} height={size} viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ART[name]}
    </svg>
  );
}
