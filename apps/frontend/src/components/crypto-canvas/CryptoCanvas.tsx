"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Gauge,
  Layers3,
  LineChart,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type {
  ComparisonRow,
  CryptoUIBlockUnion,
  DemoEvent,
  DemoProject,
  MarketChartPoint,
  RiskPanelData,
  SignalItem,
  SummaryCard,
  Trend,
} from "@/lib/crypto/types";

function trendClasses(trend: Trend) {
  if (trend === "positive") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (trend === "negative") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-border bg-muted text-muted-foreground";
}

function Card({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-start gap-3 border-b border-border px-4 py-3">
        <div className="mt-0.5 rounded-md border border-border bg-muted p-2 text-foreground">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function SummaryCards({ items }: { items: SummaryCard[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${trendClasses(item.trend)}`}>
              {item.trend}
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-normal">{item.value}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
        </div>
      ))}
    </div>
  );
}

function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  return (
    <div className="overflow-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Asset</th>
            <th className="py-2 pr-4 font-medium">Price</th>
            <th className="py-2 pr-4 font-medium">24h</th>
            <th className="py-2 pr-4 font-medium">Volume</th>
            <th className="py-2 pr-4 font-medium">Risk</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.symbol} className="border-b border-border/70 last:border-0">
              <td className="py-3 pr-4">
                <p className="font-semibold">{row.symbol}</p>
                <p className="text-xs text-muted-foreground">{row.asset}</p>
              </td>
              <td className="py-3 pr-4 font-mono">${row.priceUsd.toLocaleString()}</td>
              <td className={`py-3 pr-4 font-mono ${row.change24hPct >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {row.change24hPct >= 0 ? "+" : ""}{row.change24hPct}%
              </td>
              <td className="py-3 pr-4 font-mono">${(row.volume24hUsd / 1_000_000).toFixed(1)}M</td>
              <td className="py-3 pr-4">{row.riskLevel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarketChart({ points }: { points: MarketChartPoint[] }) {
  return (
    <div className="grid gap-2">
      {points.map((point) => (
        <div key={`${point.asset}-${point.date}`} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm">
          <span className="text-muted-foreground">{point.date}</span>
          <span className="font-medium">{point.asset}</span>
          <span className="font-mono">${point.priceUsd.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function RiskPanel({ panel }: { panel: RiskPanelData }) {
  return (
    <div className="grid gap-4 md:grid-cols-[160px_1fr]">
      <div className="rounded-lg border border-border bg-background p-4 text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Risk score</p>
        <p className="mt-2 text-4xl font-semibold">{panel.score}</p>
        <p className="mt-1 text-sm font-medium capitalize">{panel.riskLevel}</p>
      </div>
      <div className="grid gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Drivers</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {panel.reasons.map((reason, index) => (
              <span key={`${reason}-${index}`} className="rounded-full border border-border bg-background px-3 py-1 text-xs">
                {reason}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checks</p>
          <ul className="mt-2 grid gap-1.5 text-sm text-muted-foreground">
            {panel.mitigations.map((item, index) => (
              <li key={`${item}-${index}`} className="flex gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ProjectProfile({ project }: { project: DemoProject }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold">{project.name}</p>
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
          {project.category}
        </span>
      </div>
      <p className="mt-2 leading-relaxed text-muted-foreground">{project.description}</p>
    </div>
  );
}

function Timeline({ events }: { events: DemoEvent[] }) {
  return (
    <ul className="grid gap-3 text-sm">
      {events.map((event) => (
        <li key={event.id} className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden />
            {event.date}
            <span className="ml-auto capitalize">{event.impact} impact</span>
          </div>
          <p className="mt-2 font-semibold">{event.title}</p>
          <p className="mt-1 text-muted-foreground">{event.description}</p>
        </li>
      ))}
    </ul>
  );
}

function ProjectsTable({ rows }: { rows: DemoProject[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((project) => (
        <div key={project.id} className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">{project.name}</p>
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
              {project.riskLevel}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{project.category} · {project.maturity}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{project.description}</p>
        </div>
      ))}
    </div>
  );
}

function Signals({ rows }: { rows: SignalItem[] }) {
  return (
    <ul className="grid gap-2 text-sm">
      {rows.map((signal, index) => (
        <li key={`${signal.label}-${signal.sentiment}-${index}`} className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center gap-2">
            {signal.sentiment === "positive" ? (
              <TrendingUp className="size-4 text-emerald-700" aria-hidden />
            ) : signal.sentiment === "negative" ? (
              <TrendingDown className="size-4 text-rose-700" aria-hidden />
            ) : (
              <Activity className="size-4 text-muted-foreground" aria-hidden />
            )}
            <p className="font-semibold">{signal.label}</p>
            <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] uppercase ${trendClasses(signal.sentiment)}`}>
              {signal.sentiment}
            </span>
          </div>
          <p className="mt-2 leading-relaxed text-muted-foreground">{signal.description}</p>
        </li>
      ))}
    </ul>
  );
}

export function CryptoCanvas({ blocks }: { blocks: CryptoUIBlockUnion[] }) {
  const sorted = [...blocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return (
    <div className="grid gap-4">
      {sorted.map((block) => {
        const title = block.title ?? block.type.replaceAll("_", " ");
        if (block.type === "summary_cards") {
          return <Card key={block.id} title={title} description={block.description} icon={<LineChart className="size-4" aria-hidden />}><SummaryCards items={block.data} /></Card>;
        }
        if (block.type === "comparison_table") {
          return <Card key={block.id} title={title} description={block.description} icon={<BarChart3 className="size-4" aria-hidden />}><ComparisonTable rows={block.data} /></Card>;
        }
        if (block.type === "market_chart") {
          return <Card key={block.id} title={title} description={block.description} icon={<Activity className="size-4" aria-hidden />}><MarketChart points={block.data} /></Card>;
        }
        if (block.type === "risk_panel") {
          return <Card key={block.id} title={title} description={block.description} icon={<Gauge className="size-4" aria-hidden />}><RiskPanel panel={block.data} /></Card>;
        }
        if (block.type === "project_profile") {
          return <Card key={block.id} title={title} description={block.description} icon={<Layers3 className="size-4" aria-hidden />}><ProjectProfile project={block.data} /></Card>;
        }
        if (block.type === "timeline") {
          return <Card key={block.id} title={title} description={block.description} icon={<CalendarDays className="size-4" aria-hidden />}><Timeline events={block.data} /></Card>;
        }
        if (block.type === "projects_table") {
          return <Card key={block.id} title={title} description={block.description} icon={<Layers3 className="size-4" aria-hidden />}><ProjectsTable rows={block.data} /></Card>;
        }
        if (block.type === "signal_list") {
          return <Card key={block.id} title={title} description={block.description} icon={<AlertTriangle className="size-4" aria-hidden />}><Signals rows={block.data} /></Card>;
        }
        return null;
      })}
    </div>
  );
}
