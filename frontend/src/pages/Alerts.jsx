import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DataTable from "../components/common/DataTable";
import { SeverityBadge, StatusBadge } from "../components/common/Badge";
import AlertDetailDrawer from "../components/alerts/AlertDetailDrawer";
import Spinner from "../components/common/Spinner";
import * as alertsApi from "../api/alertsApi";
import { ALERT_STATUSES, SEVERITIES } from "../utils/constants";
import { timeAgo } from "../utils/formatters";

const COLUMNS = [
  { key: "severity", label: "Severity", render: (r) => <SeverityBadge severity={r.severity} /> },
  { key: "title", label: "Title" },
  { key: "source_ip", label: "Source IP", render: (r) => r.source_ip || "—" },
  {
    key: "confidence_score",
    label: "Confidence",
    render: (r) => (r.confidence_score != null ? `${Math.round(r.confidence_score * 100)}%` : "—"),
  },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  { key: "assigned_to", label: "Assigned To", render: (r) => r.assigned_to?.full_name || "Unassigned" },
  { key: "created_at", label: "Age", render: (r) => timeAgo(r.created_at) },
];

export default function Alerts() {
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [selectedAlertId, setSelectedAlertId] = useState(null);

  const params = Object.fromEntries(
    Object.entries({ severity, status }).filter(([, v]) => v),
  );

  const { data, isLoading } = useQuery({
    queryKey: ["alerts", params],
    queryFn: () => alertsApi.listAlerts(params),
  });

  return (
    <div className="flex gap-6">
      <aside className="w-48 shrink-0 space-y-4">
        <div>
          <div className="text-xs text-slate-400 uppercase mb-1">Severity</div>
          <div className="space-y-1">
            {SEVERITIES.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="radio"
                  name="severity"
                  checked={severity === s}
                  onChange={() => setSeverity(severity === s ? "" : s)}
                />
                {s}
              </label>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400 uppercase mb-1">Status</div>
          <div className="space-y-1">
            {ALERT_STATUSES.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm text-slate-300 capitalize">
                <input
                  type="radio"
                  name="status"
                  checked={status === s}
                  onChange={() => setStatus(status === s ? "" : s)}
                />
                {s.replaceAll("_", " ")}
              </label>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex-1 space-y-4">
        <h1 className="text-xl font-bold text-slate-100">Alerts Management</h1>
        {isLoading ? (
          <Spinner />
        ) : (
          <DataTable
            columns={COLUMNS}
            rows={data?.alerts}
            onRowClick={(row) => setSelectedAlertId(row.alert_id)}
            emptyMessage="No alerts match the current filters"
          />
        )}
      </div>

      <AlertDetailDrawer alertId={selectedAlertId} onClose={() => setSelectedAlertId(null)} />
    </div>
  );
}
