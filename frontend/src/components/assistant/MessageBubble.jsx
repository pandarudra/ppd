export default function MessageBubble({ role, content }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-surface-soft px-4 py-3 text-body-md text-ink">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-1 text-body-sm font-medium text-ink">Sentinel AI</div>
      <p className="whitespace-pre-wrap text-body-md text-charcoal">{content}</p>
    </div>
  );
}
