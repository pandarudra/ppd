export default function Card({ children, className = "" }) {
  return (
    <div className={`bg-slate-800 border border-slate-600 rounded-lg p-4 ${className}`}>
      {children}
    </div>
  );
}
