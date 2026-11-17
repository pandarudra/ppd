import { useAuthStore } from "../../stores/authStore";
import { useWsStore } from "../../stores/wsStore";

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const connected = useWsStore((s) => s.connected);

  return (
    <header className="h-14 border-b border-slate-600 bg-slate-800 flex items-center justify-between px-4">
      <div className="flex items-center gap-2 text-xs">
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
        <span className="text-slate-400">{connected ? "Live" : "Disconnected"}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-300">{user?.full_name}</span>
        <button
          onClick={logout}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
