export default function TerminalCard({ title, children }) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-1">
        <span className="h-3 w-3 rounded-full bg-terminal-red" />
        <span className="h-3 w-3 rounded-full bg-terminal-yellow" />
        <span className="h-3 w-3 rounded-full bg-terminal-green" />
        {title && <span className="ml-2 font-mono text-caption-sm text-mute"># {title}</span>}
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-body-sm text-ink">{children}</pre>
    </div>
  );
}
