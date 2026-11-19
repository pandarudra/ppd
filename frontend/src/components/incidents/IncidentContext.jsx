import { useQueries } from "@tanstack/react-query";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import * as intelApi from "../../api/intelligenceApi";

/** Right-hand context for an incident: involved hosts plus threat-intel enrichment per source IP. */
export default function IncidentContext({ alerts = [] }) {
  const sources = [...new Set(alerts.map((a) => a.source_ip).filter(Boolean))];
  const targets = [...new Set(alerts.map((a) => a.dest_ip).filter(Boolean))];
  const lookups = useQueries({
    queries: sources.map((ip) => ({ queryKey: ["ioc", ip], queryFn: () => intelApi.lookupIoc(ip, "IP"), staleTime: 60000 })),
  });

  return (
    <aside className="space-y-6 text-body-sm">
      <section>
        <h3 className="eyebrow mb-3">Threat intel</h3>
        {!sources.length && <p className="text-mute">No source IPs on linked alerts.</p>}
        <ul className="space-y-2">
          {sources.map((ip, i) => {
            const r = lookups[i]?.data;
            const bad = r?.found;
            return (
              <li key={ip} className="panel p-3">
                <div className="flex items-center gap-2">
                  {bad ? <ShieldAlert size={14} className="text-sev-critical" /> : <ShieldCheck size={14} className="text-mute" />}
                  <span className="font-mono text-ink">{ip}</span>
                </div>
                <p className="mt-1 text-caption-sm text-body">
                  {lookups[i]?.isLoading ? "Looking up…" : bad ? `${r.threat_type || "Known bad"} · confidence ${r.confidence} · ${r.source || "feed"}` : "Not in the IOC feed"}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
      <section>
        <h3 className="eyebrow mb-3">Affected assets</h3>
        {!targets.length && <p className="text-mute">None recorded.</p>}
        <ul className="space-y-1.5">
          {targets.map((ip) => <li key={ip} className="font-mono text-charcoal">{ip}</li>)}
        </ul>
      </section>
    </aside>
  );
}
