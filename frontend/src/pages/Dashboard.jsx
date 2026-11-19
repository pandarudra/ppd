import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MetricCard from "../components/common/MetricCard";
import Card from "../components/common/Card";
import Segmented from "../components/common/Segmented";
import { SeverityBadge } from "../components/common/Badge";
import AlertSeverityChart from "../components/charts/AlertSeverityChart";
import TrendChart from "../components/charts/TrendChart";
import WorldMap from "../components/charts/WorldMap";
import AlertCard from "../components/alerts/AlertCard";
import PageHeader from "../components/layout/PageHeader";
import * as analyticsApi from "../api/analyticsApi";
import * as alertsApi from "../api/alertsApi";
import { useAlertStore } from "../stores/alertStore";
import { useEventStore } from "../stores/eventStore";
import { useWsStore } from "../stores/wsStore";
import { SEVERITY_HEX } from "../utils/severityColors";

const SERVICES = ["backend", "ml_service", "db", "redis"];
const RANGES = [
  { value: 1, label: "1h" },
  { value: 24, label: "24h" },
  { value: 168, label: "7d" },
  { value: 720, label: "30d" },
];
const RISK_TO_SEV = { CRITICAL: "CRITICAL", HIGH: "HIGH", MEDIUM: "MEDIUM" };

function Panel({ title, children, action }) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-heading-sm">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

export default function Dashboard() {
  const [mode, setMode] = useState("live"); // live: auto-refresh + stream; history: frozen window
  const [hours, setHours] = useState(24);
  const live = mode === "live";
  const refetchInterval = live ? 15000 : false;

  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: analyticsApi.getDashboard, refetchInterval: 30000 });
  const { data: geo } = useQuery({ queryKey: ["geo", hours], queryFn: () => analyticsApi.getGeo(hours), refetchInterval });
  const { data: paths } = useQuery({ queryKey: ["trends-dash", hours], queryFn: () => analyticsApi.getTrends({ period: `${Math.max(1, Math.ceil(hours / 24))}d`, metric: "alert_volume" }), refetchInterval });

  const alerts = useAlertStore((s) => s.alerts);
  const setAlerts = useAlertStore((s) => s.setAlerts);
  const streamed = useEventStore((s) => s.events);
  const health = useWsStore((s) => s.health);

  useEffect(() => {
    if (alerts.length === 0) alertsApi.listAlerts({ per_page: 20 }).then((r) => setAlerts(r.alerts)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // In live mode, fold hostile events arriving over the WebSocket into the map immediately.
  const sources = useMemo(() => {
    const byIp = new Map((geo?.sources || []).map((s) => [s.ip, s]));
    if (live) {
      for (const e of streamed) {
        if (!e.geo || !RISK_TO_SEV[e.risk_level]) continue;
        const cur = byIp.get(e.source_ip);
        byIp.set(e.source_ip, cur ? cur : { ip: e.source_ip, alert_count: 1, severity: RISK_TO_SEV[e.risk_level], geo: e.geo });
      }
    }
    return [...byIp.values()];
  }, [geo, streamed, live]);

  const metric = (v) => (isLoading ? "…" : v ?? 0);
  const liveCount = streamed.length;

  return (
    <div className="section-gap">
      <PageHeader
        title="Overview"
        actions={
          <>
            <Segmented label="Mode" value={mode} onChange={setMode} options={[{ value: "live", label: "Live" }, { value: "history", label: "History" }]} />
            <Segmented label="Time range" value={hours} onChange={setHours} options={RANGES} />
          </>
        }
      >
        {live ? "Current activity, refreshed as events arrive." : `Everything seen in the selected window. Live updates are paused.`}
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Events (24h)" value={metric(data?.total_events)} />
        <MetricCard label="Open alerts" value={metric(data?.open_alerts)} />
        <MetricCard label="Critical alerts" value={metric(data?.critical_alerts)} dark />
        <MetricCard label="Open incidents" value={metric(data?.open_incidents)} hint={live ? `${liveCount} events streamed this session` : undefined} />
      </div>

      <Card className="!p-3 md:!p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2 pt-1">
          <h2 className="text-heading-sm">Attack origins</h2>
          <span className="flex items-center gap-4 text-caption-sm text-body">
            {Object.entries(SEVERITY_HEX).slice(0, 4).map(([k, c]) => (
              <span key={k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: c }} />{k.toLowerCase()}</span>
            ))}
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />your network</span>
          </span>
        </div>
        <WorldMap sources={sources} home={geo?.home} />
        {!sources.length && <p className="pb-2 text-center text-body-sm text-mute">No located attackers in this window. Run the traffic replayer to see arcs.</p>}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Top attackers">
          <ul>
            {(geo?.sources || []).slice(0, 6).map((s) => (
              <li key={s.ip} className="flex items-center justify-between gap-3 border-b border-hairline py-2.5 last:border-0">
                <div className="min-w-0">
                  <div className="font-mono text-body-sm text-ink">{s.ip}</div>
                  <div className="text-caption-sm text-mute">{s.geo.city}, {s.geo.country}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular text-body-sm text-charcoal">{s.alert_count}</span>
                  <SeverityBadge severity={s.severity} />
                </div>
              </li>
            ))}
            {!geo?.sources?.length && <p className="py-4 text-body-sm text-mute">No attackers yet.</p>}
          </ul>
        </Panel>

        <Panel title="Targeted assets">
          <ul>
            {(geo?.targets || []).map((t) => (
              <li key={t.ip} className="flex items-center justify-between gap-3 border-b border-hairline py-2.5 last:border-0">
                <div className="min-w-0">
                  <div className="font-mono text-body-sm text-ink">{t.ip}</div>
                  <div className="text-caption-sm text-mute">{t.sources} source(s) · ports {t.ports.join(", ") || "n/a"}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular text-body-sm text-charcoal">{t.alert_count}</span>
                  <SeverityBadge severity={t.severity} />
                </div>
              </li>
            ))}
            {!geo?.targets?.length && <p className="py-4 text-body-sm text-mute">No targeted assets yet.</p>}
          </ul>
        </Panel>

        <Panel title="System health">
          <ul>
            {SERVICES.map((key) => {
              const ok = health?.[key] === "ok";
              return (
                <li key={key} className="flex items-center justify-between border-b border-hairline py-2.5 last:border-0">
                  <span className="text-body-sm capitalize text-charcoal">{key.replaceAll("_", " ")}</span>
                  <span className={`flex items-center gap-2 text-body-sm ${ok ? "text-primary" : health ? "text-sev-critical" : "text-mute"}`}>
                    <span className={`h-2 w-2 rounded-full ${ok ? "bg-primary" : health ? "bg-sev-critical" : "bg-mute"}`} />
                    {ok ? "Healthy" : health ? "Down" : "Unknown"}
                  </span>
                </li>
              );
            })}
          </ul>
          {!health && <p className="mt-3 text-caption-sm text-mute">Waiting for the first health broadcast (every 30 s).</p>}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title={`Alert volume, ${RANGES.find((r) => r.value === hours)?.label}`}>
          <TrendChart points={paths?.data_points} />
        </Panel>
        <Panel title="Alerts by severity, 7 days">
          <AlertSeverityChart data={data?.alerts_by_severity} />
        </Panel>
      </div>

      <section>
        <h2 className="text-heading-lg">Live alert feed</h2>
        <div className="card mt-4 px-5">
          {alerts.length === 0 && <p className="py-6 text-body">No alerts yet. New detections appear here in real time.</p>}
          {alerts.slice(0, 20).map((a) => <AlertCard key={a.alert_id} alert={a} />)}
        </div>
      </section>
    </div>
  );
}
