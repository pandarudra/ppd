import Markdown from "../common/Markdown";
import Logo from "../layout/Logo";

export default function MessageBubble({ role, content }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-card rounded-br-md bg-secondary px-4 py-2.5 text-body-md text-on-dark">{content}</div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface"><Logo size={16} /></span>
      <div className="card min-w-0 flex-1 !rounded-tl-md p-5">
        <div className="eyebrow mb-3">Sentinel AI</div>
        <Markdown>{content}</Markdown>
      </div>
    </div>
  );
}
