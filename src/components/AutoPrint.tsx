"use client";

import { useEffect } from "react";

/**
 * Opens the print dialog once the report has laid out. Choosing "Save as PDF"
 * there produces the file — which is why the export goes through the browser
 * rather than a PDF library: it is the only path that shapes Arabic, Devanagari
 * and Latin names correctly in one document.
 */
export function AutoPrint() {
  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 600);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="no-print mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-sunken px-4 py-3">
      <p className="min-w-0 flex-1 text-sm text-muted">
        The print dialog opens on its own — pick <strong className="text-ink">Save as PDF</strong>{" "}
        as the destination.
      </p>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
      >
        Open print dialog
      </button>
    </div>
  );
}
