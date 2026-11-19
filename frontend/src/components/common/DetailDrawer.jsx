import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function DetailDrawer({ open, onClose, title, actions, children }) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-label={title}
        className="relative h-full w-full max-w-[520px] overflow-y-auto border-l border-hairline bg-canvas p-6 shadow-[0_0_40px_rgba(0,0,0,0.4)] md:p-8"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-heading-md">{title}</h2>
          <div className="flex items-center gap-2">
            {actions}
            <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-ink">
              <X size={18} />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
