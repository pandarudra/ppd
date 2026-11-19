import { useQuery } from "@tanstack/react-query";
import Card from "../components/common/Card";
import Spinner from "../components/common/Spinner";
import DataTable from "../components/common/DataTable";
import ModelMetricsBar from "../components/charts/ModelMetricsBar";
import PageHeader from "../components/layout/PageHeader";
import * as analyticsApi from "../api/analyticsApi";
import { formatPercent } from "../utils/formatters";

const pct = (k) => (row) => formatPercent(row[k]);
const COLUMNS = [
  { key: "name", label: "Model" },
  { key: "accuracy", label: "Accuracy", render: pct("accuracy") },
  { key: "precision", label: "Precision", render: pct("precision") },
  { key: "recall", label: "Recall", render: pct("recall") },
  { key: "f1_score", label: "F1", render: pct("f1_score") },
  { key: "auc_roc", label: "AUC-ROC", render: pct("auc_roc") },
  { key: "dataset", label: "Dataset" },
  { key: "trained_at", label: "Trained", render: (r) => r.trained_at?.slice(0, 10) },
];

export default function ModelPerformance() {
  const { data, isLoading } = useQuery({ queryKey: ["models"], queryFn: analyticsApi.getModels });
  const models = data?.models || {};
  const rows = Object.entries(models).map(([name, m]) => ({ id: name, name: name.replaceAll("_", " "), ...m }));

  return (
    <div className="space-y-8">
      <PageHeader title="Model performance">Metrics for the detection ensemble from its last training run.</PageHeader>
      {isLoading ? <Spinner /> : (
        <>
          <Card><ModelMetricsBar models={models} /></Card>
          <DataTable columns={COLUMNS} rows={rows} emptyMessage="No model metrics available. Is the ML service running and trained?" />
        </>
      )}
    </div>
  );
}
