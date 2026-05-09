"use client";

import {
  CheckCircle2,
  Clock3,
  Loader2,
} from "lucide-react";
import type { CryptoProcessStep } from "@/lib/crypto/brief";

function stepState(step: CryptoProcessStep, steps: CryptoProcessStep[], index: number) {
  const firstActive = steps.findIndex((candidate) => candidate.status === "active");
  if (step.status === "complete") return "complete";
  if (step.status === "active") return "active";
  if (firstActive >= 0 && index > firstActive) return "pending";
  return "pending";
}

export function CryptoTaskProgress({
  steps,
}: {
  steps: CryptoProcessStep[];
}) {
  if (!Array.isArray(steps) || steps.length === 0) return null;

  const completed = steps.filter((step) => step.status === "complete").length;
  const progress = Math.round((completed / steps.length) * 100);

  return (
    <div className="my-3 rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Agent progress
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {completed}/{steps.length}
        </p>
      </div>

      <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ul className="grid gap-2">
        {steps.map((step, index) => {
          const state = stepState(step, steps, index);
          return (
            <li
              key={`${step.label}-${index}`}
              className={[
                "rounded-lg border px-3 py-2 text-xs",
                state === "complete"
                  ? "border-emerald-200 bg-emerald-50"
                  : state === "active"
                    ? "border-blue-200 bg-blue-50"
                    : "border-border bg-background",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                {state === "complete" ? (
                  <CheckCircle2 className="size-3.5 text-emerald-700" aria-hidden />
                ) : state === "active" ? (
                  <Loader2 className="size-3.5 animate-spin text-blue-700" aria-hidden />
                ) : (
                  <Clock3 className="size-3.5 text-muted-foreground" aria-hidden />
                )}
                <span className="font-semibold text-foreground">{step.label}</span>
              </div>
              <p className="mt-1 pl-5 text-muted-foreground">{step.detail}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

