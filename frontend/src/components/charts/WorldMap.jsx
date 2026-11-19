import { useMemo } from "react";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json";
import { SEVERITY_HEX } from "../../utils/severityColors";

const W = 960;
const H = 500;
const projection = geoNaturalEarth1().fitSize([W, H], { type: "Sphere" });
const path = geoPath(projection);
const LAND = path(feature(land110, land110.objects.land));
const GRATICULE = path(geoGraticule10());

function arc([x1, y1], [x2, y2]) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  return `M${x1},${y1} Q${(x1 + x2) / 2},${Math.min(y1, y2) - dist * 0.28} ${x2},${y2}`;
}

/** sources: [{ ip, alert_count, severity, geo: {lat, lon, city, country} }] */
export default function WorldMap({ sources = [], home = null, className = "" }) {
  const HOME_XY = home ? projection([home.lon, home.lat]) : null;
  const arcs = useMemo(
    () =>
      sources
        .filter((s) => s.geo)
        .map((s) => {
          const xy = projection([s.geo.lon, s.geo.lat]);
          return { ...s, xy, d: HOME_XY ? arc(xy, HOME_XY) : null, color: SEVERITY_HEX[s.severity] || SEVERITY_HEX.MEDIUM };
        }),
    [sources, home],
  );

  return (
    <svg viewBox={`0 8 ${W} ${H - 70}`} className={`h-auto w-full ${className}`} role="img" aria-label="World map of attack origins">
      <path d={GRATICULE} fill="none" stroke="#2d2f33" strokeWidth="0.4" opacity="0.5" />
      <path d={LAND} className="map-land" />

      {arcs.map((a, i) => (
        <g key={a.ip}>
          {a.d && <path d={a.d} className="arc" stroke={a.color} opacity="0.55" />}
          <circle r="2.6" fill={a.color}>
            {a.d && <animateMotion dur={`${3 + (i % 3)}s`} begin={`${(i * 0.45) % 3}s`} repeatCount="indefinite" path={a.d} />}
          </circle>
          <circle cx={a.xy[0]} cy={a.xy[1]} r="3.5" fill={a.color}>
            <title>{`${a.ip} · ${a.geo.city}, ${a.geo.country} · ${a.alert_count} alert(s)`}</title>
          </circle>
          <circle cx={a.xy[0]} cy={a.xy[1]} r="3.5" fill="none" stroke={a.color} className="origin-center animate-ping2" style={{ transformBox: "fill-box" }} />
        </g>
      ))}

      {HOME_XY && <g>
        <circle cx={HOME_XY[0]} cy={HOME_XY[1]} r="9" fill="#00b24b" opacity="0.18" />
        <circle cx={HOME_XY[0]} cy={HOME_XY[1]} r="4.5" fill="#00b24b" stroke="#141415" strokeWidth="1.5">
          <title>{`Your network · ${home.city || ""}, ${home.country || ""}`}</title>
        </circle>
      </g>}
    </svg>
  );
}
