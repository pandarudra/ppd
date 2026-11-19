import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { SEVERITY_HEX } from "../../utils/severityColors";

const AXIS = { stroke: "#6b7181", fontSize: 12, tickLine: false, axisLine: false };

export default function AlertSeverityChart({ data }) {
  const chartData = Object.entries(data || {}).map(([severity, count]) => ({
    severity: severity.toLowerCase(),
    key: severity,
    count,
  }));

  if (!chartData.length) {
    return <p className="py-12 text-center text-body">No alerts in this period</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData}>
        <XAxis dataKey="severity" {...AXIS} />
        <YAxis {...AXIS} allowDecimals={false} width={32} />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={{ background: "#1b1c1f", border: "1px solid #2d2f33", borderRadius: 12, color: "#f0f2f5", fontSize: 14 }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} isAnimationActive={false} maxBarSize={56}>
          {chartData.map((entry) => (
            <Cell key={entry.key} fill={SEVERITY_HEX[entry.key] || "#6b7181"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
