"use client";

import { accentFor } from "@/lib/palette";
import type { ModelInfo } from "@/lib/types";

/**
 * The ten model names drifting past, twice over so the loop has no seam. Purely
 * decorative — the same names are listed, selectable, further down the page.
 */
export function ModelMarquee({ models }: { models: ModelInfo[] }) {
  const lane = [...models, ...models];

  return (
    <div
      className="relative overflow-hidden py-1"
      style={{
        maskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
      }}
      aria-hidden="true"
    >
      <div className="flex w-max gap-2.5 motion-safe:animate-[marquee_38s_linear_infinite]">
        {lane.map((model, index) => (
          <span
            key={`${model.key}-${index}`}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-line bg-panel px-3.5 py-2 text-sm text-muted backdrop-blur"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: accentFor(model.family, model.order) }}
            />
            {model.label}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
