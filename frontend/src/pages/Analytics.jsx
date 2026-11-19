import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Card from "../components/common/Card";
import Segmented from "../components/common/Segmented";
import Spinner from "../components/common/Spinner";
import TrendChart from "../components/charts/TrendChart";
import PageHeader from "../components/layout/PageHeader";
import * as analyticsApi from "../api/analyticsApi";

const PERIODS = ["7d", "14d", "30d"];
const METRICS = [
  { value: "alert_volume", label: "Alerts" },
  { value: "event_volume", label: "Events" },
];

export default function Analytics() {
  const [period, setPeriod] = useState("7d");
  const [metric, setMetric] = useState("alert_volume");
  const { data, isLoading } = useQuery({
    queryKey: ["trends", period, metric],
    queryFn: () => analyticsApi.getTrends({ period, metric }),
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Analytics">Volume over time, so past and current activity sit on one screen.</PageHeader>
      <div className="flex flex-wrap gap-2">
        <Segmented label="Metric" value={metric} onChange={setMetric} options={METRICS} />
        <Segmented label="Period" value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ value: p, label: p }))} />
      </div>
      <Card>
        {isLoading ? <Spinner /> : (
          <>
            <p className="mb-6 text-body-sm text-body">
              Trend: <span className="text-ink">{data?.trend}</span> ({data?.change_percent}% first to last day)
            </p>
            <TrendChart points={data?.data_points} />
          </>
        )}
      </Card>
    </div>
  );
}
