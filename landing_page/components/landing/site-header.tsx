"use client";

import { useEffect, useRef, useState } from "react";
import { Wordmark } from "./wordmark";

const LINKS = [
  { href: "#sketch", label: "Sketch" },
  { href: "#pixel", label: "Pixel" },
  { href: "#inside", label: "Inside" },
  { href: "#shortcuts", label: "Shortcuts" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const barRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let ticking = false;

    const update = () => {
      ticking = false;
      const max = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const progress = Math.min(1, Math.max(0, window.scrollY / max));
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${progress})`;
      }
      if (barRef.current) {
        barRef.current.dataset.scrolled =
          window.scrollY > 6 ? "true" : "false";
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const toggleTheme = () => {
    const root = document.documentElement;
    const isDark = root.dataset.theme
      ? root.dataset.theme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = !isDark;
    root.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("gp-theme", next ? "dark" : "light");
    } catch {
      /* private mode — theme still applies for this visit */
    }
  };

  return (
    <header
      ref={barRef}
      className="site-header"
      data-scrolled="false"
      aria-label="Site header"
    >
      <a className="brand-link" href="#top" aria-label="GraphitePad home">
        <Wordmark />
      </a>

      <nav className="main-nav" aria-label="Primary">
        {LINKS.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>

      <div className="header-actions">
        <button
          type="button"
          className="theme-btn"
          onClick={toggleTheme}
          aria-label="Toggle light and dark theme"
          title="Toggle light and dark theme"
        >
          <span aria-hidden="true">◐</span>
        </button>
        <a className="btn primary small" href="#studios">
          Try the studios
        </a>
        <button
          type="button"
          className="menu-btn"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </div>

      <div
        id="mobile-menu"
        className={`mobile-menu${menuOpen ? " open" : ""}`}
      >
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={() => setMenuOpen(false)}
          >
            {link.label}
          </a>
        ))}
        <a href="#studios" onClick={() => setMenuOpen(false)}>
          Try the studios
        </a>
        <a href="#download" onClick={() => setMenuOpen(false)}>
          Download
        </a>
      </div>

      <div className="progress" aria-hidden="true">
        <span ref={progressRef} />
      </div>
    </header>
  );
}
