import DataTable from "../common/DataTable";
import { StatusBadge } from "../common/Badge";
import { truncateId, timeAgo } from "../../utils/formatters";

const COLUMNS = [
  { key: "event_id", label: "Event ID", render: (r) => <span className="font-mono">{truncateId(r.event_id)}</span> },
  { key: "source_ip", label: "Source IP", render: (r) => <span className="font-mono">{r.source_ip || "—"}</span> },
  { key: "dest_ip", label: "Dest IP", render: (r) => <span className="font-mono">{r.dest_ip || "—"}</span> },
  { key: "dest_port", label: "Port", render: (r) => r.dest_port ?? "—" },
  { key: "protocol", label: "Protocol", render: (r) => r.protocol || "—" },
  { key: "event_type", label: "Event Type", render: (r) => r.event_type || "—" },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  {
    key: "risk_level",
    label: "Risk",
    render: (r) => r.detection_summary?.risk_level || "—",
  },
  { key: "ingested_at", label: "Ingested", render: (r) => timeAgo(r.ingested_at) },
];

export default function EventTable({ events, onRowClick }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={events}
      onRowClick={onRowClick}
      emptyMessage="No events match the current filters"
    />
  );
}
