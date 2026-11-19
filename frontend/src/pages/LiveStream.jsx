import { useState } from "react";
import Pagination, { usePagination } from "../components/common/Pagination";
import { Pause, Play, Trash2 } from "lucide-react";
import Button from "../components/common/Button";
import Segmented from "../components/common/Segmented";
import PageHeader from "../components/layout/PageHeader";
import { useEventStore } from "../stores/eventStore";
import { SeverityBadge } from "../components/common/Badge";

const isHostile = (e) => ["MEDIUM", "HIGH", "CRITICAL"].includes(e.risk_level);

export default function LiveStream() {
  const events = useEventStore((s) => s.events);
  const paused = useEventStore((s) => s.paused);
  const setPaused = useEventStore((s) => s.setPaused);
  const clear = useEventStore((s) => s.clear);
  const [filter, setFilter] = useState("all");
  const pg = usePagination(25);
  const all = filter === "all" ? events : events.filter(isHostile);
  const rows = all.slice((pg.page - 1) * pg.perPage, pg.page * pg.perPage);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live stream"
        actions={
          <>
            <Segmented label="Filter" value={filter} onChange={(v) => { setFilter(v); pg.reset(); }} options={[{ value: "all", label: "All events" }, { value: "attacks", label: "Threats only" }]} />
            <Button variant="secondary" onClick={() => setPaused(!paused)}>{paused ? <Play size={14} /> : <Pause size={14} />}{paused ? "Resume" : "Pause"}</Button>
            <Button variant="secondary" onClick={clear}><Trash2 size={14} />Clear</Button>
          </>
        }
      >
        Every event as it is scored: source, destination, port, protocol and verdict.
      </PageHeader>

      <div className="card overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead>
            <tr>
              {["Time", "Source", "Origin", "Destination", "Port", "Proto", "Type", "Verdict"].map((h) => (
                <th key={h} className="eyebrow whitespace-nowrap px-4 py-3 text-left !font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono">
            {rows.map((e) => (
              <tr key={e._k} className="animate-flash border-t border-hairline">
                <td className="whitespace-nowrap px-4 py-2.5 text-mute">{e.ts ? new Date(e.ts).toLocaleTimeString() : ""}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-ink">{e.source_ip}</td>
                <td className="whitespace-nowrap px-4 py-2.5 font-sans text-body">{e.geo ? `${e.geo.city}, ${e.geo.country}` : "internal"}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-ink">{e.dest_ip}</td>
                <td className="px-4 py-2.5 text-charcoal">{e.dest_port ?? "—"}</td>
                <td className="px-4 py-2.5 text-charcoal">{e.protocol}</td>
                <td className="whitespace-nowrap px-4 py-2.5 font-sans text-charcoal">{e.event_type?.replaceAll("_", " ")}</td>
                <td className="px-4 py-2.5 font-sans">
                  {isHostile(e) ? <SeverityBadge severity={e.risk_level} /> : <span className="text-body-sm text-primary">benign</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="py-16 text-center text-body">
            {paused ? "Paused." : "Waiting for events. Run scripts/replay_traffic.py or point syslog at the listener."}
          </p>
        )}
      </div>
      <Pagination page={pg.page} perPage={pg.perPage} total={all.length} onPage={pg.setPage} onPerPage={pg.setPerPage} />
    </div>
  );
}
