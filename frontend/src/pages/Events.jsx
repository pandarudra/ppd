import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import EventTable from "../components/events/EventTable";
import EventDetailDrawer from "../components/events/EventDetailDrawer";
import Spinner from "../components/common/Spinner";
import Button from "../components/common/Button";
import PageHeader from "../components/layout/PageHeader";
import * as eventsApi from "../api/eventsApi";

const EMPTY = { source_ip: "", event_type: "", status: "" };

export default function Events() {
  const [filters, setFilters] = useState(EMPTY);
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
    <div className="space-y-8">
      <PageHeader title="Events">Raw security events as they arrive, with their detection result.</PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-60">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input
            aria-label="Source IP"
            className="search-pill w-full pl-9"
            placeholder="Source IP"
            value={filters.source_ip}
            onChange={(e) => updateFilter("source_ip", e.target.value)}
          />
        </div>
        <input
          aria-label="Event type"
          className="search-pill w-full sm:w-48"
          placeholder="Event type"
          value={filters.event_type}
          onChange={(e) => updateFilter("event_type", e.target.value)}
        />
        <select
          aria-label="Status"
          className="search-pill w-full pr-8 sm:w-40"
          value={filters.status}
          onChange={(e) => updateFilter("status", e.target.value)}
        >
          <option value="">Any status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="processed">Processed</option>
          <option value="failed">Failed</option>
        </select>
        <Button variant="secondary" onClick={() => setFilters(EMPTY)}>
          Clear
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
