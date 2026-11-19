import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Card from "../components/common/Card";
import Spinner from "../components/common/Spinner";
import Segmented from "../components/common/Segmented";
import FlowGraph from "../components/charts/FlowGraph";
import PageHeader from "../components/layout/PageHeader";
import * as analyticsApi from "../api/analyticsApi";
import { timeAgo } from "../utils/formatters";

const RANGES = [{ value: 1, label: "1h" }, { value: 24, label: "24h" }, { value: 168, label: "7d" }];
const LABEL = { recon: "Recon", brute_force: "Brute force", access: "Access", exfiltration: "Exfiltration" };

function KillChain({ attacker, order }) {
  const seen = new Map(attacker.stages.map((s) => [s.stage, s.first_seen]));
  return (
    <div className="flex items-center gap-1.5">
      {order.map((stage, i) => {
        const hit = seen.has(stage);
        return (
          <div key={stage} className="flex items-center gap-1.5">
            <span
              title={hit ? `First seen ${timeAgo(seen.get(stage))}` : "Not observed"}
              className={`rounded-full px-2.5 py-1 text-caption-sm ${hit ? "bg-sev-high/15 text-sev-high" : "bg-surface text-mute"}`}
            >
              {LABEL[stage]}
            </span>
            {i < order.length - 1 && <span className="text-mute">›</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function AttackPaths() {
  const [hours, setHours] = useState(24);
  const { data, isLoading } = useQuery({
    queryKey: ["attack-paths", hours],
    queryFn: () => analyticsApi.getAttackPaths(hours),
    refetchInterval: 20000,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Attack paths" actions={<Segmented label="Time range" value={hours} onChange={setHours} options={RANGES} />}>
        Who is attacking what, on which port, and how far along the kill chain each attacker has got.
      </PageHeader>

      {isLoading ? <Spinner /> : (
        <>
          <Card>
            <h2 className="mb-4 text-heading-sm">Flow: source → target → port</h2>
            <FlowGraph edges={data?.edges?.slice(0, 12)} />
          </Card>

          <Card>
            <h2 className="mb-4 text-heading-sm">Attacker kill chains</h2>
            {!data?.attackers?.length && <p className="py-6 text-center text-body">No attackers in this window.</p>}
            <ul>
              {data?.attackers?.map((a) => (
                <li key={a.ip} className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline py-3 last:border-0">
                  <div>
                    <div className="font-mono text-body-md text-ink">{a.ip}</div>
                    <div className="text-caption-sm text-mute">{a.targets} target(s) reached</div>
                  </div>
                  <div className="overflow-x-auto"><KillChain attacker={a} order={data.stage_order} /></div>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
