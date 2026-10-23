"use client";

import { memo, useEffect, useRef } from "react";
import type { Art } from "@/src/shared/types";
import { slugify } from "@/lib/format";
import { useToast } from "@/components/Toast";
import { createSketchEngine, type SketchEngineApi } from "@/lib/studios/sketchEngine";

type Props = {
	art: Art;
	initialData: unknown;
	onBack: () => void;
	onSave: (content: unknown, thumbnail?: string) => Promise<unknown>;
	onExport: (filename: string, dataUrl: string) => Promise<{ path?: string }>;
	onReveal: (path: string) => Promise<void>;
};

function SketchStudioInner({ art, initialData, onBack, onSave, onExport, onReveal }: Props) {
	const rootRef = useRef<HTMLDivElement>(null);
	const engineRef = useRef<SketchEngineApi | null>(null);
	const toast = useToast();

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		const engine = createSketchEngine(root, initialData, {
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
		// The studio is mounted once per artwork. Callbacks are stable.
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
		<div className="gp-studio" ref={rootRef}>
			<div id="stack" />
			<div id="grain" />
			<canvas id="g" tabIndex={-1} />
			<div id="ring" />
			<div id="rail" className="box">
				<button className="back-rail" onClick={() => void goBack()} title="Back to project (saves automatically)">
					‹ Project
				</button>
				<div className="sep" />
			</div>
			<div id="bar" className="box">
				<input type="color" id="col" defaultValue="#26262b" title="Colour" />
				<span id="sw" />
				<label title="Brush radius">
					Size
					<input id="size" type="range" min=".5" max="28" step=".5" defaultValue="3" />
				</label>
				<label title="Graphite darkness / flow">
					Dark
					<input id="dark" type="range" min=".1" max="1" step=".05" defaultValue=".75" />
				</label>
				<label title="Stroke smoothing for single-finger trackpad">
					Steady
					<input id="stab" type="range" min="0" max=".92" step=".04" defaultValue=".44" />
				</label>
				<select id="mode" title="Trackpad drawing mode" defaultValue="clutch">
					<option value="clutch">Ctrl clutch + drag</option>
					<option value="drag">Press &amp; drag</option>
					<option value="flow">Free-flow (finger = pen)</option>
				</select>
				<button id="clutchBtn" title="Hold CTRL and move your finger on the mousepad to auto-draw without clicking (or click here to lock clutch)">
					Ctrl Clutch
				</button>
				<select id="paper" title="Paper stock" defaultValue="lined">
					<option value="lined">Lined</option>
					<option value="plain">Plain</option>
					<option value="grid">Grid</option>
					<option value="dots">Dots</option>
					<option value="iso">Iso grid</option>
					<option value="tan">Toned tan</option>
				</select>
				<select id="persp" title="Perspective guide" defaultValue="0">
					<option value="0">Perspective: off</option>
					<option value="1">1-point</option>
					<option value="2">2-point</option>
					<option value="3">3-point</option>
					<option value="4">Isometric</option>
				</select>
				<button id="snapP" title="Snap freehand pencil &amp; ink strokes to perspective rays (or hold Shift)">
					Snap P
				</button>
				<button id="mir" title="Vertical symmetry mirror (drag red axis line to reposition)">
					Mirror
				</button>
				<select id="shader" title="Live canvas shader" defaultValue="">
					<option value="">Shader: none</option>
					<option value="grayscale(1) contrast(2.6) brightness(1.05)">Ink B&amp;W</option>
					<option value="contrast(1.32) brightness(.98)">Graphite boost</option>
					<option value="invert(1) hue-rotate(190deg) saturate(1.4)">Blueprint</option>
					<option value="sepia(.85) contrast(1.05)">Sepia</option>
					<option value="blur(.7px) contrast(1.15) saturate(1.2)">Soft focus</option>
					<option value="invert(1) grayscale(1) contrast(1.2)">Chalkboard</option>
				</select>
				<button id="zo" title="Zoom out (−)">−</button>
				<button id="zv" title="Reset to 100%">100%</button>
				<button id="zi" title="Zoom in (+)">+</button>
				<button id="fit" title="Fit drawing to screen (0)">Fit</button>
				<button id="bUndo" title="Undo (Ctrl+Z / Z)">Undo</button>
				<button id="bRedo" title="Redo (Ctrl+Shift+Z / Y)">Redo</button>
				<button id="clean" title="Fade rough sketch to 25% non-photo blue and switch to clean ink layer on top">
					Clean up ▸
				</button>
				<button id="img" title="Add low-opacity reference image to draw over (or drag-drop / paste)">
					+ Image
				</button>
				<button id="save" title="Export crisp PNG">Save PNG</button>
				<button id="themeBtn" title="Toggle light / dark UI chrome">◐</button>
				<input type="file" id="file" accept="image/*" hidden />
			</div>
			<div id="panel" className="box">
				<h4>
					Layers{" "}
					<span>
						<button className="mini" id="mergeL" title="Merge active layer down">⇊</button>{" "}
						<button className="mini" id="clr" title="Clear active layer">Clear</button>{" "}
						<button className="mini" id="addL" title="Add new layer">+</button>
					</span>
				</h4>
				<div id="ll" />
				<label>
					Layer opacity
					<input id="lop" type="range" min="0" max="1" step=".05" />
				</label>
				<h4>
					References{" "}
					<span>
						<button className="mini" id="clrRef" title="Remove all reference images">Clear</button>
					</span>
				</h4>
				<div id="rl" />
				<label>
					Opacity
					<input id="rop" type="range" min="0" max="1" step=".05" />
				</label>
				<label>
					Scale
					<input id="rsc" type="range" min="5" max="400" defaultValue="100" />
				</label>
				<label>
					Rotate
					<input id="rrot" type="range" min="-180" max="180" defaultValue="0" />
				</label>
			</div>
			<div id="status" className="box" />
		</div>
	);
}

export const SketchStudio = memo(SketchStudioInner);
