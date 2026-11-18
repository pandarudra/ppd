import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import MetricCard from "../components/common/MetricCard";
import Card from "../components/common/Card";
import AlertSeverityChart from "../components/charts/AlertSeverityChart";
import AlertCard from "../components/alerts/AlertCard";
import PageHeader from "../components/layout/PageHeader";
import * as analyticsApi from "../api/analyticsApi";
import * as alertsApi from "../api/alertsApi";
import { useAlertStore } from "../stores/alertStore";
import { useWsStore } from "../stores/wsStore";

const SERVICES = ["backend", "ml_service", "db", "redis"];

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: analyticsApi.getDashboard,
    refetchInterval: 30000,
  });

  const alerts = useAlertStore((s) => s.alerts);
  const setAlerts = useAlertStore((s) => s.setAlerts);
  const health = useWsStore((s) => s.health);

  useEffect(() => {
    // Seed the live feed once from the API; WebSocket `new_alert`/
    // `alert_updated` events keep it current after that.
    if (alerts.length === 0) {
      alertsApi
        .listAlerts({ per_page: 20 })
        .then((res) => setAlerts(res.alerts))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metric = (v) => (isLoading ? "…" : v ?? 0);

  return (
    <div className="section-gap">
      <div className="space-y-8">
        <PageHeader title="Overview">What the detection pipeline has seen in the last 24 hours.</PageHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Events (24h)" value={metric(data?.total_events)} />
          <MetricCard label="Open alerts" value={metric(data?.open_alerts)} />
          <MetricCard label="Critical alerts" value={metric(data?.critical_alerts)} dark />
          <MetricCard label="Open incidents" value={metric(data?.open_incidents)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-6 text-heading-md">Alerts by severity, 7 days</h2>
          <AlertSeverityChart data={data?.alerts_by_severity} />
        </Card>

        <Card>
          <h2 className="mb-6 text-heading-md">System health</h2>
          <ul>
            {SERVICES.map((key) => {
              const ok = health?.[key] === "ok";
              return (
                <li key={key} className="flex items-center justify-between border-b border-hairline py-3 last:border-0">
                  <span className="text-body-sm capitalize text-charcoal">{key.replaceAll("_", " ")}</span>
                  <span className={`flex items-center gap-2 text-body-sm ${ok ? "text-ink" : "text-mute"}`}>
                    <span className={`h-2 w-2 rounded-full ${ok ? "bg-ink" : "border border-hairline-strong"}`} />
                    {ok ? "Healthy" : health ? "Down" : "Unknown"}
                  </span>
                </li>
              );
            })}
          </ul>
          {!health && (
            <p className="mt-4 text-caption-sm text-mute">Waiting for the first health broadcast, sent every 30 seconds.</p>
          )}
        </Card>
      </div>

      <section>
        <h2 className="text-heading-lg">Live alert feed</h2>
        <div className="mt-4 border-t border-hairline">
          {alerts.length === 0 && (
            <p className="py-6 text-body">No alerts yet. New detections appear here in real time.</p>
          )}
          {alerts.slice(0, 20).map((a) => (
            <AlertCard key={a.alert_id} alert={a} />
          ))}
        </div>
      </section>
    </div>
  );
}
