export default function Card({ children, className = "", dark = false }) {
  return (
    <div
      className={`rounded-lg p-8 ${dark ? "bg-surface-dark text-on-dark" : "border border-hairline bg-canvas"} ${className}`}
    >
      {children}
    </div>
  );
}
