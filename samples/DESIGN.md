# Studio Design System

Shared design reference for **Pencil Studio** (sketching) and **Pixel Studio** (pixel art), and any future tool in the family. Read this before editing or adding frontend UI so new work looks and behaves like the rest.

> Source of truth: the CSS custom properties and component classes in section 12. If this document and a file disagree, update whichever is wrong and keep them identical.

---

## 1. Principles

1. **Canvas first.** The drawing surface fills the viewport. All UI floats above it in small, rounded, translucent-feeling panels and never reserves layout space.
2. **Quiet chrome.** Neutral warm greys, one ink colour, no accent colour. Colour on screen belongs to the artwork.
3. **Text buttons, no icon fonts.** Controls are short words (`Pencil`, `Undo`, `Fit`). This keeps the files dependency-free and the UI self-explanatory.
4. **Same UI, different canvas.** Toolbar, rail, panel and status pill sit in the same places in every app. Only the contents change.
5. **Single self-contained HTML file.** Inline CSS and JS, no frameworks, no remote assets, no build step.
6. **Keyboard and pointer parity.** Every tool has a single-letter shortcut shown in its tooltip. Modifier keys (Shift, Alt, Ctrl, Space) are the same across apps wherever they apply.

---

## 2. Colour tokens

Declared on `:root`. Components only ever reference the variables, never raw hex, so theming stays a one-place change.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#e9e6df` | `#1b1b1e` | Page background behind the canvas |
| `--ui` | `#fbfaf7` | `#2a2a2e` | Surface of every floating box |
| `--ink` | `#26262b` | `#ecebe6` | Text, icons, active-state fill |
| `--mute` | `#76736b` | `#9a978f` | Labels, hints, hover borders, status text |
| `--line` | `#d9d5ca` | `#3d3d42` | All 1px borders and dividers |

Fixed colours (do not theme):

| Value | Use |
|---|---|
| `#f7f3ea` | Paper colour in Pencil Studio (artwork, not chrome) |
| `#26262b` | Brush ring outline in Pencil Studio |
| `rgba(255,255,255,.7)` | Halo around the brush ring (keeps it visible on dark strokes) |
| `rgba(70,110,190,.22)` | Ruled-line and grid pattern on paper |
| `rgba(60,110,220,.9)` | Perspective vanishing points and guides |
| `rgba(200,70,70,.6)` | Mirror axis (dashed) |
| `#d4d4d4` / `#ffffff` | Transparency checkerboard (Pixel Studio) |
| `rgba(128,128,128,.28)` | Pixel grid lines |

Swatch defaults in Pencil Studio: `#26262b #3b5b9a #b23a3a #2f7a52 #8a5a2b`. Pixel Studio uses the DB32 palette.

### Theme switching

Three-way, resolved in this order:

1. `:root[data-theme="dark"]` forces dark.
2. `:root[data-theme="light"]` forces light.
3. Otherwise `@media (prefers-color-scheme: dark)` applies, guarded as `:root:not([data-theme="light"])`.

Always keep all three blocks in sync when adding a token.

---

## 3. Typography

| Property | Value |
|---|---|
| Family | `system-ui, -apple-system, "Segoe UI", sans-serif` |
| Base size / line height | `12px / 1.3` |
| Section headings (`h4`) | `11px`, uppercase, `letter-spacing: .06em`, colour `--mute` |
| Weight | Regular everywhere; `600` only for the active layer name and `<b>` in the status pill |
| Buttons and selects | `font: inherit` (never set a separate size) |

There is a single type size for controls. Hierarchy comes from colour (`--ink` vs `--mute`), case and spacing, not from size.

---

## 4. Spacing, radius, elevation

**Spacing scale (px):** 2, 3, 4, 6, 8, 12. Gaps inside controls use 3 to 4, gaps between groups 6 to 8, distance from the screen edge is always 8.

| Element | Radius |
|---|---|
| Floating box (`.box`) | `12px` |
| Button, select, number input, colour input | `7px` |
| Palette swatch (`#pal i`) | `2px` |
| Round colour swatch (`.sw`) | `50%` |
| Status pill | `999px` |

**Elevation:** one level only. `box-shadow: 0 4px 16px rgba(0,0,0,.12)` plus the 1px `--line` border. Do not add a second shadow level.

**Z-order (low to high):** paper / layer canvases, grain overlay, input canvas, brush ring, floating boxes. Floating boxes are `position: fixed` and need no explicit `z-index`; the foreground colour well inside `#cols` uses `z-index: 1` so it overlaps the background well.

---

## 5. Layout

All chrome is `position: fixed`. Offsets include the iOS safe area: `calc(env(safe-area-inset-top, 0px) + 8px)`.

```
+------------------------------------------------------------+
|                  #bar  (top, centred)                      |
|                                                            |
| #rail                                          #panel      |
| (left, 110px down)                    (right, 110px down)  |
|                                                            |
|           canvas fills the viewport                        |
|                                                            |
|   #tl timeline (Pixel Studio only, above status)           |
|                  #status  (bottom, centred)                |
+------------------------------------------------------------+
```

| Region | Position | Size | Content |
|---|---|---|---|
| `#bar` | `top: safe-top + 8px; left: 50%; translateX(-50%)` | `max-width: 100% - 16px`, wraps | Colour, sliders, mode selects, view, history, file actions |
| `#rail` | `left: 8px; top: 110px` | `74px` wide (Pencil) / `84px` (Pixel), column, `gap: 3px`, `padding: 5px` | One button per tool |
| `#panel` | `right: 8px; top: 110px` | `188px` (Pencil) / `200px` (Pixel), `padding: 8px`, scrolls | Layers, references, palette |
| `#tl` | `left: 104px; right: 220px; bottom: safe-bottom + 44px` | auto height | Frame buttons and playback (Pixel only) |
| `#status` | `bottom: safe-bottom + 10px; left: 50%` | single line, truncates | Current tool, coordinates, hints |

Responsive rule: at `max-width: 760px` the panel is hidden (`display: none`) and the timeline stretches to `right: 8px`. The toolbar wraps onto multiple rows and the rail stays visible.

The toolbar can grow to two rows (see Pencil Studio with Perspective, Shader and View controls on the second row). Because the rail and panel are anchored at `top: 110px`, keep the toolbar to two rows. If a third row is unavoidable, move less-used controls into a select or a collapsible group (the `‹` toggle at the end of the bar) instead of moving the rail.

---

## 6. Components

### 6.1 Floating box `.box`
Background `--ui`, border `1px solid --line`, radius 12, elevation shadow. Every UI region is a `.box`. Do not nest boxes.

### 6.2 Button
Transparent background, `1px solid --line`, radius 7, padding `4px 7px`, colour `--ink`, `cursor: pointer`.

| State | Style |
|---|---|
| Hover | `border-color: --mute` |
| Active / selected (`.on`) | Background `--ink`, text `--bg`, border `--ink` (inverts) |
| Disabled | `opacity: .35`, default cursor (Undo and Redo when history is empty) |

Variants:
- **`.mini`**: padding `3px 6px`, used for symbols inside rows (`+`, `✕`, `↑`, `↓`).
- **`.nm`**: a row's main button, `flex: 1`, left-aligned, ellipsis on overflow.
- **`.sw`**: 18px circle colour swatch with a 2px `--ui` border and 1px `--line` outline.

Toggles (Mirror, Grid, Onion, Fill shapes) are plain buttons that toggle `.on` and mirror the state in a JS variable. Never use checkboxes in the toolbar.

### 6.3 Select
Styled identically to a button. Use for modes with 2 to 6 mutually exclusive options (drawing mode, paper, perspective, shader, export scale). Put the category in the first option text when the control has no label (`Perspective: off`, `Shader: none`).

### 6.4 Range slider
`accent-color: --ink`, `68px` wide in the toolbar and `100%` in the panel. Always wrapped in a `label` with a muted text prefix (`Size`, `Dark`, `Steady`, `Opacity`).

### 6.5 Label
`display: flex; align-items: center; gap: 4px; colour: --mute`. Wraps a control and its text.

### 6.6 Section heading `h4`
Uppercase 11px muted text, flex with `justify-content: space-between` so small actions (`Clear`, `+`) sit on the right of the same line. The first heading in a panel has no top margin.

### 6.7 List row `.row`
`display: flex; gap: 3px; margin: 2px 0`. Typical content for a layer: visibility toggle (`.mini`), name (`.nm`), then optional `.mini` actions. The selected row adds `.on`, which draws a `--ink` border and bold name on the `.nm` button (not the inverted fill, so many rows stay readable).

### 6.8 Colour controls
- Native `<input type="color">`, 26 to 30px, `1px solid --line`, radius 6, no padding.
- Foreground and background wells overlap in `#cols` (foreground on top, offset 20px / 12px).
- Palette grid `#pal`: 8 columns, 2px gap, square swatches.
- Pointer rules: click sets foreground, right-click sets background, Shift+click removes (Pixel Studio).

### 6.9 Status pill `#status`
A `.box` with radius 999, muted text, `<b>` for the current tool in `--ink`. One line, never wraps. Format: `**Tool** · state · hint · hint`, separated by ` · `. Hints always teach the active mode's modifiers.

### 6.10 Brush ring and cursor
- Pencil Studio hides the system cursor (`cursor: none`) and draws a `#ring` that mirrors the brush radius. It gains a translucent fill (`.down`) while the pen is down.
- Pixel Studio keeps `cursor: crosshair` and draws a two-tone (white then black) pixel footprint rectangle on the canvas so it is visible on any colour.

### 6.11 Timeline `#tl` (Pixel Studio)
A `.box` containing one numbered button per frame, then actions (`+ Frame`, `Copy frame`, `Del frame`), the Onion toggle, Play/Stop toggle, and an FPS number field. The current frame uses `.on`. Double-click a frame to set its duration.

---

## 7. Interaction conventions

### Tool selection
- Rail button click or single-letter shortcut selects a tool; the selected tool has `.on`.
- Switching tool first finishes or commits any in-progress stroke or floating selection.

### Shortcuts (shared)

| Key | Action |
|---|---|
| `B` / `P` / `N` / `S` / `H` / `E` | Pencil-family brushes (Pencil Studio) |
| `B` / `E` / `L` / `R` / `O` / `G` / `I` / `M` / `H` | Pencil, Eraser, Line, Rect, Ellipse, Bucket, Eyedropper, Select, Hand (Pixel Studio) |
| `[` `]` | Brush size down / up |
| `+` `-` `0` | Zoom in / out / fit |
| `Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+Y` | Undo, redo |
| `Space` | Hold to pan (or toggle pen in free-flow mode, Pencil Studio) |
| `Esc` | Cancel / deselect |

Shortcuts are ignored while typing in an input or select (except range and colour inputs).

### Modifiers

| Modifier | Meaning |
|---|---|
| Shift | Constrain (45° lines, squares and circles) |
| Alt | Temporary pan (Pencil) or eyedropper (Pixel) |
| Ctrl (held) | **Auto clutch**: moving the mouse draws without pressing a button; releasing lifts the pen |
| Space + drag, middle-drag | Pan |
| Wheel / pinch | Zoom at the pointer |
| Ctrl + wheel | Zoom (trackpad pinch) |
| Two-finger scroll | Pan |
| Right button | Draw with the secondary (background) colour in Pixel Studio |

### Pointer handling
- Use Pointer Events with `setPointerCapture` and `touch-action: none` on the canvas.
- Use coalesced events for smooth strokes where available.
- Suppress the context menu on the canvas.
- Never start a second drawing session while one is active (guard `D`).

### History
- Pencil Studio: operations are vector stroke lists; undo and redo move groups of strokes.
- Pixel Studio: full snapshots (max 60) so layer and frame edits are undoable too.
- Always snapshot **before** a mutation; clear the redo stack on any new action.

---

## 8. Canvas rules

- **Retina:** size the backing store as `CSS size × devicePixelRatio`, set the transform to `dpr`, and draw in CSS pixels.
- **Pixel art:** `imageSmoothingEnabled = false`; zoom in integer steps where possible; draw the grid only when `zoom >= 6`.
- **Sketching:** layers are vector op lists redrawn crisply after zoom or pan settles (about 130 ms), with a CSS transform bridging the gap while zooming.
- **Overlays** (guides, grid, selection, mirror axis) use dashed `setLineDash([5,4])` or 1px solid lines at 0.5px offsets for sharp edges.
- **Selection:** marching-ants effect is a black dashed line with a white dashed line offset by 5px on top.

---

## 9. Naming and code conventions

| Item | Convention |
|---|---|
| File | One HTML file, `Title_Case_With_Underscores.html` |
| Structure | `<style>`, markup, one IIFE `<script>` |
| IDs | Short lowercase: `bar`, `rail`, `panel`, `tl`, `status`, `pal`, `ll` (layer list), `zv` (zoom value) |
| Buttons by role | `b` prefix for action buttons (`bUndo`, `bRedo`, `bNew`) |
| State | One settings object (`S` in Pencil Studio) or top-level `let`s; one active-session object (`D`) |
| Helpers | `$` = `getElementById`, `h(tag, text, onclick, class)` / `btn(text, fn, class)` builds buttons |
| Tool tables | A single array drives both the rail buttons and the shortcut map (`KEYS` / `TOOLS`) |
| `ui()` | Re-syncs every `.on` class, disabled state and list; call after any state change |
| `info()` | Rewrites the status pill |
| Text | Use curly apostrophes and quotes in visible copy; straight quotes only in code |

Keep functions short and the code dense but readable. Comments are single-line section banners (`/* pointer, wheel, keys */`).

---

## 10. Recipes

### Add a tool
1. Add a row to the tool table (`[id, 'Label', 'shortcut']`). The rail button and shortcut appear automatically.
2. Handle it in pointer down / move / up.
3. Add it to the status hint if it needs a modifier.
4. Make sure `ui()` toggles `.on` for it.

### Add a toolbar control
1. Place it in `#bar` next to related controls (colour and sizes left, modes in the middle, view and history, then file actions last).
2. Use a toggle button, select or labelled range from section 6; do not invent new control types.
3. Store its value in state and read it where it is used; call `ui()` if it affects `.on`.

### Add a panel section
1. Add an `h4` with optional right-aligned actions.
2. Use `.row` for lists and labelled ranges for values.
3. Keep the panel scrollable rather than growing it.

### Add a colour
Add the token to all three theme blocks (`:root`, dark media query, `[data-theme="dark"]`) and reference it with `var()`.

### Add a new app to the family
Copy the shared CSS from section 12, keep the same five regions, replace rail and panel contents, and reuse the shortcuts table.

---

## 11. Do and don't

**Do**
- Reuse existing tokens, radii and the single shadow.
- Keep every control reachable by keyboard or pointer, with a tooltip (`title`) that includes the shortcut.
- Disable rather than hide unavailable actions (Undo, Redo).
- Keep labels to one or two words.
- Test in light, dark and forced themes, and at a width under 760px.

**Don't**
- Add accent colours, gradients, icon fonts, emoji icons (the eye toggle is the only exception in Pixel Studio) or external libraries.
- Add a second elevation or radius value.
- Put UI in the document flow; everything floats over the canvas.
- Use `localStorage` in artifacts or hosted previews; hold state in memory or let users save a file.
- Make the toolbar taller than two rows.

---

## 12. Shared CSS (copy-paste baseline)

```css
:root{--bg:#e9e6df;--ui:#fbfaf7;--ink:#26262b;--mute:#76736b;--line:#d9d5ca;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#1b1b1e;--ui:#2a2a2e;--ink:#ecebe6;--mute:#9a978f;--line:#3d3d42}}
:root[data-theme="dark"]{--bg:#1b1b1e;--ui:#2a2a2e;--ink:#ecebe6;--mute:#9a978f;--line:#3d3d42}
*{box-sizing:border-box}
html,body{height:100%;margin:0;background:var(--bg);color:var(--ink);font:12px/1.3 system-ui,-apple-system,"Segoe UI",sans-serif;overflow:hidden}

.box{position:fixed;background:var(--ui);border:1px solid var(--line);border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.12)}
#bar{top:calc(env(safe-area-inset-top,0px) + 8px);left:50%;transform:translateX(-50%);max-width:calc(100% - 16px);display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;justify-content:center;padding:6px 9px}
#rail{left:8px;top:110px;display:flex;flex-direction:column;gap:3px;padding:5px;width:84px}
#panel{right:8px;top:110px;width:200px;padding:8px;max-height:calc(100% - 170px);overflow:auto}
#status{position:fixed;bottom:calc(env(safe-area-inset-bottom,0px) + 10px);left:50%;transform:translateX(-50%);padding:5px 14px;border-radius:999px;color:var(--mute);white-space:nowrap;max-width:calc(100% - 16px);overflow:hidden;text-overflow:ellipsis}
#status b{color:var(--ink)}

button,select,input[type=number]{font:inherit;color:var(--ink);background:transparent;border:1px solid var(--line);border-radius:7px;padding:4px 7px;cursor:pointer}
button:hover,select:hover{border-color:var(--mute)}
button.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}
button:disabled{opacity:.35;cursor:default}
label{color:var(--mute);display:flex;align-items:center;gap:4px}
input[type=range]{width:68px;accent-color:var(--ink)}
#panel input[type=range]{width:100%}
h4{margin:8px 0 4px;display:flex;justify-content:space-between;align-items:center;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--mute)}
h4:first-child{margin-top:0}
.row{display:flex;gap:3px;margin:2px 0}.row .nm{flex:1;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row.on .nm{border-color:var(--ink);font-weight:600}.mini{padding:3px 6px}
.sw{width:18px;height:18px;border-radius:50%;padding:0;border:2px solid var(--ui);outline:1px solid var(--line)}
input[type=color]{width:26px;height:24px;padding:0;border:1px solid var(--line);border-radius:6px;background:none}
@media(max-width:760px){#panel{display:none}}
```

---

## 13. Known drift to reconcile

These differ between the two apps today. Pick the standard value the next time either file is edited.

| Item | Pencil Studio | Pixel Studio | Standard |
|---|---|---|---|
| Rail width | 74px | 84px | **84px** (fits longer labels) |
| Panel width | 188px | 200px | **200px** |
| Panel `max-height` | `100% - 170px` | `100% - 230px` (leaves room for the timeline) | `100% - 170px`, reduce only when a bottom box exists |
| Canvas cursor | hidden, custom ring | crosshair + pixel footprint | Keep per app (ring suits freehand, footprint suits pixels) |
| Hover/active on rail | inverted fill | inverted fill | Same |
| Auto clutch (Ctrl) | Present (mode select + `Ctrl Clutch` toggle in the latest build) | Not yet implemented | Add to Pixel Studio's pencil, eraser and shape tools using the same rule (hold Ctrl and move to draw) |
| Layer row actions | Visibility dot, name, `B`, `X` | Eye, name | Use the same row: visibility, name, then `.mini` actions |
| Theme | Follows system, both themes | Follows system, both themes | Same, add a manual toggle later using `data-theme` |

Pencil Studio layout notes from the latest build: toolbar is two rows (colours, sliders, mode selects on row one; perspective, snap, mirror, shader, zoom, history, file actions on row two); the rail lists Pencil, Charcoal, Ink pen, Shade, Hatch, Blend, Eraser, then a divider gap, then Line, Curve, Rect, Oval, Triangle, Persp line, Move / ref; the panel holds Layers (with Clear and `+`), then References with Opacity, Scale and Rotate sliders.
