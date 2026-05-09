"use client";

import { forwardRef } from "react";
import type { CopilotChatSuggestionViewProps } from "@copilotkit/react-core/v2";

export const CryptoSuggestionView = forwardRef<
  HTMLDivElement,
  CopilotChatSuggestionViewProps
>(function CryptoSuggestionView({ suggestions, onSelectSuggestion }, ref) {
  if (!Array.isArray(suggestions) || suggestions.length === 0) return null;

  return (
    <div ref={ref} className="mt-3 grid gap-2">
      <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Suggested next steps
      </p>
      <div className="grid gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={`${suggestion.title}-${index}`}
            type="button"
            onClick={() => onSelectSuggestion?.(suggestion, index)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left transition hover:border-foreground/30 hover:bg-muted"
          >
            <p className="text-xs font-medium leading-tight text-foreground">{suggestion.title}</p>
            <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{suggestion.message}</p>
          </button>
        ))}
      </div>
    </div>
  );
});
