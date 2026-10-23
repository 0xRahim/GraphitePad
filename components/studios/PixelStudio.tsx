"use client";

import { memo, useEffect, useRef } from "react";
import type { Art } from "@/src/shared/types";
import { slugify } from "@/lib/format";
import { useToast } from "@/components/Toast";
import { createPixelEngine, type PixelEngineApi } from "@/lib/studios/pixelEngine";

type Props = {
	art: Art;
	initialData: unknown;
	onBack: () => void;
	onSave: (content: unknown, thumbnail?: string) => Promise<unknown>;
	onExport: (filename: string, dataUrl: string) => Promise<{ path?: string }>;
	onReveal: (path: string) => Promise<void>;
};

function PixelStudioInner({ art, initialData, onBack, onSave, onExport, onReveal }: Props) {
	const rootRef = useRef<HTMLDivElement>(null);
	const engineRef = useRef<PixelEngineApi | null>(null);
	const toast = useToast();

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		const engine = createPixelEngine(root, initialData, {
			onSave,
			onExport: async (_name, dataUrl) => {
				const result = await onExport(`${slugify(art.name)}.png`, dataUrl);
				toast.show("PNG exported to Pictures / GraphitePad", {
					actionLabel: result.path ? "Show" : undefined,
					onAction: result.path ? () => void onReveal(result.path!) : undefined,
				});
				return result;
			},
		});
		engineRef.current = engine;
		return () => {
			engine.destroy();
			engineRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const goBack = async () => {
		try {
			await engineRef.current?.saveNow(true);
		} finally {
			onBack();
		}
	};

	return (
		<div className="gp-studio pixel-studio" ref={rootRef}>
			<canvas id="g" tabIndex={-1} />
			<div id="rail" className="box">
				<button className="back-rail" onClick={() => void goBack()} title="Back to project (saves automatically)">
					‹ Project
				</button>
				<div className="sep" />
			</div>
			<div id="bar" className="box">
				<input type="color" id="col" defaultValue="#26262b" title="Primary (FG) Colour" />
				<input type="color" id="colBg" defaultValue="#f7f3ea" title="Secondary (BG) Colour — right-click or Shift+draw uses BG" />
				<button id="swapCol" className="mini" title="Swap Primary / Secondary colours (X)">⇄</button>
				<label title="Brush size in pixels (1–24px)">Px<input id="size" type="range" min="1" max="24" step="1" defaultValue="1" /><span id="sizeVal">1</span></label>
				<button id="pxPerf" className="on" title="Pixel-Perfect mode: removes accidental L-corners on 1px freehand lines">Px-Perf</button>
				<button id="fillShp" title="Fill shapes (Rect / Oval)">Fill</button>
				<select id="dithPat" title="Dither pattern for Dither &amp; Gradient tools" defaultValue="0">
					<option value="0">Dither: 50% checker</option>
					<option value="1">Dither: 25% sparse</option>
					<option value="2">Dither: 75% dense</option>
					<option value="3">Dither: diagonal</option>
				</select>
				<select id="mode" title="Trackpad drawing mode" defaultValue="clutch">
					<option value="clutch">Ctrl clutch + drag</option>
					<option value="drag">Press &amp; drag</option>
					<option value="flow">Free-flow (finger = pen)</option>
				</select>
				<button id="clutchBtn" title="Hold CTRL and move your finger on the mousepad to auto-draw pixels without clicking (or click to lock)">Ctrl Clutch</button>
				<select id="csize" title="Infinite canvas guide / tile box (drawing is unrestricted everywhere)" defaultValue="inf">
					<option value="inf">Canvas: Infinite</option>
					<option value="16x16">Guide: 16×16</option>
					<option value="32x32">Guide: 32×32</option>
					<option value="64x64">Guide: 64×64</option>
					<option value="128x128">Guide: 128×128</option>
					<option value="256x256">Guide: 256×256</option>
				</select>
				<select id="bgStyle" title="Infinite canvas backdrop" defaultValue="paper">
					<option value="paper">Bg: Warm paper</option>
					<option value="checker">Bg: Checker</option>
					<option value="tan">Bg: Toned tan</option>
					<option value="dark">Bg: Dark slate</option>
				</select>
				<button id="gridBtn" className="on" title="Toggle pixel &amp; chunk grid overlay">Grid</button>
				<button id="tileBtn" title="Toggle 3×3 seamless tile repeat preview">Tiled 3×3</button>
				<select id="sym" title="Symmetry mirror axis (drag red axis dot to move anywhere on infinite canvas)" defaultValue="0">
					<option value="0">Sym: off</option>
					<option value="1">Sym: H</option>
					<option value="2">Sym: V</option>
					<option value="3">Sym: 4-way</option>
				</select>
				<button id="onionBtn" title="Toggle Onion Skin (previous/next animation frame ghost)">Onion</button>
				<button id="zo" title="Zoom out (−)">−</button>
				<button id="zv" title="Reset zoom (1)">100%</button>
				<button id="zi" title="Zoom in (+)">+</button>
				<button id="fit" title="Fit entire pixel artwork to screen (0)">Fit</button>
				<button id="bUndo" title="Undo (Ctrl+Z / Z)">Undo</button>
				<button id="bRedo" title="Redo (Ctrl+Shift+Z / Y)">Redo</button>
				<button id="img" title="Load low-opacity reference image to trace over">+ Ref</button>
				<select id="expScale" title="Export scale factor" defaultValue="4">
					<option value="1">1×</option>
					<option value="2">2×</option>
					<option value="4">4×</option>
					<option value="8">8×</option>
					<option value="16">16×</option>
				</select>
				<button id="save" title="Export artwork bounds as crisp nearest-neighbor PNG">Save PNG</button>
				<button id="saveSheet" title="Export all animation frames as a horizontal spritesheet PNG">Sheet PNG</button>
				<button id="themeBtn" title="Toggle light / dark UI chrome">◐</button>
				<input type="file" id="file" accept="image/*" hidden />
			</div>

			<div id="panel" className="box">
				<h4>
					Preview{" "}
					<span>
						<button className="mini" id="outlineBtn" title="Add 1px FG outline around opaque pixels">Outline</button>{" "}
						<button className="mini" id="flipH" title="Flip artwork horizontally">⇄</button>{" "}
						<button className="mini" id="flipV" title="Flip artwork vertically">⇅</button>{" "}
						<button className="mini" id="rot90" title="Rotate artwork 90° CW">↻</button>
					</span>
				</h4>
				<div id="previewWrap">
					<canvas id="prevC" />
				</div>
				<h4>
					Palette{" "}
					<span>
						<select id="palSel" className="mini" title="Switch pixel art palette" defaultValue="db32">
							<option value="db32">DB32 (32)</option>
							<option value="pico8">PICO-8 (16)</option>
							<option value="sweetie16">Sweetie 16</option>
							<option value="gb">Game Boy (4)</option>
							<option value="endesga">Endesga 24</option>
						</select>{" "}
						<button className="mini" id="addSw" title="Add current FG colour to palette">+</button>
					</span>
				</h4>
				<div id="palGrid" />
				<h4>
					Layers{" "}
					<span>
						<button className="mini" id="mergeL" title="Merge active layer down">⇊</button>{" "}
						<button className="mini" id="clr" title="Clear active cel">Clear</button>{" "}
						<button className="mini" id="addL" title="Add new layer">+</button>
					</span>
				</h4>
				<div id="ll" />
				<label>Opacity<input id="lop" type="range" min="0" max="1" step=".05" defaultValue="1" /></label>
				<h4>
					Reference{" "}
					<span>
						<button className="mini" id="clrRef" title="Remove reference image">Clear</button>
					</span>
				</h4>
				<label>Opacity<input id="rop" type="range" min="0" max="1" step=".05" defaultValue=".35" /></label>
				<label>Scale<input id="rsc" type="range" min="10" max="400" defaultValue="100" /></label>
			</div>

			<div id="timeline" className="box">
				<button id="playBtn" className="mini" title="Play / pause animation (Enter)">▶ Play</button>
				<label title="Animation playback speed">FPS<input id="fps" type="range" min="1" max="24" step="1" defaultValue="8" /><span id="fpsVal">8</span></label>
				<button id="prevF" className="mini" title="Previous frame (,)">◀</button>
				<div id="fList" />
				<button id="nextF" className="mini" title="Next frame (.)">▶</button>
				<button id="addF" className="mini" title="Add new blank frame">+ Frame</button>
				<button id="dupF" className="mini" title="Duplicate current frame across all layers">Dup</button>
				<button id="delF" className="mini" title="Delete current frame">✕</button>
			</div>

			<div id="status" className="box" />
		</div>
	);
}

export const PixelStudio = memo(PixelStudioInner);
