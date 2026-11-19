import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import Pagination, { usePagination } from "../components/common/Pagination";
import { SeverityBadge, StatusBadge } from "../components/common/Badge";
import IncidentWorkspace from "../components/incidents/IncidentWorkspace";
import Spinner from "../components/common/Spinner";
import PageHeader from "../components/layout/PageHeader";
import * as incidentsApi from "../api/incidentsApi";

export default function Incidents() {
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);

  const pg = usePagination(10);
  const { data, isLoading } = useQuery({
    queryKey: ["incidents", pg.page, pg.perPage],
    queryFn: () => incidentsApi.listIncidents({ page: pg.page, per_page: pg.perPage }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Incidents">Grouped alerts under active investigation.</PageHeader>

      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-72 lg:shrink-0">
          {isLoading && <Spinner />}
          <ul className="border-t border-hairline">
            {data?.incidents.map((incident) => {
              const active = selectedIncidentId === incident.incident_id;
              return (
                <li key={incident.incident_id}>
                  <button
                    onClick={() => setSelectedIncidentId(incident.incident_id)}
                    aria-current={active}
                    className={`w-full border-b border-hairline py-4 text-left ${active ? "" : "opacity-70"}`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <SeverityBadge severity={incident.severity} />
                      <StatusBadge status={incident.status} />
                    </div>
                    <div className={`truncate text-body-md ${active ? "font-medium text-ink" : "text-charcoal"}`}>
                      {incident.title}
                    </div>
                    <div className="mt-1 text-body-sm text-body">{incident.alert_count} linked alert(s)</div>
                  </button>
                </li>
              );
            })}
          </ul>
          {data && data.incidents.length === 0 && <p className="py-4 text-body">No incidents yet.</p>}
          <Pagination compact page={pg.page} perPage={pg.perPage} total={data?.total} onPage={pg.setPage} />
        </aside>

        <div className="card min-w-0 flex-1 p-6 md:p-8">
          <IncidentWorkspace incidentId={selectedIncidentId} />
        </div>
      </div>
    </div>
  );
}
