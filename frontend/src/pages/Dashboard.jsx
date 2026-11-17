import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Bell, AlertTriangle, FolderOpen } from "lucide-react";
import MetricCard from "../components/common/MetricCard";
import AlertSeverityChart from "../components/charts/AlertSeverityChart";
import AlertCard from "../components/alerts/AlertCard";
import * as analyticsApi from "../api/analyticsApi";
import * as alertsApi from "../api/alertsApi";
import { useAlertStore } from "../stores/alertStore";
import { useWsStore } from "../stores/wsStore";

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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-100">SOC Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Events (24h)"
          value={isLoading ? "…" : data?.total_events ?? 0}
          icon={Activity}
        />
        <MetricCard
          label="Open Alerts"
          value={isLoading ? "…" : data?.open_alerts ?? 0}
          icon={Bell}
          accent="text-orange-400"
        />
        <MetricCard
          label="Critical Alerts"
          value={isLoading ? "…" : data?.critical_alerts ?? 0}
          icon={AlertTriangle}
          accent="text-red-500"
        />
        <MetricCard
          label="Open Incidents"
          value={isLoading ? "…" : data?.open_incidents ?? 0}
          icon={FolderOpen}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Alerts by Severity (7d)</h2>
          <AlertSeverityChart data={data?.alerts_by_severity} />
        </div>

        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">System Health</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {["backend", "ml_service", "db", "redis"].map((key) => (
              <div key={key} className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    health?.[key] === "ok" ? "bg-green-500" : "bg-slate-600"
                  }`}
                />
                <span className="text-slate-400 capitalize">{key.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>
          {!health && (
            <p className="text-xs text-slate-500 mt-3">
              Waiting for the first health broadcast (every 30s)...
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Live Alert Feed</h2>
        <div className="space-y-2">
          {alerts.length === 0 && (
            <div className="text-slate-500 text-sm">
              No alerts yet. New detections appear here in real time.
            </div>
          )}
          {alerts.slice(0, 20).map((a) => (
            <AlertCard key={a.alert_id} alert={a} />
          ))}
        </div>
      </div>
    </div>
  );
}
