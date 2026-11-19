import { Link } from "react-router-dom";
import { Radio, Network, Cpu, Siren, Bot, ShieldAlert, ArrowRight } from "lucide-react";
import WorldMap from "../components/charts/WorldMap";
import Logo from "../components/layout/Logo";
import { DEMO_WORLD as DEMO } from "../utils/demoSources";
import { useAuthStore } from "../stores/authStore";

const FEATURES = [
  { icon: Radio, title: "Live attack map", body: "Every hostile source plotted against your network in real time, with a history view for the past week." },
  { icon: Cpu, title: "Ensemble detection", body: "Isolation Forest, Random Forest and XGBoost vote on each event, so one weak model can't decide alone." },
  { icon: Siren, title: "Correlated alerts", body: "Alerts from the same source within minutes collapse into one group instead of flooding the queue." },
  { icon: Network, title: "Attack paths", body: "Follow an attacker from recon to brute force to access, and see which assets they reached." },
  { icon: Bot, title: "AI SOC assistant", body: "Ask why an alert fired and get an explanation and next steps grounded in your own data." },
  { icon: ShieldAlert, title: "Threat intelligence", body: "Look up any IP, domain or hash against your IOC feed, right inside the incident." },
];

const STEPS = [
  ["Collect", "Syslog over UDP or the HTTP ingest API."],
  ["Detect", "Features extracted, scored by the ensemble."],
  ["Correlate", "Alerts grouped by source and time window."],
  ["Respond", "Incidents, approvals and an audit trail."],
];

export default function Landing() {
  const authed = useAuthStore((s) => s.isAuthenticated);
  const cta = authed ? "/dashboard" : "/login";

  return (
    <div className="min-h-screen bg-canvas">
      <header className="mx-auto flex h-16 max-w-wide items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2" aria-label="Sentinel home">
          <Logo size={26} />
          <span className="text-heading-md">Sentinel</span>
        </Link>
        <Link to={cta} className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-button-md text-on-dark hover:bg-primary-press">
          {authed ? "Open console" : "Sign in"}
        </Link>
      </header>

      <section className="relative mx-auto max-w-wide px-4 pb-8 pt-12 md:px-8 md:pt-20">
        <div className="mx-auto max-w-[760px] text-center animate-rise">
          <span className="eyebrow inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> AI-powered security operations
          </span>
          <h1 className="mt-6 text-[36px] leading-[1.05] md:text-[56px]">
            See every attack. <span className="text-primary">Stop it faster.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-[560px] text-[16px] text-body">
            Sentinel turns raw logs into a live picture of who is attacking, what they hit and what to do next, in one clean console.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={cta} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-[15px] text-on-dark hover:bg-primary-press">
              {authed ? "Open console" : "Sign in"} <ArrowRight size={16} />
            </Link>
            <a href="#how" className="inline-flex h-11 items-center rounded-lg border border-hairline bg-surface px-6 text-[15px] text-ink hover:border-hairline-strong">
              How it works
            </a>
          </div>
        </div>

        <div className="panel relative mt-12 overflow-hidden p-2 md:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(0,117,255,0.12),transparent)]" />
          <WorldMap sources={DEMO} />
          <div className="absolute bottom-3 left-4 flex gap-4 text-caption-sm text-body">
            {[["CRITICAL", "#ff4d4f"], ["HIGH", "#ff8a3d"], ["MEDIUM", "#f5c542"], ["LOW", "#4da3ff"]].map(([l, c]) => (
              <span key={l} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: c }} />{l.toLowerCase()}</span>
            ))}
          </div>
        </div>
        <p className="mt-3 text-center text-caption-sm text-mute">Illustrative traffic. Your console shows your own data.</p>
      </section>

      <section className="mx-auto grid max-w-wide grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4 md:px-8">
        {[["3", "detection models in the ensemble"], ["<1 s", "WebSocket push to the dashboard"], ["UDP + HTTP", "log ingestion paths"], ["24/7", "continuous monitoring"]].map(([n, l]) => (
          <div key={l} className="card p-5">
            <div className="text-display-lg">{n}</div>
            <div className="mt-1 text-body-sm text-body">{l}</div>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-wide px-4 py-12 md:px-8">
        <h2 className="text-display-lg">Everything an analyst reaches for</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card p-6 transition-colors hover:border-hairline-strong">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/15 text-secondary"><Icon size={20} /></div>
              <h3 className="mt-4 text-heading-sm">{title}</h3>
              <p className="mt-1.5 text-body-md text-body">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-wide px-4 py-12 md:px-8">
        <h2 className="text-display-lg">From log line to response</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {STEPS.map(([t, b], i) => (
            <li key={t} className="panel p-6">
              <span className="font-mono text-caption-sm text-primary">0{i + 1}</span>
              <h3 className="mt-2 text-heading-sm">{t}</h3>
              <p className="mt-1.5 text-body-md text-body">{b}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-wide px-4 py-12 md:px-8">
        <div className="rounded-card bg-secondary p-8 text-center md:p-14">
          <h2 className="text-display-lg text-on-dark">Watch your own network light up</h2>
          <p className="mx-auto mt-3 max-w-[480px] text-body-md text-on-dark-mute">Sign in and point your syslog at Sentinel. The first alert shows up in seconds.</p>
          <Link to={cta} className="mt-6 inline-flex h-11 items-center rounded-lg bg-canvas px-6 text-[15px] text-ink">{authed ? "Open console" : "Sign in"}</Link>
        </div>
      </section>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-wide flex-wrap items-center justify-between gap-2 px-4 py-6 text-caption-sm text-mute md:px-8">
          <span className="flex items-center gap-2"><Logo size={16} /> Sentinel</span>
          <span>© 2026 Sentinel. Security operations platform.</span>
        </div>
      </footer>
    </div>
  );
}
