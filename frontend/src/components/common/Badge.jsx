import { severityChipClass } from "../../utils/severityColors";

export function SeverityBadge({ severity }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-caption-sm capitalize ${severityChipClass(severity)}`}>
      {severity?.toLowerCase()}
    </span>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full bg-surface px-2.5 text-caption-sm capitalize text-charcoal">
      {status?.replaceAll("_", " ")}
    </span>
  );
}
