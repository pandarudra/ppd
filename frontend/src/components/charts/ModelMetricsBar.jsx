import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const AXIS = { stroke: "#6b7181", fontSize: 12, tickLine: false, axisLine: false };
const SHADES = { precision: "#0075ff", recall: "#00b24b", f1_score: "#9aa1b1" };

export default function ModelMetricsBar({ models }) {
  const data = Object.entries(models || {}).map(([name, m]) => ({ name: name.replaceAll("_", " "), ...m }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <XAxis dataKey="name" {...AXIS} />
        <YAxis {...AXIS} domain={[0, 1]} width={32} />
        <Tooltip formatter={(v) => `${(v * 100).toFixed(1)}%`} contentStyle={{ background: "#1b1c1f", border: "1px solid #2d2f33", borderRadius: 12, color: "#f0f2f5", fontSize: 14 }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {Object.entries(SHADES).map(([k, c]) => (
          <Bar key={k} dataKey={k} fill={c} radius={[6, 6, 0, 0]} isAnimationActive={false} maxBarSize={32} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
