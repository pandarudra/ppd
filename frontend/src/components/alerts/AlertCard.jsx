import { SeverityBadge } from "../common/Badge";
import { timeAgo } from "../../utils/formatters";

// Rendered as a hairline-divided row (faq-row pattern) inside a list.
export default function AlertCard({ alert, onClick }) {
  return (
    <button
      onClick={() => onClick?.(alert)}
      className="flex w-full items-center justify-between gap-4 border-b border-hairline py-4 text-left"
    >
      <div className="min-w-0">
        <div className="truncate text-body-md font-medium text-ink">{alert.title}</div>
        <div className="mt-1 flex items-center gap-3 text-body-sm text-body">
          {alert.source_ip && <span className="font-mono">{alert.source_ip}</span>}
          <span>{timeAgo(alert.created_at)}</span>
        </div>
      </div>
      <SeverityBadge severity={alert.severity} />
    </button>
  );
}
