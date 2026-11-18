import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useWsStore } from "../../stores/wsStore";
import Button from "../common/Button";
import Logo from "./Logo";
import { NAV_LINKS } from "./navLinks";

function LiveStatus() {
  const connected = useWsStore((s) => s.connected);
  return (
    <span className="flex items-center gap-2 text-body-sm text-body">
      <span
        className={`h-2 w-2 rounded-full ${connected ? "bg-ink" : "border border-hairline-strong"}`}
      />
      {connected ? "Live" : "Offline"}
    </span>
  );
}

const linkClass = ({ isActive }) =>
  `text-body-sm font-medium ${isActive ? "text-ink" : "text-body"}`;

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-canvas">
      <div className="mx-auto flex h-14 max-w-wide items-center justify-between gap-6 px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2" aria-label="Sentinel home">
            <Logo />
            <span className="font-display text-heading-sm">Sentinel</span>
          </Link>
          <nav className="hidden items-center gap-5 md:flex">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} className={linkClass}>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <LiveStatus />
          <span className="text-body-sm text-charcoal">{user?.full_name}</span>
          <Button variant="secondary" onClick={logout}>
            Sign out
          </Button>
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-4 border-t border-hairline px-4 py-6 md:hidden">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} className={linkClass} onClick={() => setOpen(false)}>
              {label}
            </NavLink>
          ))}
          <div className="flex items-center justify-between pt-2">
            <LiveStatus />
            <Button variant="secondary" onClick={logout}>
              Sign out
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
