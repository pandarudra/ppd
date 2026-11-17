import Card from "./Card";

export default function MetricCard({ label, value, icon: Icon, accent = "text-slate-100" }) {
  return (
    <Card className="flex items-center justify-between">
      <div>
        <div className="text-xs text-slate-400 uppercase tracking-wide">{label}</div>
        <div className={`text-2xl font-bold ${accent}`}>{value}</div>
      </div>
      {Icon && <Icon className="text-slate-500" size={28} />}
    </Card>
  );
}
