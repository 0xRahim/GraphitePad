import type { ReactNode } from "react";
import { Reveal } from "./reveal";
import { SketchTrail } from "./trails/sketch-trail";

type Feature = {
  title: string;
  copy: string;
  art: ReactNode;
};

const FEATURES: Feature[] = [
  {
    title: "Trackpad first",
    copy: "Ctrl Clutch turns the whole mousepad into a drawing surface. No pen tablet, no button held.",
    art: (
      <svg viewBox="0 0 150 70" aria-hidden="true" focusable="false">
        <rect
          x="38"
          y="12"
          width="74"
          height="46"
          rx="7"
          className="sk-line"
        />
        <rect
          x="52"
          y="34"
          width="46"
          height="16"
          rx="4"
          className="sk-mute sk-dash"
        />
        <path d="M64 43c7-11 15-17 24-19" className="sk-line" />
        <path d="M87 22l5-1-1 5" className="sk-line" />
        <circle cx="64" cy="43" r="1.6" className="sk-fill" />
      </svg>
    ),
  },
  {
    title: "Infinite canvas",
    copy: "Pan, zoom and fit. Paper stock or pixel grid, with no page edge in the way.",
    art: (
      <svg viewBox="0 0 150 70" aria-hidden="true" focusable="false">
        <rect
          x="30"
          y="7"
          width="90"
          height="56"
          rx="4"
          className="sk-mute sk-dash"
        />
        <rect
          x="44"
          y="17"
          width="62"
          height="36"
          rx="2"
          className="sk-line"
        />
        <path d="M44 53l62-36" className="sk-mute sk-dash" />
        <circle cx="75" cy="35" r="2" className="sk-fill" />
        <path d="M48 25v-4h4M102 25v-4h-4" className="sk-mute" />
      </svg>
    ),
  },
  {
    title: "Real guides",
    copy: "One-, two- and three-point perspective, isometric, mirror axes and snapping.",
    art: (
      <svg viewBox="0 0 150 70" aria-hidden="true" focusable="false">
        <path d="M14 56h122" className="sk-line" />
        <path d="M38 56L75 18l37 38" className="sk-mute" />
        <path d="M18 56L75 18l57 38" className="sk-mute sk-dash" />
        <path d="M75 18v38" className="sk-mute" />
        <circle cx="75" cy="18" r="2.6" className="sk-fill" />
        <circle cx="75" cy="56" r="2" className="sk-mute" />
      </svg>
    ),
  },
  {
    title: "Layers, kept simple",
    copy: "Reorder, merge, fade and trace. Vector sketch layers and snapshot pixel layers.",
    art: (
      <svg viewBox="0 0 150 70" aria-hidden="true" focusable="false">
        <rect
          x="48"
          y="26"
          width="54"
          height="32"
          rx="2"
          className="sk-mute"
        />
        <rect
          x="42"
          y="20"
          width="54"
          height="32"
          rx="2"
          className="sk-line"
        />
        <rect
          x="36"
          y="14"
          width="54"
          height="32"
          rx="2"
          className="sk-paper sk-line"
        />
        <path d="M46 24h22M46 30h14" className="sk-mute" />
      </svg>
    ),
  },
  {
    title: "Animation without tabs",
    copy: "A frame strip, onion skin, playback and spritesheet export live beside the canvas.",
    art: (
      <svg viewBox="0 0 150 70" aria-hidden="true" focusable="false">
        <rect
          x="26"
          y="20"
          width="28"
          height="30"
          rx="2"
          className="sk-mute sk-dash"
        />
        <rect
          x="54"
          y="20"
          width="28"
          height="30"
          rx="2"
          className="sk-paper sk-line"
        />
        <rect
          x="82"
          y="20"
          width="28"
          height="30"
          rx="2"
          className="sk-mute"
          opacity="0.45"
        />
        <path d="M64 28l9 7-9 7z" className="sk-fill" />
        <path d="M112 35h12M118 29v12" className="sk-mute" />
      </svg>
    ),
  },
  {
    title: "Yours, offline",
    copy: "No account, no cloud. The studios save to disk and keep working with the network off.",
    art: (
      <svg viewBox="0 0 150 70" aria-hidden="true" focusable="false">
        <rect
          x="46"
          y="9"
          width="50"
          height="52"
          rx="3"
          className="sk-paper sk-line"
        />
        <path d="M82 9v12h14" className="sk-mute" />
        <path d="M55 33h32M55 41h32M55 49h19" className="sk-mute" />
        <rect
          x="102"
          y="38"
          width="22"
          height="22"
          rx="2"
          className="sk-line"
        />
        <rect x="107" y="43" width="4" height="4" className="sk-fill" />
        <rect x="115" y="43" width="4" height="4" className="sk-fill" />
        <rect x="107" y="51" width="4" height="4" className="sk-fill" />
        <rect x="115" y="51" width="4" height="4" className="sk-mute" />
      </svg>
    ),
  },
];

export function Features() {
  return (
    <section className="section features-section" id="inside">
      <SketchTrail variant="faint" fallback={false} />
      <div className="grain" />

      <div className="wrap">
        <Reveal>
          <div className="section-head">
            <p className="eyebrow">Inside</p>
            <h2>Small tool, deep bench.</h2>
            <p className="section-sub">
              Everything the studios need is on the canvas, under a shortcut, or
              one click away. Nothing is hidden behind a menu you have to
              remember.
            </p>
          </div>
        </Reveal>

        <Reveal className="feature-grid" delay={70}>
          {FEATURES.map((feature) => (
            <article className="feature-card box" key={feature.title}>
              <div className="feature-demo">{feature.art}</div>
              <div className="body">
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
              </div>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
