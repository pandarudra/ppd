import { useQuery } from "@tanstack/react-query";
import DetailDrawer from "../common/DetailDrawer";
import Spinner from "../common/Spinner";
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
    <DetailDrawer open={!!eventId} onClose={onClose} title="Event Detail">
      {isLoading || !event ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          <div>
            <div className="text-xs text-slate-500 uppercase mb-1">Raw Log</div>
            <pre className="bg-slate-900 border border-slate-600 rounded-md p-3 text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">
              {event.raw_log}
            </pre>
          </div>

          <div>
            <div className="text-xs text-slate-500 uppercase mb-1">Normalized Data</div>
            <pre className="bg-slate-900 border border-slate-600 rounded-md p-3 text-xs text-slate-300 overflow-x-auto">
              {JSON.stringify(event.normalized_data, null, 2)}
            </pre>
          </div>

          {detection && (
            <div>
              <div className="text-xs text-slate-500 uppercase mb-1">Detection Scores</div>
              <div className="space-y-1 text-sm text-slate-300">
                {Object.entries(detection.model_scores || {}).map(([model, score]) => (
                  <div key={model} className="flex justify-between">
                    <span className="capitalize">{model.replaceAll("_", " ")}</span>
                    <span>{(score * 100).toFixed(0)}%</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold pt-1 border-t border-slate-700">
                  <span>Risk Level</span>
                  <span>{detection.risk_level}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DetailDrawer>
  );
}
