"use client";

/**
 * Catches failures from the root layout too — most likely a BUNDLE_DIR that
 * does not point at the extracted listening bundle.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "hsl(226 34% 7%)",
          color: "hsl(210 34% 95%)",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>The listening bundle could not be read</h1>
          <p style={{ color: "hsl(216 16% 70%)", lineHeight: 1.6 }}>
            Check that <code>BUNDLE_DIR</code> in <code>.env.local</code> points at the folder that
            holds <code>listen.html</code> and <code>listening_samples.json</code>, then restart the
            dev server.
          </p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "hsl(225 26% 12%)",
              border: "1px solid hsl(224 20% 22%)",
              borderRadius: 12,
              padding: 12,
              fontSize: 12,
              color: "hsl(216 16% 70%)",
            }}
          >
            {error.message}
          </pre>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 12,
              borderRadius: 10,
              border: "none",
              background: "hsl(243 90% 74%)",
              color: "hsl(226 34% 7%)",
              padding: "10px 16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
