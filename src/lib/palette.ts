/**
 * One colour per model family, so a model keeps its identity across every view:
 * pair page, legend, blind-test reveal and the results tables.
 *
 * The values live in globals.css as custom properties, because light and dark
 * need genuinely different steps rather than one palette flipped — see the
 * comments there for the validation each set passed.
 *
 * Variants inside a family (zeroshot / AR / AR+EN+FR) deliberately share a
 * colour. Splitting them into near-identical shades would sit far below the
 * colourblind-separation floor while adding nothing: the card, the row and the
 * legend all spell the variant out in words.
 */

const FAMILY_VARIABLE: Record<string, string> = {
  YourTTS: "--m-yourtts",
  SeedVC: "--m-seedvc",
  "EZ-VC": "--m-ezvc",
  Vec2Wav: "--m-vec2wav",
  "Diff-HierVC": "--m-diffhiervc",
  "kNN-VC": "--m-knnvc",
};

const ORDERED_VARIABLES = [
  "--m-yourtts",
  "--m-seedvc",
  "--m-ezvc",
  "--m-vec2wav",
  "--m-diffhiervc",
  "--m-knnvc",
];

/** The custom-property name for a family, for callers that resolve it manually. */
export function accentVariable(family: string, order = 0): string {
  return (
    FAMILY_VARIABLE[family] ??
    ORDERED_VARIABLES[order % ORDERED_VARIABLES.length] ??
    "--accent"
  );
}

/** A CSS colour value usable anywhere a colour is expected. */
export function accentFor(family: string, order = 0): string {
  return `var(${accentVariable(family, order)})`;
}

export const REFERENCE_ACCENT = {
  source: "var(--m-source)",
  target: "var(--m-target)",
} as const;
