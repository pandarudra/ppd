import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import { logout as logoutApi } from "../../api/authApi";
import { useAuthStore } from "../../stores/authStore";
import { NAV_LINKS } from "./navLinks";
import Logo from "./Logo";

// Fixed icon rail (DESIGN.md `sidebar-rail`): icons + micro-labels, active item in green.
export default function Sidebar({ onNavigate }) {
  const role = useAuthStore((s) => s.user?.role);
  const logout = useAuthStore((s) => s.logout);
  const signOut = () => logoutApi().catch(() => {}).finally(logout);
  const links = NAV_LINKS.filter((l) => !l.admin || role === "admin");

  return (
    <nav aria-label="Main" className="flex h-full flex-col items-center gap-1 overflow-y-auto px-2 py-4">
      <NavLink to="/dashboard" onClick={onNavigate} aria-label="Sentinel home" className="mb-4 flex h-10 w-10 items-center justify-center">
        <Logo size={28} />
      </NavLink>
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `group relative flex w-full flex-col items-center gap-1 rounded-lg py-2 text-[11px] leading-none ${
              isActive ? "bg-surface text-primary" : "text-body hover:bg-white/[0.04] hover:text-ink"
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute -left-2 top-2 h-[calc(100%-16px)] w-[3px] rounded-r bg-primary" />}
              <Icon size={20} strokeWidth={2} />
              <span className="max-w-full truncate px-1">{label}</span>
            </>
          )}
        </NavLink>
      ))}
      <button
        onClick={signOut}
        className="mt-auto flex w-full flex-col items-center gap-1 rounded-lg py-2 text-[11px] leading-none text-body hover:bg-white/[0.04] hover:text-ink"
      >
        <LogOut size={20} strokeWidth={2} />
        <span>Log out</span>
      </button>
    </nav>
  );
}
