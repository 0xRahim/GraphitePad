import type { CSSProperties } from "react";
import { Reveal } from "./reveal";
import { SketchTrail } from "./trails/sketch-trail";

const PALETTE = [
  "#26262b",
  "#3b5b9a",
  "#b23a3a",
  "#2f7a52",
  "#8a5a2b",
  "#6b8fbf",
  "#e0b15e",
  "#8a5a8a",
];

export function SketchSection() {
  return (
    <section className="section sketch-section" id="sketch">
      <SketchTrail ring />
      <div className="grain" />

      <div className="wrap">
        <div className="split">
          <Reveal className="copy">
            <p className="eyebrow">Pencil Studio</p>
            <h2>A pencil that keeps up with your head.</h2>
            <p className="section-sub">
              Graphite that behaves like graphite — weight from the speed of
              your hand, tooth from the paper, and a clean-up pass that fades
              the rough work to non-photo blue and hands you an ink layer.
            </p>

            <ul className="feature-list">
              <li>
                <b>Paper</b>
                <span>Lined, plain, grid, dots, isometric, toned tan.</span>
              </li>
              <li>
                <b>Guides</b>
                <span>
                  One-, two- and three-point perspective, plus isometric
                  snapping.
                </span>
              </li>
              <li>
                <b>Ctrl Clutch</b>
                <span>
                  Hold Ctrl and move. The whole trackpad becomes the pencil.
                </span>
              </li>
              <li>
                <b>Clean up</b>
                <span>
                  Rough work fades to blue; the clean ink sits on top.
                </span>
              </li>
            </ul>

            <div className="section-actions">
              <a
                className="btn"
                href="/studios/sketch.html"
                target="_blank"
                rel="noreferrer"
              >
                Open Pencil Studio <span aria-hidden="true">↗</span>
              </a>
            </div>
          </Reveal>

          <Reveal className="aside" delay={120}>
            <div className="panel box" aria-hidden="true">
              <div className="panel-head">
                <span>Pencil Studio</span>
                <span>1200 × 800</span>
              </div>

              <h4>
                <span>Layers</span>
                <span>+ Clear</span>
              </h4>
              <div className="panel-row">
                <span className="ui-btn mini">●</span>
                <span className="ui-btn nm on">Ink</span>
                <span className="ui-btn mini">B</span>
              </div>
              <div className="panel-row">
                <span className="ui-btn mini">●</span>
                <span className="ui-btn nm">Rough</span>
                <span className="ui-btn mini">B</span>
              </div>
              <div className="panel-row">
                <span className="ui-btn mini">○</span>
                <span className="ui-btn nm">Reference</span>
              </div>

              <h4>
                <span>Brush</span>
                <span>Stabilised</span>
              </h4>
              <div className="panel-field">
                <span>Size</span>
                <span
                  className="track"
                  style={{ "--v": "34%" } as CSSProperties}
                />
                <span>3.0</span>
              </div>
              <div className="panel-field">
                <span>Dark</span>
                <span
                  className="track"
                  style={{ "--v": "75%" } as CSSProperties}
                />
                <span>0.75</span>
              </div>
              <div className="panel-field">
                <span>Steady</span>
                <span
                  className="track"
                  style={{ "--v": "44%" } as CSSProperties}
                />
                <span>0.44</span>
              </div>

              <h4>
                <span>Paper</span>
                <span>Lined</span>
              </h4>
              <div className="panel-row">
                <span className="ui-btn on">Lined</span>
                <span className="ui-btn">Grid</span>
                <span className="ui-btn">Dots</span>
                <span className="ui-btn">Iso</span>
                <span className="ui-btn">Tan</span>
              </div>

              <h4>
                <span>Palette</span>
                <span>8</span>
              </h4>
              <div className="swatches">
                {PALETTE.map((color) => (
                  <i key={color} style={{ background: color }} />
                ))}
              </div>

              <div className="panel-note">
                Ctrl + move to draw · Space + drag to pan · 0 to fit
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
