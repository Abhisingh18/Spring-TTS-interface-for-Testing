"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { branding, splitWordmark } from "@/config/branding";

const LINKS: Array<{ id: string; label: string }> = [
  { id: "how-it-works", label: "How it works" },
  { id: "capabilities", label: "Capabilities" },
  { id: "analytics", label: "Analytics" },
  { id: "faq", label: "FAQ" },
];

const [wordmarkHead, wordmarkTail] = splitWordmark(branding.name);

/**
 * Landing navigation. Three zones — wordmark, links, actions — with the links
 * centred against the bar itself rather than against whatever is left over, so
 * they stay put as the wordmark and buttons change width.
 *
 * The studio chrome (pair strip, transport, shortcuts) is hidden on this route;
 * this is the only navigation the front door needs.
 */
export function LandingNav({ studioHref }: { studioHref: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll spy: the section occupying the upper half of the viewport wins.
  useEffect(() => {
    const sections = LINKS.map((link) => document.getElementById(link.id)).filter(
      (node): node is HTMLElement => node !== null,
    );
    if (sections.length === 0 || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: 0 },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Close the mobile sheet on Escape or on a click outside it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  return (
    <header
      ref={menuRef}
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled || menuOpen
          ? "border-b border-line bg-bg/85 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="relative mx-auto flex h-[4.5rem] w-full max-w-[76rem] items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span
            className="grid h-8 w-8 place-items-center rounded-[0.6rem] text-[15px] font-bold text-white"
            style={{ background: "linear-gradient(140deg, var(--primary-from), var(--primary-to))" }}
          >
            {branding.shortName.slice(0, 1)}
          </span>
          <span className="hidden text-[17px] font-semibold tracking-tight text-ink sm:block">
            {wordmarkHead} <span className="font-normal text-muted">{wordmarkTail}</span>
          </span>
        </Link>

        {/* Centred against the bar, not against the remaining space. */}
        <nav
          aria-label="Landing sections"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex"
        >
          {LINKS.map((link) => {
            const isActive = active === link.id;
            return (
              <a
                key={link.id}
                href={`#${link.id}`}
                aria-current={isActive ? "true" : undefined}
                className={`relative rounded-lg px-3 py-2 text-[15px] transition-colors ${
                  isActive ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full transition-all duration-300"
                  style={{
                    background: "var(--primary-to)",
                    opacity: isActive ? 1 : 0,
                    transform: `scaleX(${isActive ? 1 : 0.3})`,
                  }}
                />
              </a>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/data"
            className="hidden rounded-lg px-3 py-2 text-[15px] text-muted transition-colors hover:text-ink sm:block"
          >
            Docs
          </Link>
          <Link
            href={studioHref}
            className="rounded-full px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--primary-to)" }}
          >
            Open studio
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-controls="landing-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="grid h-10 w-10 place-items-center rounded-lg border border-line text-muted transition-colors hover:text-ink md:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              {menuOpen ? (
                <path d="m3.5 3.5 9 9m0-9-9 9" strokeLinecap="round" />
              ) : (
                <path d="M2 4.5h12M2 8h12M2 11.5h12" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      <div
        id="landing-menu"
        hidden={!menuOpen}
        className="border-t border-line px-5 pb-4 pt-2 sm:px-8 md:hidden"
      >
        <nav aria-label="Landing sections" className="flex flex-col">
          {LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={() => setMenuOpen(false)}
              className={`rounded-lg px-3 py-2.5 text-[15px] transition-colors ${
                active === link.id ? "bg-sunken text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/data"
            onClick={() => setMenuOpen(false)}
            className="rounded-lg px-3 py-2.5 text-[15px] text-muted transition-colors hover:text-ink"
          >
            Docs
          </Link>
        </nav>
      </div>
    </header>
  );
}
