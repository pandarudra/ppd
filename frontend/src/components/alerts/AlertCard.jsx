import { SeverityBadge } from "../common/Badge";
import { timeAgo } from "../../utils/formatters";
import { severityBgClass } from "../../utils/severityColors";

export default function AlertCard({ alert, onClick }) {
  return (
    <button
      onClick={() => onClick?.(alert)}
      className="w-full flex items-stretch gap-3 bg-slate-800 border border-slate-600 rounded-md overflow-hidden text-left hover:border-slate-500 transition-colors"
    >
      <div className={`w-1.5 shrink-0 ${severityBgClass(alert.severity)}`} />
      <div className="flex-1 py-2 pr-3 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-slate-100 truncate">{alert.title}</span>
          <SeverityBadge severity={alert.severity} />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
          {alert.source_ip && <span>{alert.source_ip}</span>}
          <span>{timeAgo(alert.created_at)}</span>
        </div>
      </div>
    </button>
  );
}
