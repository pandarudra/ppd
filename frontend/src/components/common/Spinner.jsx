export default function Spinner({ className = "" }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`h-5 w-5 animate-spin rounded-full border-2 border-hairline border-t-ink ${className}`}
    />
  );
}
