// Single-select pill filter; clicking the active chip clears it.
export default function ChipGroup({ label, options, value, onChange, format = (o) => o }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-body-sm font-medium text-charcoal">{label}</span>
      {options.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? "" : o)}
            className={`h-8 rounded-full px-3 text-body-sm capitalize ${
              active ? "border border-ink bg-canvas text-ink" : "bg-surface-soft text-body"
            }`}
          >
            {format(o)}
          </button>
        );
      })}
    </div>
  );
}
