import { useQuery } from "@tanstack/react-query";
import DetailDrawer from "../common/DetailDrawer";
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

  return (
    <DetailDrawer open={!!eventId} onClose={onClose} title="Event detail">
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
        </div>
      )}
    </DetailDrawer>
  );
}
