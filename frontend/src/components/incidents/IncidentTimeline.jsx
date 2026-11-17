import { timeAgo } from "../../utils/formatters";

export default function IncidentTimeline({ timeline }) {
  if (!timeline?.length) {
    return <div className="text-slate-500 text-sm py-6 text-center">No timeline entries yet</div>;
  }

  return (
    <ol className="space-y-4 border-l border-slate-600 pl-4">
      {timeline.map((entry) => (
        <li key={entry.id} className="relative">
          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
          <div className="text-sm text-slate-200">{entry.description}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {entry.user} · {timeAgo(entry.created_at)}
          </div>
        </li>
      ))}
    </ol>
  );
}
