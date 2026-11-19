import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const AXIS = { stroke: "#6b7181", fontSize: 12, tickLine: false, axisLine: false };

export default function TrendChart({ points }) {
  if (!points?.length) return <p className="py-12 text-center text-body">No data in this period</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={points}>
        <XAxis dataKey="date" {...AXIS} />
        <YAxis {...AXIS} allowDecimals={false} width={32} />
        <Tooltip contentStyle={{ background: "#1b1c1f", border: "1px solid #2d2f33", borderRadius: 12, color: "#f0f2f5", fontSize: 14 }} />
        <Line dataKey="value" stroke="#0075ff" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
