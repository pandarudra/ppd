import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DataTable from "../components/common/DataTable";
import ChipGroup from "../components/common/ChipGroup";
import { SeverityBadge, StatusBadge } from "../components/common/Badge";
import AlertDetailDrawer from "../components/alerts/AlertDetailDrawer";
import Spinner from "../components/common/Spinner";
import PageHeader from "../components/layout/PageHeader";
import * as alertsApi from "../api/alertsApi";
import { ALERT_STATUSES, SEVERITIES } from "../utils/constants";
import { timeAgo } from "../utils/formatters";

const COLUMNS = [
  { key: "severity", label: "Severity", render: (r) => <SeverityBadge severity={r.severity} /> },
  { key: "title", label: "Title" },
  { key: "source_ip", label: "Source IP", render: (r) => <span className="font-mono">{r.source_ip || "—"}</span> },
  {
    key: "confidence_score",
    label: "Confidence",
    render: (r) => (r.confidence_score != null ? `${Math.round(r.confidence_score * 100)}%` : "—"),
  },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  { key: "assigned_to", label: "Assigned to", render: (r) => r.assigned_to?.full_name || "Unassigned" },
  { key: "created_at", label: "Age", render: (r) => <span className="text-body">{timeAgo(r.created_at)}</span> },
];

export default function Alerts() {
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [selectedAlertId, setSelectedAlertId] = useState(null);

  const params = Object.fromEntries(Object.entries({ severity, status }).filter(([, v]) => v));

  const { data, isLoading } = useQuery({
    queryKey: ["alerts", params],
    queryFn: () => alertsApi.listAlerts(params),
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Alerts">Detections that need a human decision.</PageHeader>

      <div className="space-y-3">
        <ChipGroup
          label="Severity"
          options={SEVERITIES}
          value={severity}
          onChange={setSeverity}
          format={(s) => s.toLowerCase()}
        />
        <ChipGroup
          label="Status"
          options={ALERT_STATUSES}
          value={status}
          onChange={setStatus}
          format={(s) => s.replaceAll("_", " ")}
        />
      </div>

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

      <AlertDetailDrawer alertId={selectedAlertId} onClose={() => setSelectedAlertId(null)} />
    </div>
  );
}
