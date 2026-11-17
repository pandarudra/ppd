import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SeverityBadge, StatusBadge } from "../components/common/Badge";
import IncidentWorkspace from "../components/incidents/IncidentWorkspace";
import Spinner from "../components/common/Spinner";
import * as incidentsApi from "../api/incidentsApi";

export default function Incidents() {
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => incidentsApi.listIncidents({}),
  });

  return (
    <div className="flex gap-6 h-full">
      <aside className="w-72 shrink-0 space-y-2">
        <h1 className="text-lg font-bold text-slate-100 mb-2">Incidents</h1>
        {isLoading && <Spinner />}
        {data?.incidents.map((incident) => (
          <button
            key={incident.incident_id}
            onClick={() => setSelectedIncidentId(incident.incident_id)}
            className={`w-full text-left p-3 rounded-md border ${
              selectedIncidentId === incident.incident_id
                ? "border-blue-500 bg-slate-800"
                : "border-slate-700 bg-slate-800/50 hover:bg-slate-800"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
            <div className="text-sm text-slate-200 truncate">{incident.title}</div>
            <div className="text-xs text-slate-500">{incident.alert_count} linked alert(s)</div>
          </button>
        ))}
        {data && data.incidents.length === 0 && (
          <div className="text-slate-500 text-sm">No incidents yet.</div>
        )}
      </aside>

      <div className="flex-1 bg-slate-800 border border-slate-600 rounded-lg p-5">
        <IncidentWorkspace incidentId={selectedIncidentId} />
      </div>
    </div>
  );
}
