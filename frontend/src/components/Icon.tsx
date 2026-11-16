import type { SVGProps } from "react";

// Hand-tuned 16px stroke icons. Keep the set small: only what the screens use.
const PATHS = {
  overview: "M2.5 2.5h4.5v5.5H2.5zM9 2.5h4.5v3.5H9zM9 8h4.5v5.5H9zM2.5 10h4.5v3.5H2.5z",
  drop: "M8 1.8C5.6 5.1 3.8 7.4 3.8 9.8a4.2 4.2 0 0 0 8.4 0C12.2 7.4 10.4 5.1 8 1.8z",
  users: "M5.8 7.2a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8zM1.5 13.5c.3-2.4 2-3.9 4.3-3.9s4 1.5 4.3 3.9M10.8 2.6a2.3 2.3 0 0 1 0 4.4M12 9.8c1.3.4 2.2 1.7 2.5 3.7",
  inbox: "M2 9l1.8-5.6A1 1 0 0 1 4.8 2.7h6.4a1 1 0 0 1 1 .7L14 9v3.3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1zM2 9h3.5l1 1.7h3l1-1.7H14",
  check: "M3.5 8.4l2.9 2.9 6.1-6.6",
  shield: "M8 1.8l5 1.9v4.1c0 3.2-2.1 5.4-5 6.4-2.9-1-5-3.2-5-6.4V3.7zM5.6 8.1l1.7 1.7 3.2-3.4",
  search: "M7.1 12.2a5.1 5.1 0 1 0 0-10.2 5.1 5.1 0 0 0 0 10.2zM14 14l-3.3-3.3",
  plus: "M8 3v10M3 8h10",
  sun: "M8 10.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6zM8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1",
  moon: "M13.4 9.6A5.6 5.6 0 0 1 6.4 2.6a5.6 5.6 0 1 0 7 7z",
  command: "M5.5 5.5h5v5h-5zM5.5 5.5H4a1.5 1.5 0 1 1 1.5-1.5zM10.5 5.5V4A1.5 1.5 0 1 1 12 5.5zM10.5 10.5H12a1.5 1.5 0 1 1-1.5 1.5zM5.5 10.5V12A1.5 1.5 0 1 1 4 10.5z",
  close: "M4 4l8 8M12 4l-8 8",
  chevronRight: "M6 3.5L10.5 8 6 12.5",
  chevronLeft: "M10 3.5L5.5 8l4.5 4.5",
  sort: "M5.5 6L8 3.5 10.5 6M5.5 10L8 12.5 10.5 10",
  sortAsc: "M5 9.5L8 6.5l3 3",
  sortDesc: "M5 6.5l3 3 3-3",
  download: "M8 2.5v7.5M4.8 7L8 10.2 11.2 7M3 13h10",
  refresh: "M13 4.5V2M13 4.5h-2.5M12.6 4.4A5.5 5.5 0 1 0 13.5 8",
  alert: "M8 2l6.3 11H1.7zM8 6.5v3M8 11.5v.01",
  wifiOff: "M2 2l12 12M5.6 8.3a3.6 3.6 0 0 1 2-.9M2.4 5.6a8.6 8.6 0 0 1 2.5-1.6M13.6 5.6a8.6 8.6 0 0 0-5-2.3M10.8 8.6a3.6 3.6 0 0 0-.7-.5M8 12.5v.01",
  play: "M4.5 3v10l8.5-5z",
  arrowLeft: "M13 8H3M7 4L3 8l4 4",
  arrowRight: "M3 8h10M9 4l4 4-4 4",
  calendar: "M2.5 4h11v9.5h-11zM2.5 7h11M5.5 2.5v3M10.5 2.5v3",
  heart: "M8 13.5S2 10 2 6a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4-6 7.5-6 7.5z",
  clock: "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM8 4.8V8l2.2 1.5",
  pin: "M8 14s4.5-4.2 4.5-7.6a4.5 4.5 0 0 0-9 0C3.5 9.8 8 14 8 14zM8 8a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 8 8z",
  mail: "M2 3.5h12v9H2zM2 4l6 4.8L14 4",
  phone: "M5.2 2H3.5A1.5 1.5 0 0 0 2 3.6C2.3 9 7 13.7 12.4 14a1.5 1.5 0 0 0 1.6-1.5v-1.7l-2.8-1.2-1.4 1.4a8 8 0 0 1-4.8-4.8l1.4-1.4z",
  menu: "M2.5 4h11M2.5 8h11M2.5 12h11",
  send: "M14 2L7 9M14 2l-4.5 12L7 9 2 6.5z",
  x: "M5 5l6 6M11 5l-6 6",
  database: "M8 5.5c3 0 5.5-.9 5.5-2s-2.5-2-5.5-2-5.5.9-5.5 2 2.5 2 5.5 2zM2.5 3.5v9c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-9M2.5 8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2",
  route: "M3.5 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM12.5 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM5 12h4.5a2 2 0 0 0 0-4h-3a2 2 0 0 1 0-4H11",
  keyboard: "M1.5 4h13v8h-13zM4 6.5h.01M6.5 6.5h.01M9 6.5h.01M11.5 6.5h.01M5 9.5h6",
  loader: "M8 1.5A6.5 6.5 0 1 0 14.5 8",
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 16, className, ...rest }: IconProps) {
  const filled = name === "play";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
