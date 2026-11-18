import { severityChipClass } from "../../utils/severityColors";

export function SeverityBadge({ severity }) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-full px-2.5 text-caption-sm font-medium capitalize ${severityChipClass(severity)}`}
    >
      {severity?.toLowerCase()}
    </span>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full bg-surface-soft px-2.5 text-caption-sm text-charcoal capitalize">
      {status?.replaceAll("_", " ")}
    </span>
  );
}
