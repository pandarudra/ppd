const VARIANTS = {
  primary: "bg-primary text-on-dark active:bg-ink-deep",
  secondary: "bg-canvas text-ink border border-hairline-strong",
  "on-dark": "bg-canvas text-ink",
};

export default function Button({ children, variant = "primary", className = "", ...props }) {
  return (
    <button
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-full px-5 text-button-md disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-soft disabled:text-mute ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
