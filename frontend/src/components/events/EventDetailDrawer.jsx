import { useMutation, useQuery } from "@tanstack/react-query";
import DetailDrawer from "../common/DetailDrawer";
import Markdown from "../common/Markdown";
import Button from "../common/Button";
import * as assistantApi from "../../api/assistantApi";
import Spinner from "../common/Spinner";
import TerminalCard from "../common/TerminalCard";
import * as eventsApi from "../../api/eventsApi";

export default function EventDetailDrawer({ eventId, onClose }) {
  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => eventsApi.getEvent(eventId),
    enabled: !!eventId,
  });

  const { data: detection } = useQuery({
    queryKey: ["event-detection", eventId],
    queryFn: () => eventsApi.getEventDetection(eventId),
    enabled: !!eventId && event?.status === "processed",
    retry: false,
  });

  const explain = useMutation({
    mutationFn: () =>
      assistantApi.analyze({
        question: "Explain this event and suggest next steps.",
        context_event_ids: [eventId],
      }),
  });
  const a = explain.data;

  return (
    <DetailDrawer
      open={!!eventId}
      onClose={onClose}
      title="Event detail"
      actions={
        <Button variant="secondary" onClick={() => explain.mutate()} disabled={explain.isPending || !event}>
          {explain.isPending ? "Thinking…" : "Explain & next steps"}
        </Button>
      }
    >
      {isLoading || !event ? (
        <Spinner />
      ) : (
        <div className="space-y-8">
          <TerminalCard title="raw log">{event.raw_log}</TerminalCard>
          <TerminalCard title="normalized">{JSON.stringify(event.normalized_data, null, 2)}</TerminalCard>

          {detection && (
            <section>
              <h3 className="mb-2 text-heading-sm">Detection scores</h3>
              <ul className="text-body-sm">
                {Object.entries(detection.model_scores || {}).map(([model, score]) => (
                  <li key={model} className="flex justify-between border-b border-hairline py-2 text-charcoal">
                    <span className="capitalize">{model.replaceAll("_", " ")}</span>
                    <span className="font-mono text-ink">{(score * 100).toFixed(0)}%</span>
                  </li>
                ))}
                <li className="flex justify-between py-2 font-medium text-ink">
                  <span>Risk level</span>
                  <span>{detection.risk_level}</span>
                </li>
              </ul>
            </section>
          )}

          {explain.isError && <p className="text-body-sm text-ink">Could not get an AI explanation.</p>}
          {a && (
            <section className="space-y-4">
              <h3 className="text-heading-sm">AI explanation</h3>
              <Markdown>{a.analysis}</Markdown>
              {a.investigation_steps?.length > 0 && (
                <div>
                  <h3 className="mb-2 text-heading-sm">Next steps</h3>
                  <ol className="list-decimal space-y-1 pl-5 text-body-sm">
                    {a.investigation_steps.map((s) => <li key={s}>{s}</li>)}
                  </ol>
                </div>
              )}
              {a.recommended_actions?.length > 0 && (
                <ul className="space-y-1 text-body-sm">
                  {a.recommended_actions.map((r) => (
                    <li key={r.action}>{r.action} <span className="command-tag">{r.safety}</span></li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </DetailDrawer>
  );
}
