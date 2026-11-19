import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SeverityBadge, StatusBadge } from "../common/Badge";
import Button from "../common/Button";
import Spinner from "../common/Spinner";
import IncidentContext from "./IncidentContext";
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
    return <p className="text-body">Select an incident from the list.</p>;
  }

  if (isLoading || !incident) {
    return <Spinner />;
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_260px]">
    <div className="min-w-0 space-y-8">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
        </div>
        <h2 className="text-heading-lg">{incident.title}</h2>
        {incident.description && <p className="mt-2 text-body-md text-body">{incident.description}</p>}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="incident-status" className="label">
            Status
          </label>
          <select
            id="incident-status"
            className="text-input-sm w-44 capitalize"
            value={incident.status}
            onChange={(e) => statusMutation.mutate(e.target.value)}
          >
            {INCIDENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <Button variant="secondary" onClick={() => recommendMutation.mutate()} disabled={recommendMutation.isPending}>
          {recommendMutation.isPending ? "Thinking…" : "Recommend next steps"}
        </Button>
      </div>

      {recommendations && (
        <section>
          <h3 className="mb-2 text-heading-sm">AI recommendations</h3>
          <ol className="list-inside list-decimal space-y-2 text-body-md text-charcoal">
            {recommendations.recommendations.map((r) => (
              <li key={r.priority}>
                {r.action} <span className="text-mute">({r.safety})</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div>
        <div role="tablist" className="mb-4 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`h-8 rounded-lg px-4 text-body-sm ${
                tab === t ? "bg-surface text-ink" : "text-body"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Alerts" && (
          <ul className="border-t border-hairline">
            {incident.linked_alerts.map((a) => (
              <li key={a.alert_id} className="flex items-center justify-between gap-4 border-b border-hairline py-3">
                <span className="text-body-md text-ink">{a.title}</span>
                <SeverityBadge severity={a.severity} />
              </li>
            ))}
            {!incident.linked_alerts.length && <p className="py-4 text-body">No alerts linked yet.</p>}
          </ul>
        )}

        {tab === "Timeline" && <IncidentTimeline timeline={timelineData?.timeline} />}

        {tab === "Notes" && (
          <p className="text-body">Notes are recorded automatically on the Timeline tab as the incident is worked.</p>
        )}
      </div>
    </div>
    <IncidentContext alerts={incident.linked_alerts} />
    </div>
  );
}
