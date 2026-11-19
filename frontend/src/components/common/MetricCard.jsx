import Card from "./Card";

// dark = the page's single "look here" tile (rendered in the live-blue accent).
export default function MetricCard({ label, value, dark = false, hint }) {
  return (
    <Card dark={dark} className="!p-5">
      <div className={`text-body-sm ${dark ? "text-on-dark-mute" : "text-body"}`}>{label}</div>
      <div className="tabular mt-2 text-display-lg">{value}</div>
      {hint && <div className={`mt-1 text-caption-sm ${dark ? "text-on-dark-mute" : "text-mute"}`}>{hint}</div>}
    </Card>
  );
}
