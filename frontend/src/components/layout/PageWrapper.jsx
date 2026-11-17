import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useWebSocket } from "../../hooks/useWebSocket";

export default function PageWrapper({ children }) {
  useWebSocket();

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
