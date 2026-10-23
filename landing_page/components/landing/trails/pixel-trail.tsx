"use client";

import { useEffect, useRef } from "react";

const CELL = 16;

/* DawnBringer 32, trimmed to the colours that read as strokes on both
   light and dark paper. The full palette is shown in the studio. */
const STROKES = [
  "#8f563b",
  "#df7126",
  "#37946e",
  "#3f3f74",
  "#306082",
  "#5b6ee1",
  "#ac3232",
  "#d95763",
  "#76428a",
  "#8a6f30",
  "#45283c",
  "#99e550",
];

type Cell = { x: number; y: number; color: string };

export function PixelTrail({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coordRef = useRef<HTMLSpanElement>(null);
  const colorRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const host = canvas.closest<HTMLElement>("section, .trail-host");
    if (!host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let width = 0;
    let height = 0;
    let columns = 0;
    let rows = 0;
    let raf: number | null = null;
    let dissolving = false;
    let dissolveStarted = 0;
    let lastCell: { x: number; y: number } | null = null;
    let strokeColor = STROKES[0];
    let colorStep = 0;
    const cells = new Map<string, Cell>();

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      columns = Math.ceil(width / CELL);
      rows = Math.ceil(height / CELL);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      cells.clear();
    };

    const setHud = (cell: { x: number; y: number } | null) => {
      if (coordRef.current) {
        coordRef.current.textContent = cell
          ? `X ${String(cell.x * CELL).padStart(3, "0")} · Y ${String(cell.y * CELL).padStart(3, "0")}`
          : "X --- · Y ---";
      }
    };

    const pickColor = () => {
      strokeColor = STROKES[colorStep % STROKES.length];
      colorStep += 5;
      if (colorRef.current) {
        colorRef.current.textContent = strokeColor.toUpperCase();
      }
    };

    const paint = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= columns || y >= rows) return;
      const key = `${x},${y}`;
      const highlight = (x * 7 + y * 11) % 23 === 0;
      const color = highlight
        ? STROKES[(colorStep + 6) % STROKES.length]
        : strokeColor;
      cells.set(key, { x, y, color });
      ctx.fillStyle = color;
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    };

    // Bresenham keeps fast cursor moves from leaving gaps in the grid.
    const paintLine = (
      from: { x: number; y: number },
      to: { x: number; y: number },
    ) => {
      let x0 = from.x;
      let y0 = from.y;
      const x1 = to.x;
      const y1 = to.y;
      const dx = Math.abs(x1 - x0);
      const dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      let guard = 0;

      for (;;) {
        paint(x0, y0);
        guard += 1;
        if ((x0 === x1 && y0 === y1) || guard > 220) break;
        const e2 = 2 * err;
        if (e2 >= dy) {
          err += dy;
          x0 += sx;
        }
        if (e2 <= dx) {
          err += dx;
          y0 += sy;
        }
      }
    };

    const clearPixels = () => {
      if (raf !== null) {
        window.cancelAnimationFrame(raf);
        raf = null;
      }
      dissolving = false;
      cells.clear();
      ctx.clearRect(0, 0, width, height);
    };

    const tick = (now: number) => {
      raf = null;
      if (!dissolving) return;
      const elapsed = now - dissolveStarted;
      const span = Math.max(1, columns + rows);

      ctx.clearRect(0, 0, width, height);
      let alive = false;

      for (const cell of cells.values()) {
        const wave = ((cell.x + cell.y) / span) * 280;
        const jitter = (cell.x * 17 + cell.y * 29) % 130;
        const local = Math.min(1, Math.max(0, (elapsed - wave - jitter) / 220));
        if (local >= 1) continue;

        alive = true;
        const size = CELL * (1 - local * 0.72);
        const inset = (CELL - size) / 2;
        ctx.globalAlpha = 1 - local * 0.9;
        ctx.fillStyle = cell.color;
        ctx.fillRect(
          cell.x * CELL + inset,
          cell.y * CELL + inset,
          size,
          size,
        );
      }

      ctx.globalAlpha = 1;

      if (alive || elapsed < 720) {
        raf = window.requestAnimationFrame(tick);
      } else {
        dissolving = false;
        cells.clear();
      }
    };

    const startDissolve = () => {
      if (dissolving || cells.size === 0) return;
      dissolving = true;
      dissolveStarted = performance.now();
      if (raf === null) raf = window.requestAnimationFrame(tick);
    };

    const onEnter = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      clearPixels();
      pickColor();
      lastCell = null;
      setHud(null);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (dissolving) clearPixels();

      const rect = host.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

      const cell = {
        x: Math.floor(x / CELL),
        y: Math.floor(y / CELL),
      };

      if (lastCell && lastCell.x === cell.x && lastCell.y === cell.y) {
        return;
      }

      if (lastCell) {
        paintLine(lastCell, cell);
      } else {
        paint(cell.x, cell.y);
      }

      lastCell = cell;
      setHud(cell);
    };

    const onLeave = () => {
      lastCell = null;
      startDissolve();
    };

    const onVisibility = () => {
      if (document.hidden) startDissolve();
    };

    resize();
    pickColor();
    setHud(null);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const intersection = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) startDissolve();
      },
      { threshold: 0.08 },
    );
    intersection.observe(host);

    host.addEventListener("pointerenter", onEnter, { passive: true });
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave, { passive: true });
    host.addEventListener("pointercancel", onLeave, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      resizeObserver.disconnect();
      intersection.disconnect();
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointercancel", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      if (raf !== null) window.cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, width, height);
    };
  }, []);

  return (
    <div className={`trail ${className}`.trim()} aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="pixel-hud">
        <span ref={coordRef}>X --- · Y ---</span>
        <span>
          <b ref={colorRef}>#------</b>
        </span>
        <span>FRAME 02</span>
      </div>
    </div>
  );
}
