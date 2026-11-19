import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json";
import { SEVERITY_HEX } from "../../utils/severityColors";
import { useHomeStore } from "../../stores/homeStore";
import { timeAgo } from "../../utils/formatters";

const W = 960;
const H = 430; // visible map height (polar caps cropped)
const Y0 = 8;
const MAX_ZOOM = 12;
const projection = geoNaturalEarth1().fitSize([W, 500], { type: "Sphere" });
const path = geoPath(projection);
const LAND = path(feature(land110, land110.objects.land));
const GRATICULE = path(geoGraticule10());

function arc([x1, y1], [x2, y2]) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  return `M${x1},${y1} Q${(x1 + x2) / 2},${Math.min(y1, y2) - dist * 0.28} ${x2},${y2}`;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * sources: [{ ip, alert_count, severity, last_seen?, geo: {lat, lon, city, country} }]
 * Zoom: buttons, mouse wheel, double-click. Pan: drag. Click an origin, a path or your network for details.
 */
export default function WorldMap({ sources = [], className = "", fill = false }) {
  const HOME = useHomeStore((s) => s.home);
  const HOME_XY = useMemo(() => projection([HOME.lon, HOME.lat]), [HOME.lon, HOME.lat]);
  const [view, setView] = useState({ k: 1, cx: W / 2, cy: Y0 + H / 2 }); // zoom + center in map units
  const [selected, setSelected] = useState(null); // { type: "source" | "path" | "home", ip? }
  const svgRef = useRef(null);
  const drag = useRef(null);
  const moved = useRef(false);

  const arcs = useMemo(
    () =>
      sources
        .filter((s) => s.geo)
        .map((s) => {
          const xy = projection([s.geo.lon, s.geo.lat]);
          return { ...s, xy, d: arc(xy, HOME_XY), color: SEVERITY_HEX[s.severity] || SEVERITY_HEX.MEDIUM };
        }),
    [sources, HOME_XY],
  );

  const { k, cx, cy } = view;
  const vw = W / k;
  const vh = H / k;
  const vx = clamp(cx - vw / 2, 0, W - vw);
  const vy = clamp(cy - vh / 2, Y0, Y0 + H - vh);

  function zoomTo(nk, fx = cx, fy = cy) {
    // keep the point (fx, fy) fixed on screen while zooming
    const next = clamp(nk, 1, MAX_ZOOM);
    setView((v) => ({
      k: next,
      cx: fx + ((v.cx - fx) * v.k) / next,
      cy: fy + ((v.cy - fy) * v.k) / next,
    }));
  }

  function toMap(e) {
    const r = svgRef.current.getBoundingClientRect();
    return [vx + ((e.clientX - r.left) / r.width) * vw, vy + ((e.clientY - r.top) / r.height) * vh];
  }

  // wheel needs a non-passive listener to stop the page scrolling while zooming
  useEffect(() => {
    const el = svgRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const px = vx + ((e.clientX - r.left) / r.width) * vw;
      const py = vy + ((e.clientY - r.top) / r.height) * vh;
      zoomTo(k * (e.deltaY < 0 ? 1.25 : 0.8), px, py);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  function onPointerDown(e) {
    drag.current = { x: e.clientX, y: e.clientY, cx, cy };
    moved.current = false;
  }
  function onPointerMove(e) {
    const d = drag.current;
    if (!d) return;
    const r = svgRef.current.getBoundingClientRect();
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
    if (moved.current) setView((v) => ({ ...v, cx: d.cx - (dx / r.width) * vw, cy: d.cy - (dy / r.height) * vh }));
  }
  const endDrag = () => (drag.current = null);

  const select = (sel) => (e) => {
    e.stopPropagation();
    if (!moved.current) setSelected(sel);
  };

  const sel =
    selected?.type === "home"
      ? { kind: "home" }
      : selected
        ? { kind: selected.type, a: arcs.find((a) => a.ip === selected.ip) }
        : null;
  const px = (n) => n / k; // keep markers and strokes a constant size on screen
  // fill: a fixed Eurasia/Africa crop that covers its container (login panel); no zoom, pan or popups
  const FILL_BOX = "380 0 510 500";

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        viewBox={fill ? FILL_BOX : `${vx} ${vy} ${vw} ${vh}`}
        preserveAspectRatio={fill ? "xMidYMid slice" : undefined}
        className={fill ? "h-full w-full" : `h-auto w-full touch-none select-none ${k > 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
        role="img"
        aria-label="World map of attack origins. Scroll to zoom, drag to pan, click a marker for details."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onDoubleClick={(e) => zoomTo(k * 2, ...toMap(e))}
        onClick={() => !moved.current && setSelected(null)}
      >
        <path d={GRATICULE} fill="none" stroke="#2d2f33" strokeWidth="0.4" vectorEffect="non-scaling-stroke" opacity="0.5" />
        <path d={LAND} className="map-land" vectorEffect="non-scaling-stroke" />

        {arcs.map((a, i) => {
          const active = selected?.ip === a.ip;
          return (
            <g key={a.ip}>
              <path d={a.d} className="arc" stroke={a.color} opacity={active ? 1 : 0.55} strokeWidth={active ? 2.4 : 1.2} vectorEffect="non-scaling-stroke" />
              {/* wide invisible stroke so thin arcs are easy to click */}
              <path d={a.d} fill="none" stroke="transparent" strokeWidth="14" vectorEffect="non-scaling-stroke" className="cursor-pointer" onClick={select({ type: "path", ip: a.ip })}>
                <title>{`${a.geo.city} → ${HOME.label}`}</title>
              </path>
              <circle r={px(2.6)} fill={a.color} pointerEvents="none">
                <animateMotion dur={`${3 + (i % 3)}s`} begin={`${(i * 0.45) % 3}s`} repeatCount="indefinite" path={a.d} />
              </circle>
              <circle cx={a.xy[0]} cy={a.xy[1]} r={px(active ? 6 : 4)} fill={a.color} className="cursor-pointer" onClick={select({ type: "source", ip: a.ip })}>
                <title>{`${a.ip} · ${a.geo.city}, ${a.geo.country} · ${a.alert_count} alert(s)`}</title>
              </circle>
              <circle cx={a.xy[0]} cy={a.xy[1]} r={px(4)} fill="none" stroke={a.color} className="origin-center animate-ping2" style={{ transformBox: "fill-box" }} pointerEvents="none" />
            </g>
          );
        })}

        <g className="cursor-pointer" onClick={select({ type: "home" })}>
          <circle cx={HOME_XY[0]} cy={HOME_XY[1]} r={px(10)} fill="#00b24b" opacity="0.18" />
          <circle cx={HOME_XY[0]} cy={HOME_XY[1]} r={px(5)} fill="#00b24b" stroke="#141415" strokeWidth={px(1.5)}>
            <title>{HOME.label}</title>
          </circle>
        </g>
      </svg>

      {!fill && <div className="absolute right-2 top-2 flex flex-col overflow-hidden rounded-lg border border-hairline bg-panel/90 backdrop-blur">
        <button aria-label="Zoom in" onClick={() => zoomTo(k * 1.6)} disabled={k >= MAX_ZOOM} className="flex h-8 w-8 items-center justify-center text-charcoal hover:bg-surface disabled:text-mute"><Plus size={16} /></button>
        <button aria-label="Zoom out" onClick={() => zoomTo(k / 1.6)} disabled={k <= 1} className="flex h-8 w-8 items-center justify-center border-t border-hairline text-charcoal hover:bg-surface disabled:text-mute"><Minus size={16} /></button>
        <button aria-label="Reset view" onClick={() => setView({ k: 1, cx: W / 2, cy: Y0 + H / 2 })} disabled={k === 1} className="flex h-8 w-8 items-center justify-center border-t border-hairline text-charcoal hover:bg-surface disabled:text-mute"><RotateCcw size={14} /></button>
      </div>}

      {!fill && sel && (sel.kind === "home" || sel.a) && (
        <div role="dialog" aria-label="Map details" className="absolute bottom-2 left-2 w-64 rounded-card border border-hairline bg-panel/95 p-4 text-body-sm shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur">
          <button aria-label="Close details" onClick={() => setSelected(null)} className="absolute right-2 top-2 text-mute hover:text-ink"><X size={14} /></button>
          {sel.kind === "home" ? (
            <>
              <div className="eyebrow">Destination</div>
              <div className="mt-1 text-heading-sm text-ink">{HOME.label}</div>
              <dl className="mt-3 space-y-1.5">
                <Row k="Attack origins" v={arcs.length} />
                <Row k="Alerts" v={arcs.reduce((n, a) => n + (a.alert_count || 0), 0)} />
              </dl>
            </>
          ) : (
            <>
              <div className="eyebrow">{sel.kind === "path" ? "Attack path" : "Attack origin"}</div>
              <div className="mt-1 font-mono text-heading-sm text-ink">{sel.a.ip}</div>
              <dl className="mt-3 space-y-1.5">
                <Row k="Location" v={`${sel.a.geo.city}, ${sel.a.geo.country}`} />
                <Row k={sel.kind === "path" ? "Path" : "Target"} v={sel.kind === "path" ? `${sel.a.geo.city} → ${HOME.label}` : HOME.label} />
                <Row k="Alerts" v={sel.a.alert_count} />
                <Row k="Severity" v={<span style={{ color: sel.a.color }} className="capitalize">{sel.a.severity?.toLowerCase()}</span>} />
                {sel.a.last_seen && <Row k="Last seen" v={timeAgo(sel.a.last_seen)} />}
              </dl>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-body">{k}</dt>
      <dd className="text-right text-ink">{v}</dd>
    </div>
  );
}
