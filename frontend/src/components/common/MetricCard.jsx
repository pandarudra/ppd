import Card from "./Card";

// dark = the page's single inverted "look here" surface.
export default function MetricCard({ label, value, dark = false }) {
  return (
    <Card dark={dark} className="!p-6">
      <div className={`text-body-sm font-medium ${dark ? "text-on-dark-mute" : "text-body"}`}>{label}</div>
      <div className="mt-2 font-display text-display-lg">{value}</div>
    </Card>
  );
}
