import { useQuery } from "@tanstack/react-query";
import Card from "../components/common/Card";
import PageHeader from "../components/layout/PageHeader";
import * as analyticsApi from "../api/analyticsApi";
import { useAuthStore } from "../stores/authStore";
import { useHomeStore } from "../stores/homeStore";
import Button from "../components/common/Button";
import { useState } from "react";
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
  const home = useHomeStore((s) => s.home);
  const detect = useHomeStore((s) => s.detect);
  const [locating, setLocating] = useState(false);
  const SOURCES = { browser: "your browser", network: "your network's IP", default: "configured default" };

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
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-heading-md">Network location</h2>
          <Button variant="secondary" disabled={locating} onClick={async () => { setLocating(true); await detect(); setLocating(false); }}>
            {locating ? "Detecting…" : "Detect again"}
          </Button>
        </div>
        <ul>
          <Row label="Shown on the map as" value={home.label} />
          <Row label="Coordinates" value={`${home.lat.toFixed(2)}, ${home.lon.toFixed(2)}`} />
          <Row label="Detected from" value={SOURCES[home.source] || home.source} />
        </ul>
        <p className="mt-3 text-caption-sm text-mute">Assumes you are near your network. If your browser refuses location access, the network's public IP is looked up instead.</p>
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
