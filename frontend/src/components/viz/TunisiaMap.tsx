import { useId } from "react";
import { PARAMETRES } from "../../domain/rules";

type LonLat = readonly [number, number];

// Simplified outline of Tunisia (lon, lat), clockwise from the Algerian border near Tabarka.
const MAINLAND: LonLat[] = [
  [8.62, 36.94], [8.76, 36.96], [9.05, 37.1], [9.22, 37.23], [9.55, 37.26], [9.87, 37.33], [10.05, 37.26],
  [10.27, 37.18], [10.2, 37.02], [10.33, 36.89], [10.31, 36.81], [10.25, 36.78], [10.34, 36.73], [10.5, 36.72],
  [10.58, 36.82], [10.8, 37.0], [11.05, 37.07], [11.11, 36.85], [10.88, 36.58], [10.74, 36.45], [10.6, 36.39],
  [10.45, 36.3], [10.5, 36.03], [10.64, 35.83], [10.84, 35.77], [10.95, 35.65], [11.07, 35.5], [11.11, 35.24],
  [10.93, 35.0], [10.76, 34.74], [10.45, 34.48], [10.1, 34.3], [10.1, 33.88], [10.48, 33.62], [11.11, 33.5],
  [11.2, 33.28], [11.56, 33.17], [11.5, 32.7], [11.45, 32.4], [10.7, 31.97], [10.25, 31.2], [9.55, 30.23],
  [9.2, 30.8], [9.05, 31.5], [8.35, 32.5], [7.85, 33.2], [7.52, 33.85], [7.76, 34.25], [8.25, 34.65],
  [8.28, 35.2], [8.42, 35.75], [8.3, 36.45], [8.45, 36.7],
];
const DJERBA: LonLat[] = [[10.75, 33.88], [11.05, 33.85], [11.07, 33.7], [10.95, 33.63], [10.75, 33.7]];
const KERKENNAH: LonLat[] = [[11.05, 34.7], [11.3, 34.82], [11.25, 34.7], [11.05, 34.62]];

const TOWNS: { nom: string; at: LonLat }[] = [
  { nom: "Bizerte", at: [9.87, 37.27] },
  { nom: "Béja", at: [9.18, 36.73] },
  { nom: "Nabeul", at: [10.74, 36.45] },
  { nom: "Le Kef", at: [8.71, 36.17] },
  { nom: "Kairouan", at: [10.1, 35.68] },
  { nom: "Kasserine", at: [8.84, 35.17] },
  { nom: "Mahdia", at: [11.06, 35.5] },
  { nom: "Sidi Bouzid", at: [9.48, 35.04] },
];

export interface MapCentre {
  id: number;
  nom: string;
  latitude: number;
  longitude: number;
  ouverts: number;
  urgent?: boolean;
}

export interface MapDonor {
  id: number;
  latitude: number;
  longitude: number;
  state: "alerted" | "accepted" | "idle";
}

interface Bounds { minLon: number; maxLon: number; minLat: number; maxLat: number }

const NORTH_CENTRE: Bounds = { minLon: 8.35, maxLon: 11.45, minLat: 34.15, maxLat: 37.42 };
const K = Math.cos((35 * Math.PI) / 180);
const S = 100; // projected units per degree of latitude

interface MapProps {
  centres: MapCentre[];
  donors?: MapDonor[];
  /** Zoom on a point with a half-width in degrees of latitude. */
  focus?: { latitude: number; longitude: number; span?: number };
  onSelectCentre?: (c: MapCentre) => void;
  title: string;
  height?: number;
}

export function TunisiaMap({ centres, donors = [], focus, onSelectCentre, title, height }: MapProps) {
  const titleId = useId();
  const b: Bounds = focus
    ? {
        minLat: focus.latitude - (focus.span ?? 0.55),
        maxLat: focus.latitude + (focus.span ?? 0.55),
        minLon: focus.longitude - (focus.span ?? 0.55) / K,
        maxLon: focus.longitude + (focus.span ?? 0.55) / K,
      }
    : NORTH_CENTRE;

  const x = (lon: number) => (lon - b.minLon) * K * S;
  const y = (lat: number) => (b.maxLat - lat) * S;
  const w = (b.maxLon - b.minLon) * K * S;
  const h = (b.maxLat - b.minLat) * S;
  const path = (pts: LonLat[]) => `M${pts.map(([lo, la]) => `${x(lo).toFixed(1)} ${y(la).toFixed(1)}`).join("L")}Z`;
  const radius = (PARAMETRES.rayonKm / 111) * S;
  // Marker and label sizes follow the visible area, so a zoomed map keeps readable text.
  const scale = (h / 330) * (focus ? 1.05 : 0.75);

  const land = [MAINLAND, DJERBA, KERKENNAH].map(path);

  return (
    <div className="map-frame">
    <svg
      className="map"
      viewBox={`0 0 ${w.toFixed(1)} ${h.toFixed(1)}`}
      style={height ? { height } : undefined}
      role="group"
      aria-labelledby={titleId}
    >
      <title id={titleId}>{title}</title>
      <defs>
        <pattern id="map-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--map-coast)" strokeWidth="0.6" opacity="0.5" />
        </pattern>
      </defs>
      {land.map((d, i) => (
        <path key={i} d={d} fill="var(--map-land)" stroke="var(--map-coast)" strokeWidth={1.2 * scale} strokeLinejoin="round" />
      ))}
      {!focus && TOWNS.map((t) => (
        <g key={t.nom} aria-hidden="true">
          <circle cx={x(t.at[0])} cy={y(t.at[1])} r="1.2" fill="var(--nude-300)" />
          <text x={x(t.at[0]) - 3} y={y(t.at[1]) + 2} textAnchor="end" className="map-town">{t.nom}</text>
        </g>
      ))}

      {centres.map((c) => (
        <circle key={`r${c.id}`} cx={x(c.longitude)} cy={y(c.latitude)} r={radius}
          fill={c.ouverts ? "var(--blood)" : "var(--ink-3)"} fillOpacity={c.ouverts ? 0.07 : 0.04}
          stroke={c.ouverts ? "var(--blood)" : "var(--ink-3)"} strokeOpacity="0.35" strokeWidth={0.8 * scale} strokeDasharray={`${3 * scale} ${3 * scale}`} aria-hidden="true" />
      ))}

      {donors.map((d) => (
        <circle key={`d${d.id}`} cx={x(d.longitude)} cy={y(d.latitude)} r={(d.state === "idle" ? 2.2 : 3.2) * scale * (focus ? 1.8 : 1)}
          className="map-donor" data-state={d.state} aria-hidden="true" />
      ))}

      {centres.map((c) => {
        const cx = x(c.longitude);
        const cy = y(c.latitude);
        const label = `${c.nom} : ${c.ouverts ? `${c.ouverts} besoin${c.ouverts > 1 ? "s" : ""} ouvert${c.ouverts > 1 ? "s" : ""}` : "aucun besoin ouvert"}`;
        const content = (
          <>
            {c.urgent && <circle cx={cx} cy={cy} r={6 * scale} className="map-pulse" />}
            <circle cx={cx} cy={cy} r={5.5 * scale} fill={c.ouverts ? "var(--blood)" : "var(--paper)"} stroke={c.ouverts ? "var(--paper)" : "var(--ink-2)"} strokeWidth={1.5 * scale} />
            <text x={cx + 10 * scale} y={cy - 3 * scale} className="map-label" style={{ fontSize: 11 * scale }}>{c.nom}</text>
            <text x={cx + 10 * scale} y={cy + 10 * scale} className="map-sub" style={{ fontSize: 9.5 * scale }}>
              {c.ouverts ? `${c.ouverts} ouvert${c.ouverts > 1 ? "s" : ""}` : "aucun besoin"}
            </text>
          </>
        );
        return onSelectCentre ? (
          <g key={c.id} className="map-centre" role="link" tabIndex={0} aria-label={label}
            onClick={() => onSelectCentre(c)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelectCentre(c))}>
            {content}
          </g>
        ) : (
          <g key={c.id} role="img" aria-label={label}>{content}</g>
        );
      })}
    </svg>
    </div>
  );
}
