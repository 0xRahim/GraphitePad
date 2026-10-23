import type { ArtKind } from "@/src/shared/types";

export const DB32 = [
	"#000000", "#222034", "#45283c", "#663931", "#8f563b", "#df7126",
	"#d9a066", "#eec39a", "#fbf236", "#99e550", "#6abe30", "#37946e",
	"#4b692f", "#524b24", "#323c39", "#3f3f74", "#306082", "#5b6ee1",
	"#639bff", "#5fcde4", "#cbdbfc", "#ffffff", "#9badb7", "#847e87",
	"#696a6a", "#595652", "#76428a", "#ac3232", "#d95763", "#d77bba",
	"#8f974a", "#8a6f30",
];

export function defaultSketchState() {
	return {
		kind: "sketch" as const,
		version: 1,
		settings: {
			brush: "pencil",
			color: "#26262b",
			size: 3,
			dark: 0.75,
			stab: 0.44,
			mode: "clutch",
			paper: "lined",
			persp: 0,
			snapP: false,
			mirror: false,
			ax: 0,
			shader: "",
			clutchLock: false,
		},
		active: 0,
		layers: [
			{ name: "Rough", vis: true, op: 1, blue: false, ops: [] },
			{ name: "Clean", vis: true, op: 1, blue: false, ops: [] },
		],
		refs: [],
		view: null,
	};
}

export function defaultPixelState() {
	return {
		kind: "pixel" as const,
		version: 1,
		settings: {
			tool: "pencil",
			fg: "#26262b",
			bg: "#f7f3ea",
			size: 1,
			pxPerf: true,
			fillShp: false,
			dith: 0,
			mode: "clutch",
			guide: "inf",
			bgStyle: "paper",
			grid: true,
			tiled: false,
			sym: 0,
			symX: 0,
			symY: 0,
			onion: false,
			fps: 8,
			exportScale: 4,
			palette: "db32",
		},
		palette: DB32.slice(),
		layers: [
			{
				name: "Background",
				vis: true,
				op: 1,
				cels: [{ x: -64, y: -64, w: 0, h: 0, u: null }],
			},
			{
				name: "Artwork",
				vis: true,
				op: 1,
				cels: [{ x: -64, y: -64, w: 0, h: 0, u: null }],
			},
		],
		frames: 1,
		activeLayer: 1,
		activeFrame: 0,
		ref: null,
		view: null,
	};
}

export function defaultArtState(kind: ArtKind) {
	return kind === "sketch" ? defaultSketchState() : defaultPixelState();
}
