import { Reveal } from "./reveal";
import { SketchTrail } from "./trails/sketch-trail";

const GROUPS = [
  {
    title: "Draw",
    rows: [
      { keys: ["B"], label: "Pencil" },
      { keys: ["E"], label: "Eraser" },
      { keys: ["[", "]"], label: "Brush size" },
      { keys: ["Shift"], label: "Constrain" },
      { keys: ["Alt"], label: "Pan or pick colour" },
    ],
  },
  {
    title: "Move & history",
    rows: [
      { keys: ["+", "−"], label: "Zoom" },
      { keys: ["0"], label: "Fit to screen" },
      { keys: ["Space"], label: "Pan" },
      { keys: ["Ctrl", "Z"], label: "Undo" },
      { keys: ["Ctrl", "⇧", "Z"], label: "Redo" },
    ],
  },
  {
    title: "Pixel & frames",
    rows: [
      { keys: [",", "."], label: "Previous / next frame" },
      { keys: ["Enter"], label: "Play / pause" },
      { keys: ["X"], label: "Swap colour wells" },
      { keys: ["R", "G"], label: "Rect / bucket" },
      { keys: ["Ctrl"], label: "Hold + move to draw" },
    ],
  },
];

export function Shortcuts() {
  return (
    <section className="section shortcuts-section" id="shortcuts">
      <SketchTrail variant="faint" fallback={false} />
      <div className="grain" />

      <div className="wrap">
        <Reveal>
          <div className="section-head">
            <p className="eyebrow">Shortcuts</p>
            <h2>The keyboard is the toolbar.</h2>
            <p className="section-sub">
              Every tool has a letter, and every modifier means the same thing
              in both studios. Learn one set, use both.
            </p>
          </div>
        </Reveal>

        <Reveal className="shortcut-panel box" delay={70}>
          {GROUPS.map((group) => (
            <div className="shortcut-group" key={group.title}>
              <h4>{group.title}</h4>
              <ul>
                {group.rows.map((row) => (
                  <li className="shortcut-row" key={row.label}>
                    <span className="keys">
                      {row.keys.map((key) => (
                        <kbd className="kbd" key={key}>
                          {key}
                        </kbd>
                      ))}
                    </span>
                    <b>{row.label}</b>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Reveal>

        <Reveal delay={120}>
          <p className="shortcut-note">
            Shortcuts are ignored while typing in a field. Ctrl + move draws in
            both studios.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
