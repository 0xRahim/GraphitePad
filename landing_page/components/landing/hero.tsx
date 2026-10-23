import { SketchTrail } from "./trails/sketch-trail";

export function Hero() {
  return (
    <section className="hero" id="top">
      <SketchTrail ring />
      <div className="grain" />

      <div className="hero-chips" aria-hidden="true">
        <span className="float-chip hero-chip-a">
          <b>Pencil</b>
          <span className="kbd">B</span>
        </span>
        <span className="float-chip hero-chip-b">
          <b>Ctrl</b> + move to draw
        </span>
        <span className="float-chip hero-chip-c">
          <b>Undo</b>
          <span className="kbd">⌘Z</span>
        </span>
      </div>

      <div className="wrap hero-content">
        <p className="eyebrow hero-eyebrow">Pencil Studio · Pixel Studio</p>
        <h1 className="hero-title">
          <span className="line">
            <span>Think in graphite.</span>
          </span>
          <span className="line">
            <span>Build in pixels.</span>
          </span>
        </h1>
        <p className="hero-sub">
          GraphitePad is a pair of focused studios — a paper-feel sketch canvas
          and an infinite pixel grid. Built for the trackpad, the pen, and the
          half-formed idea.
        </p>
        <div className="hero-cta">
          <a
            className="btn primary"
            href="https://github.com/0xRahim/GraphitePad/releases/download/linux/stable-linux-x64.tar.gz"
          >
            Download for Linux <span aria-hidden="true">↓</span>
          </a>
          <a className="btn" href="#studios">
            Try the studios
          </a>
          <a className="btn" href="#inside">
            See what’s inside
          </a>
        </div>
        <div>
          <span className="hero-hint">
            <span className="dot" aria-hidden="true" />
            <span className="hint-fine">
              Move your cursor to draw · leave to erase
            </span>
            <span className="hint-touch">Two studios · one pad</span>
          </span>
        </div>
      </div>

      <div className="scroll-cue" aria-hidden="true">
        <span>Scroll</span>
        <i />
      </div>
    </section>
  );
}
