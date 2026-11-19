import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, RefreshCw, X } from "lucide-react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import Sidebar from "./Sidebar";
import Logo from "./Logo";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useAuthStore } from "../../stores/authStore";
import { useHomeStore } from "../../stores/homeStore";
import { useWsStore } from "../../stores/wsStore";

const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("") || "?";

function RefreshButton() {
  const qc = useQueryClient();
  const fetching = useIsFetching() > 0;
  return (
    <button
      onClick={() => qc.invalidateQueries()} // refetches every active query on the current page
      disabled={fetching}
      aria-label="Refresh data"
      title="Refresh data"
      className="flex h-9 items-center gap-2 rounded-lg border border-hairline bg-surface px-3 text-body-sm text-charcoal hover:border-hairline-strong disabled:text-mute"
    >
      <RefreshCw size={14} className={fetching ? "animate-spin" : ""} />
      <span className="hidden sm:inline">{fetching ? "Refreshing" : "Refresh"}</span>
    </button>
  );
}

function LiveStatus() {
  const connected = useWsStore((s) => s.connected);
  return (
    <span className="flex items-center gap-2 text-body-sm text-body">
      <span className={`h-2 w-2 rounded-full ${connected ? "animate-pulse bg-primary" : "bg-mute"}`} />
      {connected ? "Live" : "Offline"}
    </span>
  );
}

export default function PageWrapper({ children }) {
  useWebSocket();
  useEffect(() => {
    const { attempted, detect } = useHomeStore.getState();
    if (!attempted) detect(); // once per browser; asks for location permission
  }, []);
  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen bg-canvas">
      {/* desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[76px] border-r border-hairline bg-canvas md:block">
        <Sidebar />
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-[88px] border-r border-hairline bg-canvas">
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="md:pl-[76px]">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-hairline bg-canvas/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface md:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <span className="flex items-center gap-2 md:hidden">
              <Logo size={20} />
              <span className="text-heading-sm font-extrabold">Sentinel</span>
            </span>
            <span className="eyebrow hidden md:inline">Sentinel · Security operations</span>
          </div>
          <div className="flex items-center gap-4">
            <LiveStatus />
            <RefreshButton />
            <Link
              to="/profile"
              aria-label={`Profile: ${user?.full_name || "account"}`}
              title={user?.full_name}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-caption-sm font-extrabold uppercase text-on-dark hover:brightness-110"
            >
              {initials(user?.full_name)}
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-wide px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
