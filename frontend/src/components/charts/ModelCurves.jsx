import { useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import Card from "../common/Card";
import Segmented from "../common/Segmented";
import Button from "../common/Button";
import { Download } from "lucide-react";
import { downloadEvaluationFigure, downloadImportanceFigure } from "../../utils/figure";

const AXIS = { stroke: "#6b7181", fontSize: 12, tickLine: false, axisLine: false };
const TIP = { background: "#1b1c1f", border: "1px solid #2d2f33", borderRadius: 12, color: "#f0f2f5", fontSize: 14 };
const GREY = "#9aa1b1";
const COLORS = ["#0075ff", "#ff8a3d", "#00b24b"];
const pretty = (n) => n.replaceAll("_", " ");
const zip = (o, xk, yk) => o[xk].map((x, i) => ({ x, y: o[yk][i] }));
const r2 = (v) => (typeof v === "number" ? v.toFixed(2) : v);

function ChartCard({ title, hint, children }) {
  return (
    <Card>
      <h3 className="text-heading-md text-ink">{title}</h3>
      <p className="mb-4 text-body-sm text-mute">{hint}</p>
      {children}
    </Card>
  );
}

// series: [{ name, color, data: [{x, y}] }]
function Curve({ series, xLabel, yLabel, diagonal }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart margin={{ left: 0, right: 8, top: 8, bottom: 16 }}>
        <CartesianGrid stroke="#2d2f33" vertical={false} />
        <XAxis dataKey="x" type="number" domain={[0, 1]} tickFormatter={r2} {...AXIS} label={{ value: xLabel, position: "insideBottom", offset: -8, fill: "#6b7181", fontSize: 12 }} />
        <YAxis dataKey="y" type="number" domain={[0, 1]} tickFormatter={r2} width={36} {...AXIS} label={{ value: yLabel, angle: -90, position: "insideLeft", fill: "#6b7181", fontSize: 12 }} />
        <Tooltip contentStyle={TIP} formatter={(v) => r2(v)} labelFormatter={(v) => `${xLabel}: ${r2(v)}`} />
        {series.length > 1 && <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} verticalAlign="top" height={28} />}
        {diagonal && <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke={GREY} strokeDasharray="4 4" />}
        {series.map((s) => (
          <Line key={s.name} data={s.data} dataKey="y" name={s.name} stroke={s.color} strokeWidth={2} dot={false} isAnimationActive={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function Matrix({ cm }) {
  const total = cm.tn + cm.fp + cm.fn + cm.tp || 1;
  const cells = [
    ["True negative", cm.tn, true], ["False positive", cm.fp, false],
    ["False negative", cm.fn, false], ["True positive", cm.tp, true],
  ];
  return (
    <div className="grid grid-cols-[auto_1fr_1fr] items-stretch gap-2 text-center text-body-sm">
      <span />
      <span className="text-mute">Predicted benign</span>
      <span className="text-mute">Predicted attack</span>
      {[0, 1].map((row) => (
        <div key={row} className="contents">
          <span className="flex items-center text-mute [writing-mode:vertical-rl] rotate-180">{row ? "Actual attack" : "Actual benign"}</span>
          {cells.slice(row * 2, row * 2 + 2).map(([label, n, good]) => (
            <div
              key={label}
              className="rounded-lg border border-hairline p-3"
              style={{ background: `${good ? "rgba(0,178,75," : "rgba(255,77,79,"}${0.08 + 0.55 * (n / total)})` }}
            >
              <div className="text-heading-md text-ink">{n.toLocaleString()}</div>
              <div className="text-mute">{label} · {((n / total) * 100).toFixed(1)}%</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// items: [{ name, color, m }]; several items -> matrices side by side
function Confusion({ items }) {
  return (
    <div className={items.length > 1 ? "grid gap-6 xl:grid-cols-3" : ""}>
      {items.map(({ name, color, m }) => (
        <div key={name}>
          {items.length > 1 && <div className="mb-2 flex items-center gap-2 text-body-sm text-ink"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{pretty(name)}</div>}
          <Matrix cm={m.confusion_matrix} />
        </div>
      ))}
    </div>
  );
}

function Importance({ items }) {
  const feats = Object.keys(items[0].m.feature_importance);
  const top = (f) => Math.max(...items.map((i) => i.m.feature_importance[f] || 0));
  const data = feats.sort((a, b) => top(b) - top(a)).slice(0, 12)
    .map((name) => ({ name, ...Object.fromEntries(items.map((i) => [i.name, i.m.feature_importance[name] || 0])) }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 26 * (items.length > 1 ? 1.6 : 1))}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" {...AXIS} tickFormatter={(v) => v.toFixed(2)} />
        <YAxis type="category" dataKey="name" width={120} {...AXIS} />
        <Tooltip contentStyle={TIP} formatter={(v) => v.toFixed(4)} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        {items.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {items.map((i) => (
          <Bar key={i.name} dataKey={i.name} name={pretty(i.name)} fill={i.color} radius={[0, 6, 6, 0]} isAnimationActive={false} maxBarSize={14} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function ModelCurves({ models }) {
  const names = Object.keys(models || {});
  const [pick, setPick] = useState(null);
  if (!names.length) return null;
  const withCurves = names.filter((n) => models[n].roc);
  const compare = pick === "all" && withCurves.length > 1;
  const name = pick && models[pick] ? pick : withCurves[0] || names[0];
  const active = compare ? withCurves : [name];
  const items = active.map((n) => ({ name: n, color: COLORS[names.indexOf(n) % COLORS.length], m: models[n] }));
  const missing = !items[0].m.roc;
  const subset = (n) => Object.fromEntries(n.map((k) => [k, models[k]]));
  const series = (k, xk, yk) => items.map(({ name: n, color, m }) => ({ name: pretty(n), color, data: zip(m[k], xk, yk) }));
  const withFi = items.filter((i) => i.m.feature_importance);
  const options = [...names.map((n) => ({ value: n, label: pretty(n) })), ...(withCurves.length > 1 ? [{ value: "all", label: "Compare all" }] : [])];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-heading-lg text-ink">Diagnostics</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Model" value={compare ? "all" : name} onChange={setPick} options={options} />
          <Button variant="secondary" disabled={missing} onClick={() => downloadEvaluationFigure(subset(active))} title="Paper-style 4-panel PNG: PR, F1 vs threshold, ROC, confusion matrix">
            <Download size={16} aria-hidden /> Evaluation figure
          </Button>
          <Button variant="secondary" disabled={!withFi.length} onClick={() => downloadImportanceFigure(subset(withFi.map((i) => i.name)))}>
            <Download size={16} aria-hidden /> Importance
          </Button>
        </div>
      </div>
      {missing && (
        <p className="rounded-lg border border-hairline bg-panel p-4 text-body-sm text-body">
          Curves are saved at training time. Re-run <code className="font-mono">training/train.py</code> to populate them for this model.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {!missing && (
          <>
            <ChartCard title="Confusion matrix" hint="Held-out test split, each model's default decision rule."><Confusion items={items} /></ChartCard>
            <ChartCard title={compare ? "ROC curve" : `ROC curve · AUC ${r2(items[0].m.auc_roc)}`} hint={compare ? `AUC: ${items.map((i) => `${pretty(i.name)} ${r2(i.m.auc_roc)}`).join(" · ")}` : "True-positive rate against false-positive rate; dashed line is chance."}>
              <Curve series={series("roc", "fpr", "tpr")} xLabel="False positive rate" yLabel="True positive rate" diagonal />
            </ChartCard>
            <ChartCard title="Precision–recall curve" hint="Precision as recall rises; more telling than ROC when attacks are rare.">
              <Curve series={series("pr", "recall", "precision")} xLabel="Recall" yLabel="Precision" />
            </ChartCard>
            <ChartCard title="F1 vs threshold" hint="Score cut-off (min–max normalised) against F1; pick the peak.">
              <Curve series={series("f1_threshold", "threshold", "f1")} xLabel="Threshold" yLabel="F1" />
            </ChartCard>
          </>
        )}
        <ChartCard title="Feature importance" hint={compare ? "Top features across models that report importance (isolation forest has none)." : "Top features by model-reported importance."}>
          {withFi.length ? <Importance items={withFi} /> : <p className="text-body-sm text-mute">Isolation Forest is unsupervised and has no feature importances.</p>}
        </ChartCard>
      </div>
    </section>
  );
}
