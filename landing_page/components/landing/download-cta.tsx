import { Reveal } from "./reveal";
import { SketchTrail } from "./trails/sketch-trail";

export function DownloadCta() {
  return (
    <section className="section download-section" id="download">
      <SketchTrail variant="faint" fallback={false} />
      <div className="grain" />

      <div className="wrap">
        <Reveal>
          <div className="download-box box">
            <div className="download-copy">
              <p className="eyebrow">Take it with you</p>
              <h2>Take the pad with you.</h2>
              <p className="section-sub">
                Open either studio in a tab right now, or keep both on your
                desktop. No account, no cloud, no upload.
              </p>
              <div className="download-actions">
                <a
                  className="btn primary"
                  href="https://github.com/0xRahim/GraphitePad/releases/download/linux/stable-linux-x64.tar.gz"
                >
                  Download for Linux <span aria-hidden="true">↓</span>
                </a>
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
              <p className="shortcut-note">
                Linux x64 build · .tar.gz · extract and run. The browser
                studios above are the same engines.
              </p>
            </div>

            <div className="download-art" aria-hidden="true">
              <svg viewBox="0 0 210 140" focusable="false">
                <rect
                  x="22"
                  y="14"
                  width="126"
                  height="106"
                  rx="7"
                  fill="var(--paper)"
                  stroke="var(--line)"
                />
                <path
                  d="M48 14v106"
                  stroke="var(--margin-rule)"
                  strokeWidth="1"
                />
                <path
                  d="M48 40h86M48 60h86M48 80h86M48 100h58"
                  stroke="var(--rule)"
                  strokeWidth="1"
                />
                <path
                  d="M56 94c12-28 24-40 32-37 9 4 4 26 14 33 9 6 20-9 25-23 6-17 14-22 20-17"
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  opacity="0.85"
                />
                <g transform="rotate(-38 150 112)">
                  <rect
                    x="110"
                    y="106"
                    width="70"
                    height="12"
                    rx="2"
                    fill="var(--ui)"
                    stroke="var(--ink)"
                    strokeWidth="1.1"
                  />
                  <path d="M180 106l14 6-14 6z" fill="var(--ink)" />
                  <path d="M194 110l4 2-4 2z" fill="var(--mute)" />
                </g>
                <g fill="var(--ink)">
                  <rect x="160" y="22" width="8" height="8" />
                  <rect x="168" y="30" width="8" height="8" opacity="0.55" />
                  <rect x="176" y="22" width="8" height="8" />
                  <rect x="176" y="38" width="8" height="8" opacity="0.3" />
                </g>
              </svg>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
