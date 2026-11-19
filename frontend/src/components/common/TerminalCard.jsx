export default function TerminalCard({ title, children }) {
  return (
    <div className="panel p-4">
      {title && <div className="eyebrow mb-3"># {title}</div>}
      <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-body-sm text-charcoal">{children}</pre>
    </div>
  );
}
