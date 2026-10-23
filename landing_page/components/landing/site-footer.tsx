import { SketchTrail } from "./trails/sketch-trail";
import { Wordmark } from "./wordmark";

export function SiteFooter() {
  return (
    <footer className="site-footer trail-host">
      <SketchTrail variant="faint" fallback={false} />
      <div className="grain" />

      <div className="wrap footer-row">
        <Wordmark />
        <span>Sketch and pixel, one pad.</span>
        <nav className="footer-links" aria-label="Footer">
          <a href="#top">Top</a>
          <a href="#sketch">Sketch</a>
          <a href="#pixel">Pixel</a>
          <a href="#studios">Try it</a>
          <a href="#download">Download</a>
        </nav>
        <span>© 2026 GraphitePad</span>
      </div>
    </footer>
  );
}
