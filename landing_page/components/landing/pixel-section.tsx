import { PixelTrail } from "./trails/pixel-trail";
import { Reveal } from "./reveal";

const DB32 = [
  "#222034",
  "#45283c",
  "#8f563b",
  "#df7126",
  "#eec39a",
  "#99e550",
  "#37946e",
  "#3f3f74",
  "#306082",
  "#5b6ee1",
  "#5fcde4",
  "#ac3232",
  "#d95763",
  "#76428a",
  "#8a6f30",
  "#696a6a",
];

export function PixelSection() {
  return (
    <section className="section pixel-section" id="pixel">
      <PixelTrail />
      <div className="grain" />

      <div className="wrap">
        <div className="split flip">
          <Reveal className="copy">
            <p className="eyebrow">Pixel Studio</p>
            <h2>Pixels, without the tab-hopping.</h2>
            <p className="section-sub">
              An infinite grid with layers, frames and onion skin. Dither,
              mirror, tile, and export a crisp nearest-neighbour PNG or a full
              spritesheet — all on the same canvas.
            </p>

            <ul className="feature-list">
              <li>
                <b>Frames</b>
                <span>
                  Animation strip, playback, onion skin and per-frame timing.
                </span>
              </li>
              <li>
                <b>Palettes</b>
                <span>
                  DB32, PICO-8, Sweetie 16 and Game Boy, plus your own swatches.
                </span>
              </li>
              <li>
                <b>Symmetry</b>
                <span>
                  Four-way mirror, four dither patterns, seamless tile preview.
                </span>
              </li>
              <li>
                <b>Export</b>
                <span>
                  1×–16× PNG and sprite sheets, with no resampling in sight.
                </span>
              </li>
            </ul>

            <div className="section-actions">
              <a
                className="btn"
                href="/studios/pixel.html"
                target="_blank"
                rel="noreferrer"
              >
                Open Pixel Studio <span aria-hidden="true">↗</span>
              </a>
            </div>
          </Reveal>

          <Reveal className="aside" delay={120}>
            <div className="panel box" aria-hidden="true">
              <div className="panel-head">
                <span>Pixel Studio</span>
                <span>32 × 32</span>
              </div>

              <h4>
                <span>Palette</span>
                <span>DB32</span>
              </h4>
              <div className="swatches">
                {DB32.map((color) => (
                  <i key={color} style={{ background: color }} />
                ))}
              </div>

              <h4>
                <span>Layers</span>
                <span>+ Clear</span>
              </h4>
              <div className="panel-row">
                <span className="ui-btn mini">◉</span>
                <span className="ui-btn nm on">Line art</span>
                <span className="ui-btn mini">B</span>
              </div>
              <div className="panel-row">
                <span className="ui-btn mini">◉</span>
                <span className="ui-btn nm">Colour</span>
                <span className="ui-btn mini">B</span>
              </div>
              <div className="panel-row">
                <span className="ui-btn mini">○</span>
                <span className="ui-btn nm">Reference</span>
              </div>

              <h4>
                <span>Frames</span>
                <span>24 fps</span>
              </h4>
              <div className="timeline">
                <span className="frame on">1</span>
                <span className="frame">2</span>
                <span className="frame">3</span>
                <span className="ui-btn mini">+ Frame</span>
                <span className="ui-btn mini on">Onion</span>
                <span className="ui-btn mini">Play</span>
              </div>

              <div className="panel-note">
                Right-click paints the secondary colour · X swaps wells
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
