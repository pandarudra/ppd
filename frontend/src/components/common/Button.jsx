const VARIANTS = {
  primary: "bg-primary text-on-dark hover:bg-primary-press active:bg-primary-press",
  blue: "bg-secondary text-on-dark hover:brightness-110",
  secondary: "bg-surface text-ink border border-hairline hover:border-hairline-strong",
  ghost: "bg-transparent text-charcoal hover:bg-surface",
  "on-dark": "bg-canvas text-ink",
};

export default function Button({ children, variant = "primary", className = "", ...props }) {
  return (
    <button
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-button-md transition-colors disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface disabled:text-mute ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
