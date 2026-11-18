import { timeAgo } from "../../utils/formatters";

export default function IncidentTimeline({ timeline }) {
  if (!timeline?.length) {
    return <p className="py-6 text-body">No timeline entries yet.</p>;
  }

  return (
    <ol className="space-y-6 border-l border-hairline pl-5">
      {timeline.map((entry) => (
        <li key={entry.id} className="relative">
          <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-ink" />
          <div className="text-body-md text-ink">{entry.description}</div>
          <div className="mt-1 text-body-sm text-body">
            {entry.user} · {timeAgo(entry.created_at)}
          </div>
        </li>
      ))}
    </ol>
  );
}
