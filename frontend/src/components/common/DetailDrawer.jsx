import { X } from "lucide-react";

export default function DetailDrawer({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div
        role="dialog"
        aria-label={title}
        className="relative h-full w-full max-w-[520px] overflow-y-auto border-l border-hairline bg-canvas p-8"
      >
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-heading-md">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-ink"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
