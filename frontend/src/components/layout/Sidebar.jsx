import { NavLink } from "react-router-dom";
import { LayoutDashboard, Radar, Bell, FolderOpen, Bot } from "lucide-react";

const LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/events", label: "Events", icon: Radar },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/incidents", label: "Incidents", icon: FolderOpen },
  { to: "/assistant", label: "AI Assistant", icon: Bot },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-slate-800 border-r border-slate-600 min-h-screen p-4">
      <div className="text-lg font-bold text-slate-100 mb-6 tracking-tight">SENTINEL</div>
      <nav className="space-y-1">
        {LINKS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-700"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
