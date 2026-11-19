import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MetricCard from "./common/MetricCard";
import { SeverityBadge } from "./common/Badge";
import AlertCard from "./alerts/AlertCard";
import FlowGraph from "./charts/FlowGraph";
import WorldMap from "./charts/WorldMap";
import Landing from "../pages/Landing";

test("MetricCard shows label and value", () => {
  render(<MetricCard label="Open alerts" value={7} />);
  expect(screen.getByText("Open alerts")).toBeInTheDocument();
  expect(screen.getByText("7")).toBeInTheDocument();
});

test("SeverityBadge lowercases the label", () => {
  render(<SeverityBadge severity="CRITICAL" />);
  expect(screen.getByText("critical")).toBeInTheDocument();
});

test("AlertCard shows title and source ip", () => {
  render(<AlertCard alert={{ alert_id: "1", title: "SSH Login Failed Detected", severity: "HIGH", source_ip: "1.2.3.4", created_at: new Date().toISOString() }} />);
  expect(screen.getByText("SSH Login Failed Detected")).toBeInTheDocument();
  expect(screen.getByText("1.2.3.4")).toBeInTheDocument();
});

test("FlowGraph handles empty and populated edges", () => {
  const { rerender } = render(<FlowGraph edges={[]} />);
  expect(screen.getByText(/No attack flows/)).toBeInTheDocument();
  rerender(<FlowGraph edges={[{ source: "1.1.1.1", target: "10.0.0.5", port: 22, count: 3, severity: "HIGH" }]} />);
  expect(screen.getByText("10.0.0.5")).toBeInTheDocument();
});

test("WorldMap plots a located source", () => {
  render(<WorldMap sources={[{ ip: "9.9.9.9", alert_count: 2, severity: "HIGH", geo: { city: "Paris", country: "FR", lat: 48.86, lon: 2.35 } }]} />);
  expect(screen.getByText(/9\.9\.9\.9 · Paris, FR/)).toBeInTheDocument();
});

test("Landing renders the hero", () => {
  render(<MemoryRouter><Landing /></MemoryRouter>);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("See every attack");
});
