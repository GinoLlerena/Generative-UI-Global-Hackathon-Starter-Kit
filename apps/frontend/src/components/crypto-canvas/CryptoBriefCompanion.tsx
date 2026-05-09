"use client";

import {
  Activity,
  BarChart3,
  Brain,
  CheckCircle2,
  Database,
  FileJson,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { getCompanionReasoning } from "@/lib/crypto/brief";
import type { CryptoProcessSummary, CryptoProcessStep } from "@/lib/crypto/brief";
import type { CryptoBriefResponse } from "@/lib/crypto/types";

function stepIcon(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("thinking")) return <Brain className="size-3.5" aria-hidden />;
  if (normalized.includes("data")) return <Database className="size-3.5" aria-hidden />;
  if (normalized.includes("processing")) return <Sparkles className="size-3.5" aria-hidden />;
  return <Activity className="size-3.5" aria-hidden />;
}

function ProcessStepRow({ step }: { step: CryptoProcessStep }) {
  const active = step.status === "active";
  const pending = step.status === "pending";
  return (
    <li className="grid grid-cols-[24px_1fr] gap-2">
      <span
        className={[
          "mt-0.5 flex size-5 items-center justify-center rounded-full border",
          active
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : pending
              ? "border-border bg-muted text-muted-foreground"
              : "border-emerald-200 bg-emerald-50 text-emerald-700",
        ].join(" ")}
      >
        {step.status === "complete" ? (
          <CheckCircle2 className="size-3.5" aria-hidden />
        ) : (
          stepIcon(step.label)
        )}
      </span>
      <span>
        <span className="flex items-center gap-2 font-medium text-foreground">
          {step.label}
          {active ? (
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 motion-safe:animate-pulse" />
          ) : null}
        </span>
        <span className="block text-muted-foreground">{step.detail}</span>
      </span>
    </li>
  );
}

export function CryptoProcessPanel({
  process,
  summary,
}: {
  process: CryptoProcessSummary;
  summary?: {
    intent: string;
    answer: string;
    blockCount: number;
  };
}) {
  const steps = Array.isArray(process.steps) ? process.steps : [];
  const toolName = process.toolName ?? "crypto_tool";
  const summaryIntent = summary?.intent ?? "crypto_result";
  const summaryAnswer = summary?.answer ?? process.resultLabel ?? "Crypto result prepared.";
  const summaryBlockCount = summary?.blockCount ?? 0;

  return (
    <div className="my-2 grid gap-2 rounded-lg border border-border bg-card p-3 text-sm shadow-sm">
      <div className="flex items-center gap-2">
        <Database className="size-3.5 text-foreground" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Process tool
        </p>
        <span className="ml-auto rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          {toolName}
        </span>
      </div>
      <ol className="grid gap-2 text-xs">
        {steps.map((step) => (
          <ProcessStepRow key={step.label} step={step} />
        ))}
      </ol>
      {summary ? (
        <div className="grid gap-2 rounded-md border border-border bg-background p-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-3.5 text-foreground" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Result
            </span>
            <span className="ml-auto rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
              {summaryIntent.replaceAll("_", " ")}
            </span>
          </div>
          <p className="text-sm text-foreground">{summaryAnswer}</p>
          <p className="text-xs text-muted-foreground">
            {summaryBlockCount} canvas block{summaryBlockCount === 1 ? "" : "s"} generated
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function CryptoBriefCompanion({
  brief,
  process,
  compact = false,
  showProcess = true,
}: {
  brief: CryptoBriefResponse;
  process?: CryptoProcessSummary | null;
  compact?: boolean;
  showProcess?: boolean;
}) {
  const reasoning = getCompanionReasoning(brief);
  const primaryBlocks = (brief.uiBlocks ?? []).slice(0, 3);
  const resultPreview =
    process?.rawResult === undefined
      ? ""
      : JSON.stringify(process.rawResult, null, 2);

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-border bg-card text-sm shadow-sm">
      <div className="border-b border-border bg-muted/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-foreground" aria-hidden />
          <p className="font-semibold text-foreground">Companion result</p>
          <span className="ml-auto rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
            {brief.intent.replaceAll("_", " ")}
          </span>
        </div>
        <p className="mt-2 leading-relaxed text-foreground">{brief.answer}</p>
      </div>

      <div className="grid gap-3 p-4">
        {showProcess && process ? <CryptoProcessPanel process={process} /> : null}

        <div className="grid gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Activity className="size-3.5" aria-hidden />
            Reasoning summary
          </div>
          <ol className="grid gap-1.5 text-xs text-muted-foreground">
            {reasoning.map((item, index) => (
              <li key={item} className="flex gap-2">
                <span className="font-mono text-foreground">{index + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>

        {!compact ? (
          <div className="grid gap-2 border-t border-border pt-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ShieldAlert className="size-3.5" aria-hidden />
              Canvas blocks
            </div>
            <div className="grid gap-2">
              {primaryBlocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2"
                >
                  <span className="font-medium text-foreground">
                    {block.title ?? block.type}
                  </span>
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">
                    {block.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {showProcess && process && !compact ? (
          <details className="rounded-lg border border-border bg-background px-3 py-2">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <FileJson className="size-3.5" aria-hidden />
              Result payload
              <span className="ml-auto normal-case tracking-normal">{process.resultLabel}</span>
            </summary>
            <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-muted p-3 font-mono text-[11px] leading-relaxed text-foreground">
              {resultPreview}
            </pre>
          </details>
        ) : null}

        <p className="border-t border-border pt-3 text-xs text-amber-700">
          {brief.disclaimer}
        </p>
      </div>
    </div>
  );
}
