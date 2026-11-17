import { severityBgClass } from "../../utils/severityColors";

export function SeverityBadge({ severity }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold uppercase text-white ${severityBgClass(severity)}`}
    >
      {severity}
    </span>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs border border-slate-500 text-slate-300 capitalize">
      {status?.replaceAll("_", " ")}
    </span>
  );
}
