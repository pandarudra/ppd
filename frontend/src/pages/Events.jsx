import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import EventTable from "../components/events/EventTable";
import EventDetailDrawer from "../components/events/EventDetailDrawer";
import Spinner from "../components/common/Spinner";
import Button from "../components/common/Button";
import * as eventsApi from "../api/eventsApi";

export default function Events() {
  const [filters, setFilters] = useState({ source_ip: "", event_type: "", status: "" });
  const [selectedEventId, setSelectedEventId] = useState(null);

  const cleanParams = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));

  const { data, isLoading } = useQuery({
    queryKey: ["events", cleanParams],
    queryFn: () => eventsApi.listEvents(cleanParams),
  });

  function updateFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-100">Security Events Explorer</h1>

      <div className="flex flex-wrap gap-2 items-end">
        <input
          className="bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-slate-100"
          placeholder="Source IP"
          value={filters.source_ip}
          onChange={(e) => updateFilter("source_ip", e.target.value)}
        />
        <input
          className="bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-slate-100"
          placeholder="Event type"
          value={filters.event_type}
          onChange={(e) => updateFilter("event_type", e.target.value)}
        />
        <select
          className="bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-slate-100"
          value={filters.status}
          onChange={(e) => updateFilter("status", e.target.value)}
        >
          <option value="">Any status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="processed">Processed</option>
          <option value="failed">Failed</option>
        </select>
        <Button variant="secondary" onClick={() => setFilters({ source_ip: "", event_type: "", status: "" })}>
          Clear Filters
        </Button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <EventTable events={data?.events} onRowClick={(row) => setSelectedEventId(row.event_id)} />
      )}

      <EventDetailDrawer eventId={selectedEventId} onClose={() => setSelectedEventId(null)} />
    </div>
  );
}
