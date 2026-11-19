export default function Card({ children, className = "", dark = false }) {
  return (
    <div className={`rounded-card p-5 md:p-6 ${dark ? "bg-secondary text-on-dark" : "card"} ${className}`}>{children}</div>
  );
}
