// Tab/segment control used for ranges and filters.
export default function Segmented({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border border-hairline bg-panel p-0.5">
      {options.map(({ value: v, label: l }) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`h-8 rounded-md px-3 text-body-sm transition-colors ${value === v ? "bg-secondary text-on-dark" : "text-body hover:text-ink"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
