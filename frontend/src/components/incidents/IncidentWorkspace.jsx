import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SeverityBadge, StatusBadge } from "../common/Badge";
import Button from "../common/Button";
import Spinner from "../common/Spinner";
import IncidentTimeline from "./IncidentTimeline";
import * as incidentsApi from "../../api/incidentsApi";
import * as assistantApi from "../../api/assistantApi";

const TABS = ["Alerts", "Timeline", "Notes"];
const INCIDENT_STATUSES = ["open", "investigating", "contained", "resolved", "closed", "reopened"];

export default function IncidentWorkspace({ incidentId }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("Alerts");
  const [recommendations, setRecommendations] = useState(null);

  const { data: incident, isLoading } = useQuery({
    queryKey: ["incident", incidentId],
    queryFn: () => incidentsApi.getIncident(incidentId),
    enabled: !!incidentId,
  });

  const { data: timelineData } = useQuery({
    queryKey: ["incident-timeline", incidentId],
    queryFn: () => incidentsApi.getTimeline(incidentId),
    enabled: !!incidentId && tab === "Timeline",
  });

  const statusMutation = useMutation({
    mutationFn: (status) => incidentsApi.updateIncident(incidentId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incident-timeline", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });

  const recommendMutation = useMutation({
    mutationFn: () => assistantApi.recommendForIncident(incidentId),
    onSuccess: (data) => setRecommendations(data),
  });

  if (!incidentId) {
    return <div className="text-slate-500 text-sm">Select an incident from the list.</div>;
  }

  if (isLoading || !incident) {
    return <Spinner />;
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
        </div>
        <h2 className="text-lg font-semibold text-slate-100">{incident.title}</h2>
        <p className="text-sm text-slate-400 mt-1">{incident.description}</p>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-400 uppercase">Status</label>
        <select
          className="bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-sm text-slate-100"
          value={incident.status}
          onChange={(e) => statusMutation.mutate(e.target.value)}
        >
          {INCIDENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          onClick={() => recommendMutation.mutate()}
          disabled={recommendMutation.isPending}
        >
          {recommendMutation.isPending ? "Thinking..." : "Get AI Recommendations"}
        </Button>
      </div>

      {recommendations && (
        <div className="bg-slate-900 border border-slate-600 rounded-md p-3 text-sm text-slate-300">
          <div className="text-xs text-slate-500 uppercase mb-2">AI Recommendations</div>
          <ul className="space-y-1 list-decimal list-inside">
            {recommendations.recommendations.map((r) => (
              <li key={r.priority}>
                {r.action} <span className="text-slate-500">({r.safety})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-b border-slate-700 flex gap-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm ${
              tab === t ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Alerts" && (
        <ul className="space-y-2">
          {incident.linked_alerts.map((a) => (
            <li
              key={a.alert_id}
              className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-md px-3 py-2"
            >
              <span className="text-sm text-slate-200">{a.title}</span>
              <SeverityBadge severity={a.severity} />
            </li>
          ))}
          {!incident.linked_alerts.length && (
            <div className="text-slate-500 text-sm">No alerts linked yet.</div>
          )}
        </ul>
      )}

      {tab === "Timeline" && <IncidentTimeline timeline={timelineData?.timeline} />}

      {tab === "Notes" && (
        <div className="text-slate-500 text-sm">
          Notes are recorded automatically on the Timeline tab as the incident is worked.
        </div>
      )}
    </div>
  );
}
