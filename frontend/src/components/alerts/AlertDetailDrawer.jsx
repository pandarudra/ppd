import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DetailDrawer from "../common/DetailDrawer";
import { SeverityBadge, StatusBadge } from "../common/Badge";
import Button from "../common/Button";
import Spinner from "../common/Spinner";
import * as alertsApi from "../../api/alertsApi";
import * as assistantApi from "../../api/assistantApi";
import * as incidentsApi from "../../api/incidentsApi";
import { ALERT_STATUSES } from "../../utils/constants";

export default function AlertDetailDrawer({ alertId, onClose }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [explanation, setExplanation] = useState(null);

  const { data: alert, isLoading } = useQuery({
    queryKey: ["alert", alertId],
    queryFn: () => alertsApi.getAlert(alertId),
    enabled: !!alertId,
  });

  const statusMutation = useMutation({
    mutationFn: (status) => alertsApi.updateAlertStatus(alertId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert", alertId] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: () => alertsApi.commentOnAlert(alertId, comment),
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["alert", alertId] });
    },
  });

  const explainMutation = useMutation({
    mutationFn: () => assistantApi.explainAlert(alertId),
    onSuccess: (data) => setExplanation(data),
  });

  const linkIncidentMutation = useMutation({
    mutationFn: () =>
      incidentsApi.createIncident({
        title: `Incident: ${alert.title}`,
        severity: alert.severity,
        alert_ids: [alertId],
      }),
  });

  return (
    <DetailDrawer open={!!alertId} onClose={onClose} title="Alert Detail">
      {isLoading || !alert ? (
        <Spinner />
      ) : (
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SeverityBadge severity={alert.severity} />
              <StatusBadge status={alert.status} />
            </div>
            <h3 className="text-base font-semibold text-slate-100">{alert.title}</h3>
            <p className="text-sm text-slate-400 whitespace-pre-wrap mt-1">{alert.description}</p>
          </div>

          {alert.event && (
            <div className="text-xs text-slate-400 space-y-1">
              <div>Source IP: {alert.event.source_ip || "—"}</div>
              <div>Dest port: {alert.event.dest_port ?? "—"}</div>
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 uppercase block mb-1">Status</label>
            <select
              className="w-full bg-slate-900 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-slate-100"
              value={alert.status}
              onChange={(e) => statusMutation.mutate(e.target.value)}
            >
              {ALERT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => explainMutation.mutate()} disabled={explainMutation.isPending}>
              {explainMutation.isPending ? "Thinking..." : "Get AI Explanation"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => linkIncidentMutation.mutate()}
              disabled={linkIncidentMutation.isPending || linkIncidentMutation.isSuccess}
            >
              {linkIncidentMutation.isSuccess ? "Linked to Incident" : "Link to Incident"}
            </Button>
          </div>

          {explanation && (
            <div className="bg-slate-900 border border-slate-600 rounded-md p-3 text-sm text-slate-300 whitespace-pre-wrap">
              <div className="text-xs text-slate-500 uppercase mb-1">AI Explanation</div>
              {explanation.explanation}
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 uppercase block mb-1">Add Comment</label>
            <textarea
              className="w-full bg-slate-900 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-slate-100"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button
              className="mt-2"
              onClick={() => commentMutation.mutate()}
              disabled={!comment.trim() || commentMutation.isPending}
            >
              Submit Comment
            </Button>
          </div>
        </div>
      )}
    </DetailDrawer>
  );
}
