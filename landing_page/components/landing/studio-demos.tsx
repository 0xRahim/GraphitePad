"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Reveal } from "./reveal";
import { SketchTrail } from "./trails/sketch-trail";

type StudioKey = "sketch" | "pixel";

const STUDIOS: Record<
  StudioKey,
  { label: string; title: string; meta: string; src: string }
> = {
  sketch: {
    label: "Sketch studio",
    title: "Pencil Studio",
    meta: "Graphite · layers · perspective",
    src: "/studios/sketch.html",
  },
  pixel: {
    label: "Pixel studio",
    title: "Pixel Studio",
    meta: "Frames · palettes · symmetry",
    src: "/studios/pixel.html",
  },
};

export function StudioDemos() {
  const [tab, setTab] = useState<StudioKey>("sketch");
  const [active, setActive] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const studio = STUDIOS[tab];

  const syncTheme = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      const theme = document.documentElement.dataset.theme;
      if (theme === "dark" || theme === "light") {
        doc.documentElement.dataset.theme = theme;
      } else {
        doc.documentElement.removeAttribute("data-theme");
      }
    } catch {
      /* the frame is not same-origin yet, or has not loaded */
    }
  }, []);

  useEffect(() => {
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, [syncTheme]);

  useEffect(() => {
    if (!active) return;
    iframeRef.current?.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, tab, reloadKey]);

  const switchTab = (next: StudioKey) => {
    if (next === tab) return;
    setTab(next);
    setActive(false);
    setReloadKey((key) => key + 1);
  };

  const reload = () => {
    setActive(false);
    setReloadKey((key) => key + 1);
  };

  return (
    <section className="section studios-section" id="studios">
      <SketchTrail variant="faint" fallback={false} />
      <div className="grain" />

      <div className="wrap">
        <Reveal>
          <div className="section-head">
            <p className="eyebrow">Try it</p>
            <h2>The real thing, right here.</h2>
            <p className="section-sub">
              Both frames below are the shipping HTML studios, not a video.
              Start drawing, then pause to scroll on. Nothing is uploaded.
            </p>
          </div>
        </Reveal>

        <Reveal delay={70}>
          <div className="demo-tabs" role="group" aria-label="Choose a studio">
            {(Object.keys(STUDIOS) as StudioKey[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`btn small${tab === key ? " on" : ""}`}
                aria-pressed={tab === key}
                onClick={() => switchTab(key)}
              >
                {STUDIOS[key].label}
              </button>
            ))}
          </div>

          <div className="demo-shell box">
            <div className="demo-head">
              <span className="demo-dot" aria-hidden="true" />
              <span className="demo-title">{studio.title}</span>
              <span className="demo-meta">{studio.meta}</span>
              <div className="demo-actions">
                {active ? (
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => setActive(false)}
                  >
                    Pause
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn small demo-reload"
                  onClick={reload}
                >
                  Reload
                </button>
                <a
                  className="btn small"
                  href={studio.src}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>

            <div className="demo-frame">
              <iframe
                ref={iframeRef}
                key={`${tab}-${reloadKey}`}
                src={studio.src}
                title={`${studio.title} live demo`}
                loading="lazy"
                onLoad={syncTheme}
                sandbox="allow-scripts allow-same-origin allow-downloads allow-forms allow-modals allow-popups"
              />
              {!active ? (
                <button
                  type="button"
                  className="demo-scrim"
                  onClick={() => setActive(true)}
                >
                  <span className="inner">
                    <span className="eyebrow">Live studio</span>
                    <span className="scrim-title">
                      {studio.title}, ready to draw.
                    </span>
                    <span className="scrim-copy">
                      Click to hand the studio the pointer. Use Pause to get the
                      page back.
                    </span>
                    <span className="start">Start drawing</span>
                  </span>
                </button>
              ) : null}
            </div>

            <div className="demo-mobile">
              <p className="muted">
                The embedded studio needs a larger screen. Open either studio
                full-screen:
              </p>
              <a
                className="btn"
                href="/studios/sketch.html"
                target="_blank"
                rel="noreferrer"
              >
                Pencil Studio <span aria-hidden="true">↗</span>
              </a>
              <a
                className="btn"
                href="/studios/pixel.html"
                target="_blank"
                rel="noreferrer"
              >
                Pixel Studio <span aria-hidden="true">↗</span>
              </a>
            </div>

            <div className="demo-foot">
              <span>
                The same engines that ship in the app. Artwork stays in this
                browser.
              </span>
              <span>
                {active ? "Live · use Pause to scroll" : "Click the preview to interact"}
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
