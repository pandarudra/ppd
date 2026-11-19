import { useMemo } from "react";
import { SEVERITY_HEX } from "../../utils/severityColors";

const W = 900;
const ROW = 34;
const COLS = [120, 450, 780]; // x of node anchors: source, target, port

/** edges: [{ source, target, port, count, severity }] -> source -> target -> port flow */
export default function FlowGraph({ edges = [] }) {
  const { nodes, links, height } = useMemo(() => {
    const cols = [new Map(), new Map(), new Map()];
    const add = (c, key, sev) => {
      const n = cols[c].get(key) || { key, count: 0, severity: "INFO" };
      n.count += 1;
      cols[c].set(key, n);
      return n;
    };
    edges.forEach((e) => {
      add(0, e.source);
      add(1, e.target);
      add(2, String(e.port ?? "n/a"));
    });
    const ordered = cols.map((m) => [...m.keys()]);
    const pos = (c, key) => ({ x: COLS[c], y: 24 + ordered[c].indexOf(key) * ROW });
    const links = [];
    edges.forEach((e) => {
      const p = String(e.port ?? "n/a");
      links.push({ a: pos(0, e.source), b: pos(1, e.target), w: e.count, sev: e.severity });
      links.push({ a: pos(1, e.target), b: pos(2, p), w: e.count, sev: e.severity });
    });
    const nodes = cols.flatMap((m, c) => ordered[c].map((key) => ({ key, c, ...pos(c, key) })));
    return { nodes, links, height: 48 + Math.max(...ordered.map((o) => o.length), 1) * ROW };
  }, [edges]);

  if (!edges.length) return <p className="py-12 text-center text-body">No attack flows in this window.</p>;
  const max = Math.max(...links.map((l) => l.w));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${height}`} className="min-w-[640px]" role="img" aria-label="Attack flow: source to target to port">
        {["SOURCE", "TARGET", "PORT"].map((t, i) => (
          <text key={t} x={COLS[i]} y={10} textAnchor="middle" fill="#6b7181" fontSize="10" letterSpacing="1.5">{t}</text>
        ))}
        {links.map((l, i) => {
          const mx = (l.a.x + l.b.x) / 2;
          return (
            <path
              key={i}
              d={`M${l.a.x + 4},${l.a.y} C${mx},${l.a.y} ${mx},${l.b.y} ${l.b.x - 4},${l.b.y}`}
              fill="none"
              stroke={SEVERITY_HEX[l.sev] || "#6b7181"}
              strokeOpacity="0.45"
              strokeWidth={1 + (l.w / max) * 5}
            />
          );
        })}
        {nodes.map((n) => (
          <g key={`${n.c}-${n.key}`}>
            <circle cx={n.x} cy={n.y} r="4" fill={n.c === 0 ? "#ff8a3d" : n.c === 1 ? "#00b24b" : "#0075ff"} />
            <text x={n.x + (n.c === 2 ? 10 : n.c === 0 ? -10 : 0)} y={n.y + (n.c === 1 ? -10 : 4)} textAnchor={n.c === 0 ? "end" : n.c === 1 ? "middle" : "start"} fill="#c3c8d3" fontSize="11" fontFamily="ui-monospace, monospace">
              {n.key}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
