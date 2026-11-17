import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { SEVERITY_HEX } from "../../utils/severityColors";

export default function AlertSeverityChart({ data }) {
  const chartData = Object.entries(data || {}).map(([severity, count]) => ({
    severity,
    count,
  }));

  if (!chartData.length) {
    return <div className="text-slate-500 text-sm py-8 text-center">No alerts in this period</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData}>
        <XAxis dataKey="severity" stroke="#94A3B8" fontSize={12} />
        <YAxis stroke="#94A3B8" fontSize={12} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "#1E293B", border: "1px solid #475569", color: "#F1F5F9" }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.severity} fill={SEVERITY_HEX[entry.severity] || "#64748B"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
