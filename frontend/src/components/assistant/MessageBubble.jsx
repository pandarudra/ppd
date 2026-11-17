export default function MessageBubble({ role, content }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser ? "bg-blue-600 text-white" : "bg-slate-800 border border-slate-600 text-slate-200"
        }`}
      >
        {!isUser && <div className="text-xs text-slate-500 mb-1">SENTINEL-AI</div>}
        {content}
      </div>
    </div>
  );
}
