"use client";

import { useEffect, useRef, useState } from "react";

const LANGUAGES = [
  { label: "ಕನ್ನಡ", name: "Kannada" },
  { label: "हिन्दी", name: "Hindi" },
  { label: "தமிழ்", name: "Tamil" },
  { label: "తెలుగు", name: "Telugu" },
  { label: "বাংলা", name: "Bengali" },
  { label: "मराठी", name: "Marathi" },
  { label: "ગુજરાતી", name: "Gujarati" },
  { label: "العربية", name: "Arabic" },
  { label: "English", name: "English" },
];

/**
 * Languages arranged around the core, with each spoke drawing itself in when the
 * section arrives. Scripts are rendered in their own writing systems because the
 * platform stores script and direction per sample.
 */
export function LanguageOrbit() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-60px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const radius = 40;

  return (
    <div ref={ref} className="relative mx-auto aspect-square w-full max-w-[34rem]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth="0.3" />
        <circle cx="50" cy="50" r={radius * 0.62} fill="none" stroke="var(--border)" strokeWidth="0.3" />

        {LANGUAGES.map((language, index) => {
          const angle = (index / LANGUAGES.length) * Math.PI * 2 - Math.PI / 2;
          const x = 50 + Math.cos(angle) * radius;
          const y = 50 + Math.sin(angle) * radius;
          return (
            <line
              key={language.name}
              x1="50"
              y1="50"
              x2={x}
              y2={y}
              stroke="var(--accent)"
              strokeWidth="0.35"
              strokeOpacity="0.45"
              strokeDasharray={radius}
              style={{
                // Spokes draw outward from the core, staggered.
                strokeDashoffset: shown ? 0 : radius,
                transition: `stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1) ${index * 90}ms`,
              }}
            />
          );
        })}

        <circle cx="50" cy="50" r="9" fill="var(--accent-soft)" />
        <circle cx="50" cy="50" r="9" fill="none" stroke="var(--accent)" strokeWidth="0.4" />
      </svg>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Speech</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">AI</p>
      </div>

      {LANGUAGES.map((language, index) => {
        const angle = (index / LANGUAGES.length) * Math.PI * 2 - Math.PI / 2;
        const x = 50 + Math.cos(angle) * radius;
        const y = 50 + Math.sin(angle) * radius;
        return (
          <span
            key={language.name}
            dir="auto"
            title={language.name}
            className="panel absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-[13px] font-medium text-ink transition-all duration-700"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              opacity: shown ? 1 : 0,
              transform: `translate(-50%, -50%) scale(${shown ? 1 : 0.8})`,
              transitionDelay: `${300 + index * 90}ms`,
            }}
          >
            {language.label}
          </span>
        );
      })}
    </div>
  );
}
