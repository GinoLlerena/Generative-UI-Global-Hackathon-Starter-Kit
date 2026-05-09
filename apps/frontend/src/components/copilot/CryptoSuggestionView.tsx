"use client";

import { forwardRef } from "react";
import type { CopilotChatSuggestionViewProps } from "@copilotkit/react-core/v2";

export const CryptoSuggestionView = forwardRef<
  HTMLDivElement,
  CopilotChatSuggestionViewProps
>(function CryptoSuggestionView({ suggestions, onSelectSuggestion }, ref) {
  if (!Array.isArray(suggestions) || suggestions.length === 0) return null;

  return (
    <div ref={ref} className="mt-2.5 grid gap-1.5">
      <p className="px-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        Suggested next steps
      </p>
      <div className="grid gap-1.5">
        {suggestions.map((suggestion, index) => (
          <button
            key={`${suggestion.title}-${index}`}
            type="button"
            onClick={() => onSelectSuggestion?.(suggestion, index)}
            className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-left transition hover:border-foreground/30 hover:bg-muted"
          >
            <p className="text-[11px] font-medium leading-tight text-foreground">{suggestion.title}</p>
            <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{suggestion.message}</p>
          </button>
        ))}
      </div>
    </div>
  );
});
