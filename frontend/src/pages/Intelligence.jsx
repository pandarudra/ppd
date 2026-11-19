import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Spinner from "../components/common/Spinner";
import DataTable from "../components/common/DataTable";
import PageHeader from "../components/layout/PageHeader";
import * as intelApi from "../api/intelligenceApi";
import { useAuthStore } from "../stores/authStore";
import { timeAgo } from "../utils/formatters";

const TYPES = ["ip", "domain", "hash", "url"];
const COLUMNS = [
  { key: "ioc_type", label: "Type" },
  { key: "ioc_value", label: "Indicator" },
  { key: "threat_type", label: "Threat" },
  { key: "confidence", label: "Confidence" },
  { key: "source", label: "Source" },
  { key: "last_seen", label: "Last seen", render: (r) => timeAgo(r.last_seen) },
];

export default function Intelligence() {
  const qc = useQueryClient();
  const canAdd = useAuthStore((s) => s.user?.role !== "viewer");
  const [type, setType] = useState("ip");
  const [value, setValue] = useState("");
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({ ioc_type: "ip", ioc_value: "", threat_type: "", confidence: 50, source: "" });
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["iocs"], queryFn: () => intelApi.listIocs({ per_page: 100 }) });

  async function lookup(e) {
    e.preventDefault();
    setResult(await intelApi.lookupIoc(value.trim(), type));
  }

  async function add(e) {
    e.preventDefault();
    setError("");
    try {
      await intelApi.addIoc({ ...form, confidence: Number(form.confidence), threat_type: form.threat_type || null, source: form.source || null });
      setForm({ ...form, ioc_value: "" });
      qc.invalidateQueries({ queryKey: ["iocs"] });
    } catch (err) {
      setError(err.response?.data?.detail || "Could not add indicator");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Threat intelligence">Look up an indicator or browse the known-bad list.</PageHeader>

      <Card>
        <h2 className="mb-4 text-heading-md">Lookup</h2>
        <form onSubmit={lookup} className="flex flex-wrap gap-2">
          <select aria-label="Indicator type" className="search-pill" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <input aria-label="Indicator" required className="search-pill w-full pl-9" placeholder="203.0.113.50"
              value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <Button type="submit">Look up</Button>
        </form>
        {result && (
          <p className="mt-4 text-body-sm text-charcoal" role="status">
            {result.found
              ? `Known threat: ${result.threat_type || "unclassified"}, confidence ${result.confidence}, source ${result.source || "unknown"}.`
              : "Not found in the threat feed."}
          </p>
        )}
      </Card>

      {canAdd && (
        <Card>
          <h2 className="mb-4 text-heading-md">Add indicator</h2>
          <form onSubmit={add} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
            <select aria-label="Type" className="text-input-sm" value={form.ioc_type} onChange={(e) => setForm({ ...form, ioc_type: e.target.value })}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <input aria-label="Value" required placeholder="Value" className="text-input-sm sm:col-span-2" value={form.ioc_value} onChange={(e) => setForm({ ...form, ioc_value: e.target.value })} />
            <input aria-label="Threat type" placeholder="Threat type" className="text-input-sm" value={form.threat_type} onChange={(e) => setForm({ ...form, threat_type: e.target.value })} />
            <input aria-label="Confidence" type="number" min="0" max="100" className="text-input-sm" value={form.confidence} onChange={(e) => setForm({ ...form, confidence: e.target.value })} />
            <Button type="submit">Add</Button>
          </form>
          {error && <p className="mt-3 text-body-sm text-ink" role="alert">{error}</p>}
        </Card>
      )}

      {isLoading ? <Spinner /> : <DataTable columns={COLUMNS} rows={data?.iocs} emptyMessage="No indicators yet." />}
    </div>
  );
}
