// Renders a paper-style evaluation figure (white background, matplotlib look) to a PNG and downloads it.
const FONT = "DejaVu Sans, Arial, Helvetica, sans-serif";
const BLUE = "#1f77b4";
const S = 3; // export scale: 1000x860 logical -> 3000x2580 px
const f2 = (v) => v.toFixed(2);

function txt(c, s, x, y, { size = 13, align = "center", base = "alphabetic", color = "#111", rot = 0, bold = false } = {}) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.font = `${bold ? "bold " : ""}${size}px ${FONT}`;
  c.textAlign = align;
  c.textBaseline = base;
  c.fillStyle = color;
  c.fillText(s, 0, 0);
  c.restore();
}

// Frame with title, ticks, labels. Returns data->pixel mappers for the inner plot area.
function frame(c, { x, y, w, h }, { title, xLabel, yLabel, xTicks = [0, 0.2, 0.4, 0.6, 0.8, 1], yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1], grid = true }) {
  const L = x + 62, T = y + 34, R = x + w - 14, B = y + h - 48;
  txt(c, title, (L + R) / 2, y + 20, { size: 14 });
  const px = (v) => L + v * (R - L), py = (v) => B - v * (B - T);
  c.strokeStyle = "#e3e3e3"; c.lineWidth = 1;
  if (grid) {
    xTicks.forEach((t) => { c.beginPath(); c.moveTo(px(t), T); c.lineTo(px(t), B); c.stroke(); });
    yTicks.forEach((t) => { c.beginPath(); c.moveTo(L, py(t)); c.lineTo(R, py(t)); c.stroke(); });
  }
  c.strokeStyle = "#222"; c.strokeRect(L, T, R - L, B - T);
  xTicks.forEach((t) => txt(c, f2(t), px(t), B + 16, { size: 11 }));
  yTicks.forEach((t) => txt(c, f2(t), L - 8, py(t), { size: 11, align: "right", base: "middle" }));
  txt(c, xLabel, (L + R) / 2, B + 36, { size: 12 });
  txt(c, yLabel, x + 16, (T + B) / 2, { size: 12, rot: -Math.PI / 2 });
  return { px, py, L, T, R, B };
}

export const PALETTE = ["#1f77b4", "#ff7f0e", "#2ca02c"];
// Same model, same colour in every figure (even when a subset is exported).
const ORDER = ["isolation_forest", "random_forest", "xgboost"];
const colorOf = (name, i) => PALETTE[(ORDER.includes(name) ? ORDER.indexOf(name) : i) % PALETTE.length];

function legend(c, { R, B }, series) {
  c.font = `11px ${FONT}`;
  const w = Math.max(...series.map((s) => c.measureText(s.label).width)) + 44, rh = 20, h = series.length * rh + 6;
  const x = R - w - 8, y = B - h - 8;
  c.fillStyle = "rgba(255,255,255,0.92)"; c.strokeStyle = "#ccc"; c.lineWidth = 1;
  c.fillRect(x, y, w, h); c.strokeRect(x, y, w, h);
  series.forEach((s, i) => {
    const cy = y + 3 + rh * i + rh / 2;
    c.strokeStyle = s.color; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x + 8, cy); c.lineTo(x + 28, cy); c.stroke();
    txt(c, s.label, x + 34, cy, { size: 11, align: "left", base: "middle" });
  });
}

// series: [{ xs, ys, label, color }]
function line(c, fr, series, { diagonal = false } = {}) {
  if (diagonal) {
    c.setLineDash([5, 4]); c.strokeStyle = "#777"; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(fr.px(0), fr.py(0)); c.lineTo(fr.px(1), fr.py(1)); c.stroke(); c.setLineDash([]);
  }
  c.save(); c.beginPath(); c.rect(fr.L, fr.T, fr.R - fr.L, fr.B - fr.T); c.clip();
  series.forEach(({ xs, ys, color }) => {
    c.strokeStyle = color; c.lineWidth = 2; c.beginPath();
    xs.forEach((x, i) => (i ? c.lineTo(fr.px(x), fr.py(ys[i])) : c.moveTo(fr.px(x), fr.py(ys[i]))));
    c.stroke();
  });
  c.restore();
  legend(c, fr, series);
}

// matplotlib "Blues": interpolate #f7fbff -> #08306b
const blues = (t) => {
  const a = [247, 251, 255], b = [8, 48, 107];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
};

// items: [{ cm, label }]; one matrix fills the panel, several sit side by side.
function confusion(c, box, items, title) {
  const { x, y, w, h } = box;
  const n = items.length, multi = n > 1;
  txt(c, title, x + w / 2, y + 20, { size: 14 });
  const gap = 16, left = x + (multi ? 88 : 56), right = x + w - 14;
  const mw = (right - left - gap * (n - 1)) / n, T = y + (multi ? 62 : 34), B = y + h - 48;
  const mh = multi ? Math.min(mw, B - T) : B - T, top = multi ? T + (B - T - mh) / 2 : T;
  items.forEach(({ cm, label }, k) => {
    const L = left + k * (mw + gap), cw = mw / 2, ch = mh / 2, max = Math.max(cm.tn, cm.fp, cm.fn, cm.tp, 1);
    if (multi) txt(c, label, L + mw / 2, top - 22, { size: 12, bold: true });
    [[cm.tn, cm.fp], [cm.fn, cm.tp]].forEach((row, r) => row.forEach((v, j) => {
      const t = v / max;
      c.fillStyle = blues(t); c.fillRect(L + j * cw, top + r * ch, cw, ch);
      txt(c, String(v), L + j * cw + cw / 2, top + r * ch + ch / 2, { size: multi ? 12 : 14, base: "middle", color: t > 0.5 ? "#fff" : "#08306b" });
    }));
    ["Benign", "Attack"].forEach((s, i) => {
      txt(c, s, L + i * cw + cw / 2, top + mh + 14, { size: multi ? 10 : 12 });
      if (k === 0) txt(c, s, L - 6, top + i * ch + ch / 2, { size: multi ? 10 : 12, align: "right", base: "middle" });
    });
  });
  txt(c, "Predicted label", x + w / 2, B + 36, { size: 12 });
  txt(c, "True label", x + 14, (T + B) / 2, { size: 12, rot: -Math.PI / 2 });
}

// items: [{ fi, label, color }]; top-12 features by the best model, bars grouped per feature.
function importance(c, box, items, title) {
  const { x, y, w, h } = box;
  const names = Object.keys(items[0].fi)
    .sort((a, b) => Math.max(...items.map((i) => i.fi[b] || 0)) - Math.max(...items.map((i) => i.fi[a] || 0)))
    .slice(0, 12);
  const L = x + 150, T = y + 34, R = x + w - 24, B = y + h - 48;
  const max = Math.max(...items.flatMap((i) => names.map((n) => i.fi[n] || 0))) * 1.1 || 1;
  txt(c, title, (L + R) / 2, y + 20, { size: 14 });
  const gh = (B - T) / names.length, bh = (gh * 0.8) / items.length;
  c.strokeStyle = "#e3e3e3"; c.lineWidth = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
    const gx = L + t * (R - L);
    c.beginPath(); c.moveTo(gx, T); c.lineTo(gx, B); c.stroke();
    txt(c, f2(t * max), gx, B + 16, { size: 11 });
  });
  names.forEach((n, i) => {
    txt(c, n, L - 8, T + i * gh + gh / 2, { size: 11, align: "right", base: "middle" });
    items.forEach((it, k) => {
      c.fillStyle = it.color;
      c.fillRect(L, T + i * gh + gh * 0.1 + k * bh, ((it.fi[n] || 0) / max) * (R - L), bh * 0.92);
    });
  });
  c.strokeStyle = "#222"; c.strokeRect(L, T, R - L, B - T);
  txt(c, "Importance", (L + R) / 2, B + 36, { size: 12 });
  if (items.length > 1) legend(c, { R, B }, items.map((i) => ({ label: i.label, color: i.color })));
}

function canvas(w, h) {
  const cv = document.createElement("canvas");
  cv.width = w * S; cv.height = h * S;
  const c = cv.getContext("2d");
  c.scale(S, S); c.fillStyle = "#fff"; c.fillRect(0, 0, w, h);
  return [cv, c];
}

function save(cv, name) {
  cv.toBlob((b) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
}

const slug = (s) => s.replaceAll(" ", "_");

const pretty = (n) => n.replaceAll("_", " ");

/**
 * Four panels: (a) PR, (b) F1 vs threshold, (c) ROC, (d) confusion matrix.
 * `models` is { name: metrics }; one entry = single-model figure, several = overlay comparison.
 */
export function downloadEvaluationFigure(models) {
  const names = Object.keys(models), multi = names.length > 1;
  const [cv, c] = canvas(1000, 860);
  const box = (i) => ({ x: (i % 2) * 500, y: Math.floor(i / 2) * 430, w: 500, h: 430 });
  const mk = (xk, yk, labelOf = pretty) =>
    names.map((n, i) => ({ xs: models[n][xk.k][xk.f], ys: models[n][xk.k][yk], label: labelOf(n, models[n]), color: colorOf(n, i) }));
  const tag = multi ? "" : `${pretty(names[0])} `;
  line(c, frame(c, box(0), { title: `(a) ${tag}Precision–Recall Curve`, xLabel: "Recall", yLabel: "Precision" }), mk({ k: "pr", f: "recall" }, "precision"));
  line(c, frame(c, box(1), { title: `(b) ${tag}F1 vs Decision Threshold`, xLabel: "Threshold (normalised)", yLabel: "F1 score" }), mk({ k: "f1_threshold", f: "threshold" }, "f1"));
  line(c, frame(c, box(2), { title: "(c) Receiver Operating Characteristic (ROC)", xLabel: "False Positive Rate", yLabel: "True Positive Rate" }),
    mk({ k: "roc", f: "fpr" }, "tpr", (n, m) => `${pretty(n)} (AUC = ${m.auc_roc.toFixed(4)})`), { diagonal: true });
  const cm0 = models[names[0]].confusion_matrix;
  const total = cm0.tn + cm0.fp + cm0.fn + cm0.tp;
  confusion(c, box(3), names.map((n) => ({ cm: models[n].confusion_matrix, label: pretty(n) })), `(d) Confusion Matrix (Test N = ${total.toLocaleString()})`);
  save(cv, multi ? "model_comparison_evaluation.png" : `${slug(names[0])}_evaluation.png`);
}

export function downloadImportanceFigure(models) {
  const names = Object.keys(models).filter((n) => models[n].feature_importance), multi = names.length > 1;
  const [cv, c] = canvas(1000, 600);
  importance(c, { x: 0, y: 0, w: 1000, h: 600 },
    names.map((n, i) => ({ fi: models[n].feature_importance, label: pretty(n), color: colorOf(n, i) })),
    multi ? "Feature Importance Comparison" : `${pretty(names[0])} Feature Importance`);
  save(cv, multi ? "model_comparison_feature_importance.png" : `${slug(names[0])}_feature_importance.png`);
}
