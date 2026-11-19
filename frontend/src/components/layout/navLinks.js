import {
  LayoutDashboard, Radio, ListTree, Siren, FolderKanban, Network, BarChart3,
  Cpu, ShieldAlert, Bot, Users, Settings,
} from "lucide-react";

export const NAV_LINKS = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/live", label: "Live stream", icon: Radio },
  { to: "/events", label: "Events", icon: ListTree },
  { to: "/alerts", label: "Alerts", icon: Siren },
  { to: "/incidents", label: "Incidents", icon: FolderKanban },
  { to: "/attack-paths", label: "Attack paths", icon: Network },
  { to: "/intelligence", label: "Threat intel", icon: ShieldAlert },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/models", label: "Models", icon: Cpu },
  { to: "/assistant", label: "Assistant", icon: Bot },
  { to: "/users", label: "Users", icon: Users, admin: true },
  { to: "/settings", label: "Settings", icon: Settings },
];
