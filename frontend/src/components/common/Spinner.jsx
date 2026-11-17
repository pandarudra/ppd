export default function Spinner({ className = "" }) {
  return (
    <div
      className={`animate-spin h-5 w-5 rounded-full border-2 border-slate-600 border-t-blue-400 ${className}`}
    />
  );
}
