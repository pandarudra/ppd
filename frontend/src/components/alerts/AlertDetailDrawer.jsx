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
    <DetailDrawer open={!!alertId} onClose={onClose} title="Alert detail">
      {isLoading || !alert ? (
        <Spinner />
      ) : (
        <div className="space-y-8">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <SeverityBadge severity={alert.severity} />
              <StatusBadge status={alert.status} />
            </div>
            <h3 className="text-heading-md">{alert.title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-body-md text-body">{alert.description}</p>
            {alert.event && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="command-tag">src {alert.event.source_ip || "—"}</span>
                <span className="command-tag">port {alert.event.dest_port ?? "—"}</span>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="alert-status" className="label">
              Status
            </label>
            <select
              id="alert-status"
              className="text-input capitalize"
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

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => explainMutation.mutate()} disabled={explainMutation.isPending}>
              {explainMutation.isPending ? "Thinking…" : "Explain with AI"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => linkIncidentMutation.mutate()}
              disabled={linkIncidentMutation.isPending || linkIncidentMutation.isSuccess}
            >
              {linkIncidentMutation.isSuccess ? "Linked to incident" : "Open incident"}
            </Button>
          </div>

          {explanation && (
            <section>
              <h3 className="mb-2 text-heading-sm">AI explanation</h3>
              <p className="whitespace-pre-wrap text-body-md text-body">{explanation.explanation}</p>
            </section>
          )}

          <div>
            <label htmlFor="alert-comment" className="label">
              Add comment
            </label>
            <textarea
              id="alert-comment"
              className="w-full rounded-lg border border-hairline bg-canvas px-4 py-3 text-body-md text-ink focus:border-ink"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button
              className="mt-3"
              onClick={() => commentMutation.mutate()}
              disabled={!comment.trim() || commentMutation.isPending}
            >
              Submit comment
            </Button>
          </div>
        </div>
      )}
    </DetailDrawer>
  );
}
