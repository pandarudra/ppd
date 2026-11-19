import { useQuery } from "@tanstack/react-query";
import Card from "../components/common/Card";
import PageHeader from "../components/layout/PageHeader";
import * as analyticsApi from "../api/analyticsApi";
import { useAuthStore } from "../stores/authStore";
import { useWsStore } from "../stores/wsStore";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Row({ label, value }) {
  return (
    <li className="flex items-center justify-between border-b border-hairline py-3 last:border-0">
      <span className="text-body-sm text-charcoal">{label}</span>
      <span className="text-body-sm text-ink">{value}</span>
    </li>
  );
}

// Read-only: no backend settings endpoint exists yet.
export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const connected = useWsStore((s) => s.connected);
  const { data } = useQuery({ queryKey: ["models"], queryFn: analyticsApi.getModels });
  const models = Object.keys(data?.models || {});

  return (
    <div className="space-y-8">
      <PageHeader title="Settings">Current configuration. Read only.</PageHeader>
      <Card>
        <h2 className="mb-2 text-heading-md">Account</h2>
        <ul>
          <Row label="Name" value={user?.full_name} />
          <Row label="Email" value={user?.email} />
          <Row label="Role" value={user?.role} />
        </ul>
      </Card>
      <Card>
        <h2 className="mb-2 text-heading-md">System</h2>
        <ul>
          <Row label="API" value={API} />
          <Row label="Live updates" value={connected ? "Connected" : "Offline"} />
          <Row label="Detection models" value={models.length ? models.join(", ").replaceAll("_", " ") : "None loaded"} />
        </ul>
      </Card>
    </div>
  );
}
