"use client";

import { useEffect, useRef } from "react";

type Variant = "strong" | "faint";

type Point = { x: number; y: number; t: number };

type SketchTrailProps = {
  variant?: Variant;
  ring?: boolean;
  fallback?: boolean;
  className?: string;
};

/**
 * Graphite trail. Stamps velocity-sensitive dabs straight onto a section-sized
 * canvas, then lifts the whole layer with incremental destination-out fills
 * when the pointer leaves the section.
 */
export function SketchTrail({
  variant = "strong",
  ring = false,
  fallback = true,
  className = "",
}: SketchTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const host = canvas.closest<HTMLElement>("section, .trail-host");
    if (!host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (reduced || !fine) return;

    const ringEl = ringRef.current;
    if (ring) host.dataset.brush = "true";

    let width = 0;
    let height = 0;
    let ink =
      getComputedStyle(host).getPropertyValue("--ink").trim() || "#26262b";
    let raf: number | null = null;
    let erasing = false;
    let eraseStarted = 0;
    let last: Point | null = null;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
    };

    const stamp = (
      x: number,
      y: number,
      angle: number,
      speed: number,
    ) => {
      const faint = variant === "faint";
      const pressure = faint ? 0.55 : Math.max(0.35, 1 - speed * 0.32);
      const radius = (faint ? 0.6 : 1.05) + pressure * (faint ? 0.9 : 1.8);
      const alpha = (faint ? 0.02 : 0.048) + pressure * (faint ? 0.018 : 0.05);

      // Paper tooth: drop a few dabs so strokes break up like graphite.
      const tooth =
        Math.sin(x * 0.31 + y * 0.47 + 12.9898) * 0.5 +
        Math.sin(x * 0.11 - y * 0.19) * 0.5;
      if (tooth > 0.9) return;

      ctx.fillStyle = ink;
      ctx.globalAlpha = alpha;
      const pieces = faint ? 1 : 3;
      for (let i = 0; i < pieces; i += 1) {
        const ox = (Math.random() - 0.5) * radius * 1.1;
        const oy = (Math.random() - 0.5) * radius * 1.1;
        ctx.beginPath();
        ctx.ellipse(
          x + ox,
          y + oy,
          radius * (1 + Math.random() * 0.28),
          radius * (0.68 + Math.random() * 0.34),
          angle + (Math.random() - 0.5) * 0.18,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const drawTo = (x: number, y: number, t: number) => {
      if (!last) {
        last = { x, y, t };
        stamp(x, y, 0, 0.4);
        return;
      }
      const dx = x - last.x;
      const dy = y - last.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 0.4) return;
      const dt = Math.max(1, t - last.t);
      const speed = Math.min(2.8, distance / dt);
      const step = variant === "faint" ? 3.5 : 1.3;
      const count = Math.min(280, Math.max(1, Math.ceil(distance / step)));
      const angle = Math.atan2(dy, dx) + Math.PI / 2;

      for (let i = 1; i <= count; i += 1) {
        const p = i / count;
        stamp(last.x + dx * p, last.y + dy * p, angle, speed);
      }
      last = { x, y, t };
    };

    const tick = (now: number) => {
      raf = null;
      if (!erasing) return;

      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "#000";
      ctx.globalAlpha = variant === "faint" ? 0.1 : 0.075;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      if (now - eraseStarted < (variant === "faint" ? 720 : 980)) {
        raf = window.requestAnimationFrame(tick);
      } else {
        erasing = false;
        ctx.clearRect(0, 0, width, height);
      }
    };

    const startErase = () => {
      if (erasing) return;
      erasing = true;
      eraseStarted = performance.now();
      if (raf === null) raf = window.requestAnimationFrame(tick);
    };

    const hideRing = () => {
      if (ringEl) {
        ringEl.style.opacity = "0";
        ringEl.classList.remove("down");
      }
    };

    const onEnter = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      erasing = false;
      last = null;
      if (ringEl && ring) ringEl.style.opacity = "1";
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = host.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

      erasing = false;
      const samples =
        typeof event.getCoalescedEvents === "function"
          ? event.getCoalescedEvents()
          : [];
      if (samples.length > 0) {
        for (const sample of samples) {
          drawTo(
            sample.clientX - rect.left,
            sample.clientY - rect.top,
            sample.timeStamp || performance.now(),
          );
        }
      } else {
        drawTo(x, y, event.timeStamp || performance.now());
      }

      if (ringEl && ring) {
        ringEl.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        ringEl.style.opacity = "1";
      }
    };

    const onLeave = () => {
      last = null;
      hideRing();
      startErase();
    };

    const onDown = () => {
      if (ringEl) ringEl.classList.add("down");
    };

    const onUp = () => {
      if (ringEl) ringEl.classList.remove("down");
    };

    const onVisibility = () => {
      if (document.hidden) startErase();
    };

    const onTheme = () => {
      ink =
        getComputedStyle(host).getPropertyValue("--ink").trim() || ink;
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const intersection = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) {
          hideRing();
          startErase();
        }
      },
      { threshold: 0.08 },
    );
    intersection.observe(host);

    const themeObserver = new MutationObserver(onTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    host.addEventListener("pointerenter", onEnter, { passive: true });
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave, { passive: true });
    host.addEventListener("pointerdown", onDown, { passive: true });
    host.addEventListener("pointerup", onUp, { passive: true });
    host.addEventListener("pointercancel", onLeave, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      resizeObserver.disconnect();
      intersection.disconnect();
      themeObserver.disconnect();
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      if (raf !== null) window.cancelAnimationFrame(raf);
      delete host.dataset.brush;
      ctx.clearRect(0, 0, width, height);
    };
  }, [ring, variant]);

  return (
    <>
      <div className={`trail ${className}`.trim()} aria-hidden="true">
        <canvas ref={canvasRef} />
        {fallback ? (
          <svg
            className="trail-fallback"
            viewBox="0 0 600 180"
            preserveAspectRatio="xMidYMid meet"
            focusable="false"
          >
            <path d="M28 132c26-58 47-96 72-93 26 3 10 58 34 79 22 19 43-13 56-44 15-36 32-48 47-39 16 10 3 45 21 60 17 14 36-8 48-31 13-25 29-36 42-28 14 8 10 36 25 48 14 11 31 1 49-17 15-15 31-18 43-10" />
          </svg>
        ) : null}
      </div>
      {ring ? (
        <div ref={ringRef} className="brush-ring" aria-hidden="true" />
      ) : null}
    </>
  );
}
