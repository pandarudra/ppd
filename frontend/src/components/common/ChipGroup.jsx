// Single-select pill filter; clicking the active chip clears it.
export default function ChipGroup({ label, options, value, onChange, format = (o) => o }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-body-sm text-body">{label}</span>
      {options.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? "" : o)}
            className={`h-8 rounded-full border px-3 text-body-sm capitalize ${
              active ? "border-secondary bg-secondary/15 text-ink" : "border-hairline bg-surface text-body"
            }`}
          >
            {format(o)}
          </button>
        );
      })}
    </div>
  );
}
