/**
 * Every product name, tagline and legal string the UI renders comes from here,
 * so a lab can rebrand the deployment without touching components.
 * Override any field with the matching NEXT_PUBLIC_BRAND_* environment variable.
 */
export interface Branding {
  /** Full product name, used in the document title and the footer. */
  name: string;
  /** Short form for tight spaces and the favicon-adjacent lockup. */
  shortName: string;
  /** One line under the wordmark. */
  tagline: string;
  /** One sentence for metadata and the hero subhead fallback. */
  description: string;
  organization: string;
  docsUrl: string;
  supportEmail: string;
}

export const branding: Branding = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "Speech Evaluation Studio",
  shortName: process.env.NEXT_PUBLIC_BRAND_SHORT_NAME ?? "SES",
  tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE ?? "Speech Research Infrastructure",
  description:
    process.env.NEXT_PUBLIC_BRAND_DESCRIPTION ??
    "Design listening studies, run human and automatic evaluation, and trace every result back to the exact model version that produced it.",
  organization: process.env.NEXT_PUBLIC_BRAND_ORG ?? "Spring Lab",
  docsUrl: process.env.NEXT_PUBLIC_BRAND_DOCS_URL ?? "/docs",
  supportEmail: process.env.NEXT_PUBLIC_BRAND_SUPPORT_EMAIL ?? "",
};

/** `Speech Evaluation Studio` → `Speech Evaluation` + `Studio` for the lockup. */
export function splitWordmark(name: string): [string, string] {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return [name, ""];
  return [parts.slice(0, -1).join(" "), parts[parts.length - 1] ?? ""];
}
