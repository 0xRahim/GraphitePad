// @ts-nocheck
/* Ported from samples/GraphitePad-Sketch-Studio.html.
   The brush, paper, perspective and rendering algorithms are kept intact;
   persistence, thumbnails and export are adapted to GraphitePad. */

import { toggleTheme } from "@/lib/theme";

type SaveFn = (content: unknown, thumbnail?: string) => Promise<unknown>;
type ExportFn = (filename: string, dataUrl: string) => Promise<{ path?: string }>;

export type SketchEngineApi = {
	destroy: () => void;
	saveNow: (withThumbnail?: boolean) => Promise<void>;
	thumbnail: () => string;
};

export function createSketchEngine(
	root: HTMLElement,
	initial: any,
	callbacks: { onSave: SaveFn; onExport: ExportFn; onSaved?: () => void },
): SketchEngineApi {
	const $ = (id: string) => root.querySelector(`#${id}`) as HTMLElement;
	const stack = $("stack") as HTMLDivElement;
	const gc = $("g") as HTMLCanvasElement;
	const gx = gc.getContext("2d");
	const ring = $("ring") as HTMLDivElement;
	const dpr = Math.max(1, devicePixelRatio || 1);
	const PI = Math.PI;
	let W = innerWidth;
	let H = innerHeight;
	const v = { x: 0, y: 0, z: 1, W, H };
	let rv = { x: 0, y: 0, z: 1 };
	const data = initial && typeof initial === "object" ? initial : {};
	const ds = data.settings ?? {};
	const S: any = {
		tool: "draw",
		brush: ds.brush ?? "pencil",
		color: ds.color ?? "#26262b",
		size: ds.size ?? 3,
		dark: ds.dark ?? 0.75,
		stab: ds.stab ?? 0.44,
		mode: ds.mode ?? "clutch",
		paper: ds.paper ?? "lined",
		persp: ds.persp ?? 0,
		snapP: !!ds.snapP,
		mirror: !!ds.mirror,
		ax: ds.ax ?? 0,
		shader: ds.shader ?? "",
		lx: W / 2,
		ly: H / 2,
		ctrl: false,
		ctrlX: W / 2,
		ctrlY: H / 2,
		clutchLock: !!ds.clutchLock,
		pen: false,
	};
	let layers: any[] = [];
	let refs: any[] = [];
	let hist: any[] = [];
	let redo: any[] = [];
	let act = 0;
	let selRef = -1;
	let vps: any[] = [];
	let D: any = null;
	let curveSt: any = null;
	let pan: any = null;
	let drag: any = null;
	let space = false;
	let tm = 0;
	let st = 0;
	let wheelTs = 0;
	let undoTs = 0;
	let saveLabel = "";
	let ready = false;
	let destroyed = false;
	let saveTimer = 0;
	let thumbTimer = 0;
	let saveChain: Promise<void> = Promise.resolve();

	const h = (t: string, x: string, f?: any, c?: string, ti?: string) => {
		const e = document.createElement(t);
		e.textContent = x;
		if (f) e.onclick = f;
		if (c) e.className = c;
		if (ti) e.title = ti;
		return e;
	};
	const toW = (x: number, y: number) => ({ x: v.x + x / v.z, y: v.y + y / v.z });
	const mk = () => {
		const c = document.createElement("canvas");
		stack.appendChild(c);
		return c;
	};
	const sz = (c: HTMLCanvasElement) => {
		c.width = W * dpr;
		c.height = H * dpr;
		c.style.width = W + "px";
		c.style.height = H + "px";
	};
	const bgc = mk();
	const refc = mk();

	/* paper tooth: deterministic noise drives paper texture and graphite catch */
	const NZ = new Float32Array(65536);
	(() => {
		let s = 7;
		const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
		const raw = new Float32Array(65536);
		for (let i = 0; i < 65536; i++) raw[i] = r();
		for (let y = 0; y < 256; y++)
			for (let x = 0; x < 256; x++) {
				const q =
					raw[y * 256 + x] * 0.6 +
					raw[((y + 1) & 255) * 256 + x] * 0.2 +
					raw[y * 256 + ((x + 1) & 255)] * 0.2;
				NZ[y * 256 + x] = Math.min(1, Math.max(0, (q - 0.2) * 1.5));
			}
		const t = document.createElement("canvas");
		t.width = t.height = 256;
		const c = t.getContext("2d")!;
		const id = c.createImageData(256, 256);
		for (let j = 0; j < 65536; j++) {
			const q = Math.round(255 - NZ[j] * 45);
			id.data[j * 4] = id.data[j * 4 + 1] = id.data[j * 4 + 2] = q;
			id.data[j * 4 + 3] = 255;
		}
		c.putImageData(id, 0, 0);
		($("grain") as HTMLElement).style.backgroundImage = "url(" + t.toDataURL() + ")";
	})();
	const rng = (a: number) => () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};

	function brush(cx: CanvasRenderingContext2D, s: any, vw: any, k: number) {
		const r = rng(s.seed);
		const z = vw.z;
		const w = s.w * z;
		let acc = 1e9;
		const X = (x: number) => (x - vw.x) * z;
		const Y = (y: number) => (y - vw.y) * z;
		return (x0: number, y0: number, p0: number, x1: number, y1: number, p1: number) => {
			const ax = X(x0);
			const ay = Y(y0);
			const bx = X(x1);
			const by = Y(y1);
			const d = Math.hypot(bx - ax, by - ay);
			const t = s.t;
			const m = w * 8;
			if (
				Math.max(ax, bx) < -m ||
				Math.min(ax, bx) > vw.W + m ||
				Math.max(ay, by) < -m ||
				Math.min(ay, by) > vw.H + m
			)
				return;
			if (t == "pen" || t == "erase") {
				cx.globalCompositeOperation = t == "erase" ? "destination-out" : "source-over";
				cx.globalAlpha = t == "erase" ? 1 : Math.min(1, s.d * 1.15);
				cx.strokeStyle = s.c;
				cx.lineCap = "round";
				cx.lineJoin = "round";
				cx.lineWidth = t == "erase" ? w * 4.2 : Math.max(0.45, w * (0.55 + 0.45 * p1));
				cx.beginPath();
				cx.moveTo(ax, ay);
				cx.lineTo(bx, by);
				cx.stroke();
				cx.globalCompositeOperation = "source-over";
				cx.globalAlpha = 1;
				return;
			}
			if (t == "smudge") {
				const rad = Math.max(2, w * 2.6);
				const n = Math.max(1, Math.ceil(d / Math.max(1, rad * 0.35)));
				cx.fillStyle = s.c;
				for (let i = 1; i <= n; i++) {
					const px = ax + (bx - ax) * (i / n);
					const py = ay + (by - ay) * (i / n);
					cx.globalAlpha = s.d * 0.065 * p1;
					cx.beginPath();
					cx.arc(px, py, rad, 0, 6.283);
					cx.fill();
					cx.globalAlpha = s.d * 0.11 * p1;
					cx.beginPath();
					cx.arc(px, py, rad * 0.5, 0, 6.283);
					cx.fill();
				}
				cx.globalAlpha = 1;
				return;
			}
			if (t == "hatch") {
				const g = Math.max(2.8, w * 2.1);
				const L = w * 4.8;
				cx.strokeStyle = s.c;
				cx.lineWidth = Math.max(0.55, w * 0.18);
				cx.lineCap = "round";
				cx.globalAlpha = s.d * (0.5 + 0.5 * p1);
				acc += d;
				while (acc >= g) {
					acc -= g;
					const q = (Math.max(d, 1e-6) - acc) / Math.max(d, 1e-6);
					const x = ax + (bx - ax) * q;
					const y = ay + (by - ay) * q;
					const j = (r() - 0.5) * w * 0.35;
					cx.beginPath();
					cx.moveTo(x - L / 2 + j, y + L / 2 + j);
					cx.lineTo(x + L / 2 + j, y - L / 2 + j);
					cx.stroke();
				}
				cx.globalAlpha = 1;
				return;
			}
			const sh = t == "shade";
			const ch = t == "charcoal";
			const rad = sh ? w * 3.5 : ch ? w * (0.65 + 0.5 * p1) * 1.45 : w * (0.5 + 0.5 * p1) * 1.08;
			const al = sh ? 0.2 : ch ? 0.62 + 0.38 * p1 : 0.46 + 0.54 * p1;
			const step = Math.max(0.5, rad * (sh ? 0.28 : 0.24));
			const n = Math.max(1, Math.ceil(d / step));
			cx.fillStyle = s.c;
			for (let i = 1; i <= n; i++) {
				const px = ax + (bx - ax) * (i / n);
				const py = ay + (by - ay) * (i / n);
				const c = Math.ceil(rad * rad * (sh ? 0.5 : ch ? 1.85 : 1.45)) + 3;
				for (let j = 0; j < c; j++) {
					const a = r() * 6.2832;
					const q = Math.sqrt(r()) * rad;
					const gxx = px + Math.cos(a) * q;
					const gyy = py + Math.sin(a) * q;
					const o = NZ[(((gyy * k) | 0) & 255) * 256 + (((gxx * k) | 0) & 255)];
					const r1 = r();
					const r2 = r();
					if (o < (ch ? 0.15 : 0.22) && r1 < 0.72) continue;
					cx.globalAlpha = Math.min(
						1,
						s.d * al * (0.12 + o * (ch ? 0.62 : 0.5) + r2 * 0.15) * (1 - (q / rad) * 0.45) * 1.55,
					);
					const e = (ch ? 0.7 : 0.55) + r1 * (ch ? 0.85 : 0.68);
					cx.fillRect(gxx, gyy, e, e);
				}
			}
			cx.globalAlpha = 1;
		};
	}

	function drawStroke(cx: CanvasRenderingContext2D, s: any, vw: any, k: number) {
		const p = s.p;
		const b = brush(cx, s, vw, k);
		cx.save();
		cx.setTransform(k, 0, 0, k, 0, 0);
		b(p[0], p[1], p[2], p[0], p[1], p[2]);
		for (let i = 3; i < p.length; i += 3)
			b(p[i - 3], p[i - 2], p[i - 1], p[i], p[i + 1], p[i + 2]);
		cx.restore();
	}
	const seen = (s: any, vw: any) => {
		const q = s.b;
		return q[2] >= vw.x && q[0] <= vw.x + vw.W / vw.z && q[3] >= vw.y && q[1] <= vw.y + vw.H / vw.z;
	};

	function addLayer(n: string) {
		const c = mk();
		sz(c);
		const x = c.getContext("2d")!;
		x.setTransform(dpr, 0, 0, dpr, 0, 0);
		const l = { n, c, x, ops: [] as any[], vis: true, op: 1, blue: false };
		layers.push(l);
		return l;
	}
	function rl(l: any) {
		l.x.setTransform(1, 0, 0, 1, 0, 0);
		l.x.clearRect(0, 0, l.c.width, l.c.height);
		l.x.setTransform(dpr, 0, 0, dpr, 0, 0);
		l.ops.forEach((s: any) => {
			if (seen(s, v)) drawStroke(l.x, s, v, dpr);
		});
	}
	const paperCol = (p: string) => (p == "tan" ? "#d8c7aa" : "#f7f3ea");
	function paperPat(c: CanvasRenderingContext2D, vw: any, p: string) {
		const z = vw.z;
		c.strokeStyle = "rgba(70,110,190,.22)";
		c.fillStyle = "rgba(60,60,70,.35)";
		c.lineWidth = 1;
		if (p == "lined") {
			const g = 32;
			if (g * z < 7) return;
			c.beginPath();
			for (let y = Math.ceil(vw.y / g) * g; (y - vw.y) * z < vw.H; y += g) {
				const q = Math.round((y - vw.y) * z) + 0.5;
				c.moveTo(0, q);
				c.lineTo(vw.W, q);
			}
			c.stroke();
		} else if (p == "grid" || p == "dots") {
			const g = 24;
			if (g * z < 6) return;
			const gr = p == "grid";
			c.beginPath();
			for (let x = Math.ceil(vw.x / g) * g; (x - vw.x) * z < vw.W; x += g) {
				const sx = Math.round((x - vw.x) * z) + 0.5;
				if (gr) {
					c.moveTo(sx, 0);
					c.lineTo(sx, vw.H);
				} else
					for (let y = Math.ceil(vw.y / g) * g; (y - vw.y) * z < vw.H; y += g)
						c.fillRect(sx - 1, (y - vw.y) * z - 1, 2, 2);
			}
			if (gr)
				for (let y = Math.ceil(vw.y / g) * g; (y - vw.y) * z < vw.H; y += g) {
					const q = Math.round((y - vw.y) * z) + 0.5;
					c.moveTo(0, q);
					c.lineTo(vw.W, q);
				}
			c.stroke();
		} else if (p == "iso") {
			const g = 28;
			if (g * z < 8) return;
			c.strokeStyle = "rgba(70,110,190,.16)";
			const hStep = g * z * Math.sin(PI / 3);
			c.beginPath();
			for (let y = Math.ceil(vw.y / (g * Math.sin(PI / 3))) * (g * Math.sin(PI / 3)); (y - vw.y) * z < vw.H; y += g * Math.sin(PI / 3)) {
				const sy = (y - vw.y) * z;
				c.moveTo(0, sy);
				c.lineTo(vw.W, sy);
			}
			const diag = vw.W + vw.H;
			for (let x = -diag; x < diag * 2; x += hStep * 1.1547) {
				c.moveTo(x, 0);
				c.lineTo(x - vw.H * 0.57735, vw.H);
				c.moveTo(x, 0);
				c.lineTo(x + vw.H * 0.57735, vw.H);
			}
			c.stroke();
		}
	}
	function renderBg() {
		const c = bgc.getContext("2d")!;
		c.setTransform(dpr, 0, 0, dpr, 0, 0);
		const pc = paperCol(S.paper);
		stack.style.background = pc;
		c.fillStyle = pc;
		c.fillRect(0, 0, W, H);
		paperPat(c, v, S.paper);
	}
	function renderRefs() {
		const c = refc.getContext("2d")!;
		c.setTransform(dpr, 0, 0, dpr, 0, 0);
		c.clearRect(0, 0, W, H);
		refs.forEach((r) => {
			if (r.vis === false || !r.img) return;
			c.save();
			c.globalAlpha = r.op;
			const cx = (r.x + r.w / 2 - v.x) * v.z;
			const cy = (r.y + r.h / 2 - v.y) * v.z;
			c.translate(cx, cy);
			if (r.rot) c.rotate((r.rot * PI) / 180);
			c.drawImage(r.img, (-r.w * v.z) / 2, (-r.h * v.z) / 2, r.w * v.z, r.h * v.z);
			c.restore();
		});
		c.globalAlpha = 1;
	}
	function renderAll() {
		clearTimeout(tm);
		rv = { x: v.x, y: v.y, z: v.z };
		stack.style.transform = "";
		renderBg();
		renderRefs();
		layers.forEach(rl);
		guides();
	}
	function flush() {
		if (v.x != rv.x || v.y != rv.y || v.z != rv.z) renderAll();
	}
	function vc() {
		stack.style.transform = `translate(${(rv.x - v.x) * v.z}px,${(rv.y - v.y) * v.z}px) scale(${v.z / rv.z})`;
		guides();
		$("zv").textContent = Math.round(v.z * 100) + "%";
		clearTimeout(tm);
		tm = window.setTimeout(() => {
			renderAll();
			scheduleSave();
		}, 110);
	}
	function zoomAt(sx: number, sy: number, f: number) {
		const z = Math.min(512, Math.max(0.005, v.z * f));
		const wx = v.x + sx / v.z;
		const wy = v.y + sy / v.z;
		v.z = z;
		v.x = wx - sx / z;
		v.y = wy - sy / z;
		vc();
	}
	function resize() {
		W = innerWidth;
		H = innerHeight;
		v.W = W;
		v.H = H;
		[...stack.children, gc].forEach((s) => sz(s as HTMLCanvasElement));
		layers.forEach((l) => l.x.setTransform(dpr, 0, 0, dpr, 0, 0));
		renderAll();
	}

	function buildVps() {
		vps = [];
		const n = S.persp;
		if (n && n < 4) {
			const c = toW(W / 2, H / 2);
			const sw = W / v.z;
			const sh = H / v.z;
			vps =
				n == 1
					? [{ x: c.x, y: c.y }]
					: [
							{ x: c.x - 0.38 * sw, y: c.y },
							{ x: c.x + 0.38 * sw, y: c.y },
						];
			if (n == 3) vps.push({ x: c.x, y: c.y + 0.75 * sh });
		}
	}
	function setPersp(n: number) {
		S.persp = n;
		buildVps();
		($("persp") as HTMLSelectElement).value = String(n);
		guides();
		ui();
	}
	function snapDir(a: any, b: any, lockAng?: number) {
		if (S.persp == 4) {
			const ds = [PI / 6, (5 * PI) / 6, PI / 2];
			const th = lockAng != null ? lockAng : Math.atan2(b.y - a.y, b.x - a.x);
			let best = ds[0];
			let bd = 9;
			ds.forEach((d) => {
				const q = (((th - d) % PI) + PI) % PI;
				const e = Math.min(q, PI - q);
				if (e < bd) {
					bd = e;
					best = d;
				}
			});
			const L = (b.x - a.x) * Math.cos(best) + (b.y - a.y) * Math.sin(best);
			return { x: a.x + L * Math.cos(best), y: a.y + L * Math.sin(best), ang: best };
		}
		if (!vps.length) return b;
		const ds = vps.map((p) => Math.atan2(p.y - a.y, p.x - a.x));
		if (S.persp == 1) ds.push(0);
		if (S.persp < 3) ds.push(PI / 2);
		const th = lockAng != null ? lockAng : Math.atan2(b.y - a.y, b.x - a.x);
		let best = ds[0];
		let bd = 9;
		ds.forEach((d) => {
			const q = (((th - d) % PI) + PI) % PI;
			const e = Math.min(q, PI - q);
			if (e < bd) {
				bd = e;
				best = d;
			}
		});
		const L = (b.x - a.x) * Math.cos(best) + (b.y - a.y) * Math.sin(best);
		return { x: a.x + L * Math.cos(best), y: a.y + L * Math.sin(best), ang: best };
	}
	function cons(t: string, a: any, b: any, sh: boolean) {
		if (t == "persp") return snapDir(a, b);
		if (!sh) return b;
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		if (t == "line") {
			const an = Math.round(Math.atan2(dy, dx) / (PI / 12)) * (PI / 12);
			const L = Math.hypot(dx, dy);
			return { x: a.x + L * Math.cos(an), y: a.y + L * Math.sin(an) };
		}
		const m = Math.max(Math.abs(dx), Math.abs(dy));
		return { x: a.x + (dx < 0 ? -m : m), y: a.y + (dy < 0 ? -m : m) };
	}
	function samp(P: any[]) {
		const o: number[] = [];
		for (let i = 0; i < P.length - 1; i++) {
			const a = P[i];
			const b = P[i + 1];
			const n = Math.max(1, Math.ceil((Math.hypot(b.x - a.x, b.y - a.y) * v.z) / 2.5));
			for (let j = i ? 1 : 0; j <= n; j++)
				o.push(a.x + ((b.x - a.x) * j) / n, a.y + ((b.y - a.y) * j) / n);
		}
		return o;
	}
	function curvePts(a: any, b: any, c: any) {
		const d = (Math.hypot(c.x - a.x, c.y - a.y) + Math.hypot(b.x - c.x, b.y - c.y)) * v.z;
		const n = Math.min(600, Math.max(16, Math.ceil(d / 2.5)));
		const o: number[] = [];
		for (let i = 0; i <= n; i++) {
			const u = i / n;
			const u1 = 1 - u;
			o.push(
				u1 * u1 * a.x + 2 * u1 * u * c.x + u * u * b.x,
				u1 * u1 * a.y + 2 * u1 * u * c.y + u * u * b.y,
			);
		}
		return o;
	}
	function shapePts(t: string, a: any, b: any, c?: any) {
		if (t == "curve") return curvePts(a, b, c || { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
		if (t == "line" || t == "persp") return samp([a, b]);
		if (t == "rect") return samp([a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }, a]);
		if (t == "tri") {
			const m = (a.x + b.x) / 2;
			return samp([{ x: m, y: a.y }, b, { x: a.x, y: b.y }, { x: m, y: a.y }]);
		}
		const cx = (a.x + b.x) / 2;
		const cy = (a.y + b.y) / 2;
		const rx = Math.abs(b.x - a.x) / 2;
		const ry = Math.abs(b.y - a.y) / 2;
		const n = Math.min(720, Math.max(24, Math.ceil((2 * PI * Math.max(rx, ry) * v.z) / 2.5)));
		const o: number[] = [];
		for (let i = 0; i <= n; i++) {
			const q = (2 * PI * i) / n;
			o.push(cx + rx * Math.cos(q), cy + ry * Math.sin(q));
		}
		return o;
	}
	function guides() {
		gx.setTransform(dpr, 0, 0, dpr, 0, 0);
		gx.clearRect(0, 0, W, H);
		const sp = (p: any) => [(p.x - v.x) * v.z, (p.y - v.y) * v.z];
		if (S.persp && S.persp < 4 && vps.length) {
			gx.lineWidth = 1;
			gx.strokeStyle = "rgba(60,110,220,.16)";
			const L = (W + H) * 3;
			vps.forEach((p) => {
				const [a, b] = sp(p);
				gx.beginPath();
				for (let i = 0; i < 36; i++) {
					const t = (i * PI) / 36;
					const dx = Math.cos(t) * L;
					const dy = Math.sin(t) * L;
					gx.moveTo(a - dx, b - dy);
					gx.lineTo(a + dx, b + dy);
				}
				gx.stroke();
			});
			gx.strokeStyle = "rgba(60,110,220,.5)";
			gx.beginPath();
			const hy = sp(vps[0])[1];
			gx.moveTo(0, hy);
			gx.lineTo(W, hy);
			gx.stroke();
			vps.forEach((p, i) => {
				const [a, b] = sp(p);
				gx.fillStyle = "rgba(60,110,220,.92)";
				gx.beginPath();
				gx.arc(a, b, 7, 0, 6.3);
				gx.fill();
				gx.fillStyle = "#fff";
				gx.font = "9px system-ui";
				gx.textAlign = "center";
				gx.fillText("V" + (i + 1), a, b + 3);
			});
		} else if (S.persp == 4) {
			gx.lineWidth = 1;
			gx.strokeStyle = "rgba(60,110,220,.14)";
			const step = 48;
			gx.beginPath();
			for (let x = -H; x < W + H; x += step) {
				gx.moveTo(x, 0);
				gx.lineTo(x + H * 1.732, H);
				gx.moveTo(x, 0);
				gx.lineTo(x - H * 1.732, H);
			}
			gx.stroke();
		}
		if (S.mirror) {
			gx.setLineDash([6, 5]);
			gx.strokeStyle = "rgba(200,70,70,.65)";
			gx.beginPath();
			const x = (S.ax - v.x) * v.z;
			gx.moveTo(x, 0);
			gx.lineTo(x, H);
			gx.stroke();
			gx.setLineDash([]);
			gx.fillStyle = "rgba(200,70,70,.85)";
			gx.beginPath();
			gx.arc(x, 48, 5, 0, 6.3);
			gx.fill();
		}
		const stShape = curveSt || (D && D.t != "draw" ? D : null);
		if (stShape) {
			const p = shapePts(stShape.t, stShape.a, stShape.cur, stShape.ctrl);
			gx.strokeStyle = S.color;
			gx.globalAlpha = 0.82;
			gx.lineWidth = Math.max(1.2, S.size * 0.6);
			gx.beginPath();
			for (let i = 0; i < p.length; i += 2) {
				const x = (p[i] - v.x) * v.z;
				const y = (p[i + 1] - v.y) * v.z;
				i ? gx.lineTo(x, y) : gx.moveTo(x, y);
			}
			gx.stroke();
			gx.globalAlpha = 1;
		}
	}

	const mkS = (t: string) => ({
		t,
		c: S.color,
		w: S.size / v.z,
		d: S.dark,
		seed: (Math.random() * 4e9) | 0,
		p: [] as number[],
	});
	function commit(l: any, ss: any[]) {
		ss = ss.filter((s) => s.p.length >= 3);
		ss.forEach((s) => {
			s.p = s.p.map((n: number) => +n.toFixed(2));
			let a = 1e12;
			let b = 1e12;
			let c = -1e12;
			let d = -1e12;
			for (let i = 0; i < s.p.length; i += 3) {
				a = Math.min(a, s.p[i]);
				c = Math.max(c, s.p[i]);
				b = Math.min(b, s.p[i + 1]);
				d = Math.max(d, s.p[i + 1]);
			}
			const m = s.w * 9;
			s.b = [a - m, b - m, c + m, d + m];
			l.ops.push(s);
		});
		if (ss.length) {
			hist.push(ss.map((s) => ({ l, s })));
			redo = [];
			btns();
			scheduleSave();
		}
	}
	function undo() {
		flush();
		undoTs = performance.now();
		S.ctrlX = S.lx;
		S.ctrlY = S.ly;
		if (curveSt) {
			curveSt = null;
			guides();
			info();
			return;
		}
		if (D) {
			if (D.dist > 5) finish();
			else cancelD();
		}
		const g = hist.pop();
		if (!g) return;
		const dirty = new Set<any>();
		g.forEach((o: any) => {
			const i = o.l.ops.indexOf(o.s);
			if (i >= 0) {
				o.l.ops.splice(i, 1);
				dirty.add(o.l);
			}
		});
		redo.push(g);
		dirty.forEach(rl);
		guides();
		btns();
		scheduleSave();
	}
	function redoF() {
		flush();
		undoTs = performance.now();
		S.ctrlX = S.lx;
		S.ctrlY = S.ly;
		if (curveSt) {
			curveSt = null;
			guides();
			info();
		}
		if (D) cancelD();
		const g = redo.pop();
		if (!g) return;
		const dirty = new Set<any>();
		g.forEach((o: any) => {
			o.l.ops.push(o.s);
			dirty.add(o.l);
		});
		hist.push(g);
		dirty.forEach(rl);
		guides();
		btns();
		scheduleSave();
	}
	const btns = () => {
		($("bUndo") as HTMLButtonElement).disabled = !hist.length;
		($("bRedo") as HTMLButtonElement).disabled = !redo.length;
	};

	function cancelD() {
		if (!D) return;
		const l = D.l;
		D = null;
		S.pen = false;
		rl(l);
		guides();
		info();
	}
	function begin(e: any, fromClutch: boolean) {
		flush();
		const l = layers[act];
		if (!l || !l.vis) return;
		const p = toW(e.clientX, e.clientY);
		D = {
			t: S.tool,
			l,
			a: p,
			cur: p,
			sm: p,
			p0: p,
			p1: p,
			m0: p,
			pr: 0.68,
			dist: 0,
			tt: e.timeStamp || performance.now(),
			sh: !!e.shiftKey,
			clutch: !!fromClutch,
			ang: null,
		};
		if (S.tool == "draw") {
			D.ss = [mkS(S.brush)];
			if (S.mirror) D.ss.push(mkS(S.brush));
			D.bs = D.ss.map((s: any) => brush(l.x, s, v, dpr));
			addPt(p.x, p.y, 0.68);
		}
		S.pen = true;
		showRing({ clientX: e.clientX, clientY: e.clientY });
		info();
	}
	function addPt(x: number, y: number, pr: number) {
		D.ss.forEach((s: any, i: number) => {
			const X = i ? 2 * S.ax - x : x;
			const p = s.p;
			const n = p.length;
			const a = n ? [p[n - 3], p[n - 2], p[n - 1]] : [X, y, pr];
			p.push(X, y, pr);
			D.bs[i](a[0], a[1], a[2], X, y, pr);
		});
	}
	function addCurveSeg(m0: any, c1: any, m1: any, pr0: number, pr1: number) {
		const dist = Math.hypot(m1.x - m0.x, m1.y - m0.y) * v.z;
		const steps = Math.min(8, Math.max(1, Math.ceil(dist / 2.2)));
		for (let i = 1; i <= steps; i++) {
			const u = i / steps;
			const u1 = 1 - u;
			const qx = u1 * u1 * m0.x + 2 * u1 * u * c1.x + u * u * m1.x;
			const qy = u1 * u1 * m0.y + 2 * u1 * u * c1.y + u * u * m1.y;
			addPt(qx, qy, pr0 + (pr1 - pr0) * u);
		}
	}
	function mv(e: any) {
		let t = toW(e.clientX, e.clientY);
		D.sh = e.shiftKey;
		if (D.t == "draw") {
			if (S.persp && (S.snapP || e.shiftKey)) {
				const sn = snapDir(D.a, t, D.ang);
				if (D.ang == null && Math.hypot(t.x - D.a.x, t.y - D.a.y) * v.z > 5) D.ang = sn.ang;
				t = { x: sn.x, y: sn.y };
			} else if (!S.persp && e.shiftKey) {
				const dx = t.x - D.a.x;
				const dy = t.y - D.a.y;
				if (D.ang == null && Math.hypot(dx, dy) * v.z > 5)
					D.ang = Math.round(Math.atan2(dy, dx) / (PI / 12)) * (PI / 12);
				if (D.ang != null) {
					const L = dx * Math.cos(D.ang) + dy * Math.sin(D.ang);
					t = { x: D.a.x + L * Math.cos(D.ang), y: D.a.y + L * Math.sin(D.ang) };
				}
			}
			const k = 1 - S.stab * 0.88;
			const sm = D.sm;
			const nx = sm.x + (t.x - sm.x) * k;
			const ny = sm.y + (t.y - sm.y) * k;
			const d = Math.hypot(nx - sm.x, ny - sm.y) * v.z;
			if (d < 0.25) return;
			D.dist += d;
			const now = e.timeStamp || performance.now();
			const dt = Math.max(2, now - D.tt);
			D.tt = now;
			const prPrev = D.pr;
			D.pr += (Math.min(1, Math.max(0.28, 1 - (d / dt) * 0.15)) - D.pr) * 0.26;
			const p2 = { x: nx, y: ny };
			const m1 = { x: (D.p1.x + p2.x) / 2, y: (D.p1.y + p2.y) / 2 };
			addCurveSeg(D.m0, D.p1, m1, prPrev, D.pr);
			D.p0 = D.p1;
			D.p1 = p2;
			D.m0 = m1;
			D.sm = p2;
			D.cur = t;
		} else {
			D.cur = cons(D.t, D.a, t, e.shiftKey);
			D.dist = Math.hypot(D.cur.x - D.a.x, D.cur.y - D.a.y) * v.z;
			if (D.t == "curve") D.ctrl = { x: (D.a.x + D.cur.x) / 2, y: (D.a.y + D.cur.y) / 2 };
			guides();
		}
	}
	function stampShape(l: any, t: string, a: any, b: any, ctrl?: any) {
		const br = S.brush == "erase" ? "pencil" : S.brush;
		const pts = shapePts(t, a, b, ctrl);
		const ss = [mkS(br)];
		if (S.mirror) ss.push(mkS(br));
		ss.forEach((s: any, i: number) => {
			for (let j = 0; j < pts.length; j += 2) s.p.push(i ? 2 * S.ax - pts[j] : pts[j], pts[j + 1], 0.82);
			drawStroke(l.x, s, v, dpr);
		});
		commit(l, ss);
	}
	function finish() {
		if (!D) return;
		const d = D;
		D = null;
		S.pen = false;
		if (d.t == "draw") {
			const rem = Math.hypot(d.cur.x - d.m0.x, d.cur.y - d.m0.y) * v.z;
			if (rem > 0.4 && d.ss[0].p.length > 3) {
				D = d;
				const end = { x: d.m0.x + (d.cur.x - d.m0.x) * 0.65, y: d.m0.y + (d.cur.y - d.m0.y) * 0.65 };
				addCurveSeg(d.m0, d.p1, end, d.pr, Math.max(0.22, d.pr * 0.6));
				D = null;
			}
			commit(d.l, d.ss);
		} else if (Math.hypot(d.cur.x - d.a.x, d.cur.y - d.a.y) * v.z > 3) {
			if (d.t == "curve") {
				curveSt = {
					t: "curve",
					l: d.l,
					a: d.a,
					cur: d.cur,
					ctrl: { x: (d.a.x + d.cur.x) / 2, y: (d.a.y + d.cur.y) / 2 },
				};
				guides();
				info();
				return;
			}
			stampShape(d.l, d.t, d.a, d.cur);
		}
		guides();
		showRing({ clientX: S.lx, clientY: S.ly });
		info();
	}

	const vpHit = (x: number, y: number) =>
		S.persp && S.persp < 4
			? vps.findIndex((p) => Math.hypot((p.x - v.x) * v.z - x, (p.y - v.y) * v.z - y) < 14)
			: -1;
	const mirHit = (x: number) => S.mirror && Math.abs((S.ax - v.x) * v.z - x) < 9;
	const refHit = (p: any) => {
		for (let i = refs.length - 1; i >= 0; i--) {
			const r = refs[i];
			if (r.vis !== false && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return i;
		}
		return -1;
	};
	const isClutchActive = () => S.ctrl || S.clutchLock;
	function focusCanvas() {
		if (document.activeElement && document.activeElement !== document.body && document.activeElement !== gc)
			(document.activeElement as HTMLElement).blur();
		window.focus();
		gc.focus({ preventScroll: true });
	}
	function showRing(e: any) {
		S.lx = e.clientX;
		S.ly = e.clientY;
		if (S.tool == "move") {
			ring.style.display = "none";
			return;
		}
		const r =
			S.size *
			(S.tool != "draw"
				? 0.9
				: S.brush == "erase"
					? 2.1
					: S.brush == "shade"
						? 3.5
						: S.brush == "smudge"
							? 2.6
							: S.brush == "hatch"
								? 1.4
								: S.brush == "charcoal"
									? 1.35
									: 0.9);
		const q = Math.max(3, r);
		ring.style.display = "block";
		ring.style.width = ring.style.height = q * 2 + "px";
		ring.style.left = e.clientX + "px";
		ring.style.top = e.clientY + "px";
		ring.className = isClutchActive() ? "clutch" : D ? "down" : "";
	}

	gc.onpointerenter = () => focusCanvas();
	gc.onpointerdown = (e) => {
		e.preventDefault();
		focusCanvas();
		flush();
		const x = e.clientX;
		const y = e.clientY;
		const p = toW(x, y);
		if (curveSt) {
			stampShape(curveSt.l, "curve", curveSt.a, curveSt.cur, curveSt.ctrl);
			curveSt = null;
			guides();
			info();
			return;
		}
		let hand = e.button == 1 || e.altKey || (space && S.mode != "flow");
		if (!hand && S.persp) {
			const i = vpHit(x, y);
			if (i >= 0) {
				drag = { vp: i };
				gc.setPointerCapture(e.pointerId);
				return;
			}
		}
		if (!hand && mirHit(x)) {
			drag = { mir: true };
			gc.setPointerCapture(e.pointerId);
			return;
		}
		if (!hand && S.tool == "move") {
			const i = refHit(p);
			if (i >= 0) {
				selRef = i;
				drag = { ref: i, lx: x, ly: y };
				gc.setPointerCapture(e.pointerId);
				ui();
				return;
			}
			hand = true;
		}
		if (hand) {
			pan = { sx: x, sy: y, x: v.x, y: v.y };
			gc.setPointerCapture(e.pointerId);
			gc.style.cursor = "grabbing";
			return;
		}
		if (S.mode != "flow") {
			gc.setPointerCapture(e.pointerId);
			if (D) finish();
			begin(e, false);
		} else if (D) finish();
		else begin(e, false);
		showRing(e);
	};

	gc.onpointermove = (e) => {
		const prevX = S.lx;
		const prevY = S.ly;
		showRing(e);
		if (pan) {
			v.x = pan.x - (e.clientX - pan.sx) / v.z;
			v.y = pan.y - (e.clientY - pan.sy) / v.z;
			vc();
			return;
		}
		if (drag) {
			if (drag.vp != null) {
				const p = toW(e.clientX, e.clientY);
				vps[drag.vp].x = p.x;
				vps[drag.vp].y = p.y;
				guides();
			} else if (drag.mir) {
				S.ax = toW(e.clientX, e.clientY).x;
				guides();
			} else {
				const r = refs[drag.ref];
				r.x += (e.clientX - drag.lx) / v.z;
				r.y += (e.clientY - drag.ly) / v.z;
				drag.lx = e.clientX;
				drag.ly = e.clientY;
				renderRefs();
			}
			return;
		}
		if (curveSt) {
			const p = toW(e.clientX, e.clientY);
			const m = { x: (curveSt.a.x + curveSt.cur.x) / 2, y: (curveSt.a.y + curveSt.cur.y) / 2 };
			curveSt.ctrl = { x: 2 * p.x - m.x, y: 2 * p.y - m.y };
			guides();
			return;
		}
		const now = performance.now();
		const clutchNow =
			(S.ctrl || S.clutchLock || (e.ctrlKey && S.mode == "clutch")) &&
			now - wheelTs > 180 &&
			now - undoTs > 260 &&
			S.tool != "move";
		if (clutchNow && !D) {
			if (S.clutchLock || Math.hypot(e.clientX - S.ctrlX, e.clientY - S.ctrlY) > 1.8)
				begin({ clientX: prevX || e.clientX, clientY: prevY || e.clientY, shiftKey: e.shiftKey, timeStamp: e.timeStamp }, true);
		} else if (!clutchNow && D && D.clutch) {
			finish();
			return;
		}
		if (D) {
			const l = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
			(l.length ? l : [e]).forEach(mv);
		}
	};

	const up = (e: any) => {
		if (pan) {
			pan = null;
			gc.style.cursor = S.tool == "move" ? "grab" : "none";
			return;
		}
		if (drag) {
			drag = null;
			scheduleSave();
			return;
		}
		if (D && !D.clutch && S.mode != "flow") finish();
	};
	gc.onpointerup = up;
	gc.onpointercancel = up;
	gc.onpointerleave = () => {
		ring.style.display = "none";
		if (D && (S.mode == "flow" || D.clutch)) finish();
	};
	gc.oncontextmenu = (e) => e.preventDefault();
	gc.addEventListener(
		"wheel",
		(e) => {
			e.preventDefault();
			wheelTs = performance.now();
			if (D && D.clutch && D.dist <= 5) cancelD();
			if (e.ctrlKey || e.metaKey)
				zoomAt(
					e.clientX,
					e.clientY,
					Math.exp(-Math.max(-30, Math.min(30, e.deltaY)) * (e.deltaMode ? 0.05 : 0.01)),
				);
			else {
				v.x += (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) / v.z;
				v.y += (e.shiftKey && !e.deltaX ? 0 : e.deltaY) / v.z;
				vc();
			}
		},
		{ passive: false },
	);

	const KEYS: any = {
		p: ["b", "pencil"],
		c: ["b", "charcoal"],
		n: ["b", "pen"],
		s: ["b", "shade"],
		h: ["b", "hatch"],
		b: ["b", "smudge"],
		e: ["b", "erase"],
		l: ["t", "line"],
		u: ["t", "curve"],
		r: ["t", "rect"],
		o: ["t", "ell"],
		t: ["t", "tri"],
		g: ["t", "persp"],
		v: ["t", "move"],
		m: ["t", "move"],
	};
	const isTyping = (e: KeyboardEvent) => {
		const el = e.target as HTMLElement | null;
		const tag = el?.tagName;
		if (tag === "TEXTAREA" || tag === "SELECT") return true;
		if (tag === "INPUT") {
			const type = (el as HTMLInputElement).type;
			return type !== "range" && type !== "color" && type !== "checkbox";
		}
		return false;
	};
	const onKeyDown = (e: KeyboardEvent) => {
		if (isTyping(e) && e.key !== "Escape") return;
		const k = (e.key || "").toLowerCase();
		const code = e.code || "";
		if ((e.metaKey || e.ctrlKey) && (k == "z" || k == "y" || code == "KeyZ" || code == "KeyY")) {
			e.preventDefault();
			e.stopPropagation();
			if (document.activeElement && document.activeElement !== gc)
				(document.activeElement as HTMLElement).blur();
			k == "y" || code == "KeyY" || e.shiftKey ? redoF() : undo();
			return;
		}
		if (e.key == "Control") {
			if (!S.ctrl) {
				S.ctrl = true;
				S.ctrlX = S.lx;
				S.ctrlY = S.ly;
				showRing({ clientX: S.lx, clientY: S.ly });
				ui();
			}
			return;
		}
		if (e.key == "Escape") {
			if (curveSt) {
				curveSt = null;
				guides();
				info();
			}
			if (D) cancelD();
			S.clutchLock = false;
			ui();
			return;
		}
		if (code == "Space") {
			e.preventDefault();
			if (document.activeElement && document.activeElement !== gc)
				(document.activeElement as HTMLElement).blur();
			if (e.repeat) return;
			if (curveSt) {
				stampShape(curveSt.l, "curve", curveSt.a, curveSt.cur, curveSt.ctrl);
				curveSt = null;
				guides();
				info();
				return;
			}
			if (S.mode == "flow") {
				D ? finish() : begin({ clientX: S.lx, clientY: S.ly }, false);
			} else space = true;
			return;
		}
		if (e.metaKey || e.ctrlKey || e.altKey) return;
		if (KEYS[k]) pick(...KEYS[k]);
		else if (k == "z" || code == "KeyZ") undo();
		else if (k == "y" || code == "KeyY") redoF();
		else if (k == "[" || k == "]") {
			($("size") as HTMLInputElement).value = String(
				Math.max(0.5, Math.min(28, +($("size") as HTMLInputElement).value + (k == "]" ? 0.5 : -0.5))),
			);
			S.size = +($("size") as HTMLInputElement).value;
			showRing({ clientX: S.lx, clientY: S.ly });
			scheduleSave();
		} else if (k == "+" || k == "=") zoomAt(W / 2, H / 2, 1.25);
		else if (k == "-") zoomAt(W / 2, H / 2, 0.8);
		else if (k == "0") fit();
	};
	const onKeyUp = (e: KeyboardEvent) => {
		if (e.key == "Control") {
			S.ctrl = false;
			if (D && D.clutch) {
				if (curveSt) {
					stampShape(curveSt.l, "curve", curveSt.a, curveSt.cur, curveSt.ctrl);
					curveSt = null;
				} else finish();
			}
			showRing({ clientX: S.lx, clientY: S.ly });
			ui();
		}
		if (e.code == "Space") space = false;
	};
	const onBlur = () => {
		S.ctrl = false;
		space = false;
		if (D && D.clutch) finish();
		ui();
	};
	window.addEventListener("keydown", onKeyDown, true);
	window.addEventListener("keyup", onKeyUp, true);
	window.addEventListener("blur", onBlur);

	/* UI */
	function pick(k: string, t: string) {
		finish();
		curveSt = null;
		if (k == "b") {
			S.brush = t;
			S.tool = "draw";
		} else {
			S.tool = t;
			if (t == "persp" && !S.persp) setPersp(2);
		}
		gc.style.cursor = S.tool == "move" ? "grab" : "none";
		guides();
		ui();
		scheduleSave();
	}
	[
		["b", "pencil", "Pencil", "Pencil (P) — graphite on paper tooth"],
		["b", "charcoal", "Charcoal", "Soft 6B Charcoal (C) — deep rich grain"],
		["b", "pen", "Ink pen", "Technical Ink Pen (N) — crisp tapered line"],
		["b", "shade", "Shade", "Tilted Lead Shade (S) — broad paper-tooth wash"],
		["b", "hatch", "Hatch", "Cross-Hatch (H) — directional hatch ticks"],
		["b", "smudge", "Blend", "Soft Tonal Blend (B) — feathered shading"],
		["b", "erase", "Eraser", "Eraser (E)"],
		["sep"],
		["t", "line", "Line", "Straight Line (L) — hold Shift to snap angles"],
		["t", "curve", "Curve", "Bendable Curve (U) — drag line, then move & click to bend"],
		["t", "rect", "Rect", "Rectangle (R) — hold Shift for square"],
		["t", "ell", "Oval", "Oval / Circle (O) — hold Shift for circle"],
		["t", "tri", "Triangle", "Triangle (T)"],
		["t", "persp", "Persp line", "Perspective Line (G) — locks to vanishing points"],
		["t", "move", "Move / ref", "Move Reference Image or Pan Canvas (V)"],
	].forEach((a: any) => {
		if (a[0] == "sep") {
			const d = document.createElement("div");
			d.className = "sep";
			$("rail").append(d);
			return;
		}
		const b = h("button", a[2], () => pick(a[0], a[1]), "", a[3]);
		b.dataset.k = a[0];
		b.dataset.t = a[1];
		$("rail").append(b);
	});

	["#26262b", "#524b42", "#3b5b9a", "#b23a3a", "#2f7a52", "#8a5a2b"].forEach((c) => {
		const b = h("button", "", () => {
			S.color = c;
			($("col") as HTMLInputElement).value = c;
			pick("b", S.brush == "erase" ? "pencil" : S.brush);
			ui();
		}, "sw");
		b.style.background = c;
		b.dataset.c = c;
		$("sw").append(b);
	});
	($("col") as HTMLInputElement).oninput = (e) => {
		S.color = (e.target as HTMLInputElement).value;
		ui();
		scheduleSave();
	};
	($("size") as HTMLInputElement).oninput = (e) => {
		S.size = +(e.target as HTMLInputElement).value;
		scheduleSave();
	};
	($("dark") as HTMLInputElement).oninput = (e) => {
		S.dark = +(e.target as HTMLInputElement).value;
		scheduleSave();
	};
	($("stab") as HTMLInputElement).oninput = (e) => {
		S.stab = +(e.target as HTMLInputElement).value;
		scheduleSave();
	};
	($("mode") as HTMLSelectElement).onchange = (e) => {
		finish();
		S.mode = (e.target as HTMLSelectElement).value;
		info();
		scheduleSave();
	};
	($("clutchBtn") as HTMLButtonElement).onclick = () => {
		S.clutchLock = !S.clutchLock;
		if (!S.clutchLock && D && D.clutch) finish();
		ui();
		scheduleSave();
	};
	($("paper") as HTMLSelectElement).onchange = (e) => {
		S.paper = (e.target as HTMLSelectElement).value;
		renderBg();
		scheduleSave();
	};
	($("persp") as HTMLSelectElement).onchange = (e) => {
		setPersp(+(e.target as HTMLSelectElement).value);
		scheduleSave();
	};
	($("snapP") as HTMLButtonElement).onclick = () => {
		S.snapP = !S.snapP;
		if (S.snapP && !S.persp) setPersp(2);
		ui();
		scheduleSave();
	};
	($("mir") as HTMLButtonElement).onclick = () => {
		S.mirror = !S.mirror;
		S.ax = toW(W / 2, 0).x;
		guides();
		ui();
		scheduleSave();
	};
	($("shader") as HTMLSelectElement).onchange = (e) => {
		S.shader = (e.target as HTMLSelectElement).value;
		stack.style.filter = S.shader;
		scheduleSave();
	};
	($("zo") as HTMLButtonElement).onclick = () => zoomAt(W / 2, H / 2, 0.8);
	($("zi") as HTMLButtonElement).onclick = () => zoomAt(W / 2, H / 2, 1.25);
	($("zv") as HTMLButtonElement).onclick = () => zoomAt(W / 2, H / 2, 1 / v.z);
	($("fit") as HTMLButtonElement).onclick = fit;
	($("bUndo") as HTMLButtonElement).onclick = undo;
	($("bRedo") as HTMLButtonElement).onclick = redoF;
	($("themeBtn") as HTMLButtonElement).onclick = () => toggleTheme();

	($("clean") as HTMLButtonElement).onclick = () => {
		const cur = layers[act];
		cur.op = 0.25;
		cur.blue = true;
		let nextIdx = layers.findIndex((l, i) => i > act && l.ops.length == 0);
		if (nextIdx < 0) {
			addLayer("Clean " + layers.length);
			nextIdx = layers.length - 1;
		}
		act = nextIdx;
		layers[act].vis = true;
		layers[act].op = 1;
		layers[act].blue = false;
		pick("b", "pen");
		scheduleSave();
	};

	($("addL") as HTMLButtonElement).onclick = () => {
		addLayer("Layer " + (layers.length + 1));
		act = layers.length - 1;
		ui();
		scheduleSave();
	};
	($("mergeL") as HTMLButtonElement).onclick = () => {
		if (act <= 0) return;
		const top = layers[act];
		const bot = layers[act - 1];
		top.ops.forEach((s: any) => {
			bot.ops.push(s);
			hist.forEach((g) => g.forEach((o: any) => { if (o.l === top) o.l = bot; }));
			redo.forEach((g) => g.forEach((o: any) => { if (o.l === top) o.l = bot; }));
		});
		top.c.remove();
		layers.splice(act, 1);
		act--;
		rl(bot);
		ui();
		scheduleSave();
	};
	($("clr") as HTMLButtonElement).onclick = () => {
		const l = layers[act];
		hist = hist.filter((g) => g[0].l != l);
		redo = redo.filter((g) => g[0].l != l);
		l.ops = [];
		rl(l);
		btns();
		scheduleSave();
	};
	($("lop") as HTMLInputElement).oninput = (e) => {
		layers[act].op = +(e.target as HTMLInputElement).value;
		layers[act].c.style.opacity = layers[act].op;
		scheduleSave();
	};
	($("clrRef") as HTMLButtonElement).onclick = () => {
		refs = [];
		selRef = -1;
		renderRefs();
		ui();
		scheduleSave();
	};
	($("rop") as HTMLInputElement).oninput = (e) => {
		if (refs[selRef]) {
			refs[selRef].op = +(e.target as HTMLInputElement).value;
			renderRefs();
			scheduleSave();
		}
	};
	($("rsc") as HTMLInputElement).oninput = (e) => {
		const r = refs[selRef];
		if (!r) return;
		const cx = r.x + r.w / 2;
		const cy = r.y + r.h / 2;
		const k = r.h / r.w;
		r.w = (r.base * +(e.target as HTMLInputElement).value) / 100;
		r.h = r.w * k;
		r.x = cx - r.w / 2;
		r.y = cy - r.h / 2;
		renderRefs();
		scheduleSave();
	};
	($("rrot") as HTMLInputElement).oninput = (e) => {
		const r = refs[selRef];
		if (!r) return;
		r.rot = +(e.target as HTMLInputElement).value;
		renderRefs();
		scheduleSave();
	};
	root.addEventListener("change", (e) => {
		if ((e.target as HTMLElement).closest("#bar,#panel")) (e.target as HTMLElement).blur();
	});

	function delL(i: number) {
		if (layers.length < 2) return;
		const l = layers[i];
		l.c.remove();
		layers.splice(i, 1);
		hist = hist.filter((g) => g[0].l != l);
		redo = redo.filter((g) => g[0].l != l);
		act = Math.min(act, layers.length - 1);
		ui();
		scheduleSave();
	}
	function ui() {
		const ll = $("ll");
		ll.innerHTML = "";
		for (let i = layers.length - 1; i >= 0; i--) {
			const l = layers[i];
			const r = h("div", "", null, "row" + (i == act ? " on" : ""));
			r.append(
				h("button", l.vis ? "●" : "○", () => { l.vis = !l.vis; ui(); scheduleSave(); }, "mini", "Show / hide layer"),
				h("button", l.n, () => { act = i; ui(); }, "nm", "Select layer"),
				h("button", "B", () => { l.blue = !l.blue; ui(); scheduleSave(); }, "mini" + (l.blue ? " on" : ""), "Toggle non-photo blue rough sketch tint"),
				h("button", "✕", () => delL(i), "mini", "Delete layer"),
			);
			ll.append(r);
		}
		layers.forEach((l) => {
			l.c.style.display = l.vis ? "" : "none";
			l.c.style.opacity = l.op;
			l.c.classList.toggle("blue", !!l.blue);
		});
		if (layers[act]) ($("lop") as HTMLInputElement).value = layers[act].op;
		($("mergeL") as HTMLButtonElement).disabled = act <= 0;

		const rlist = $("rl");
		rlist.innerHTML = "";
		refs.forEach((r, i) => {
			const e = h("div", "", null, "row" + (i == selRef ? " on" : ""));
			e.append(
				h("button", r.vis === false ? "○" : "●", () => { r.vis = r.vis === false; renderRefs(); ui(); scheduleSave(); }, "mini", "Show / hide reference"),
				h("button", "Image " + (i + 1), () => { selRef = i; ui(); }, "nm", "Select reference"),
				h("button", "✕", () => { refs.splice(i, 1); selRef = Math.min(selRef, refs.length - 1); renderRefs(); ui(); scheduleSave(); }, "mini", "Remove reference"),
			);
			rlist.append(e);
		});
		const sr = refs[selRef];
		($("rop") as HTMLInputElement).disabled = ($("rsc") as HTMLInputElement).disabled = ($("rrot") as HTMLInputElement).disabled = !sr;
		($("clrRef") as HTMLButtonElement).disabled = !refs.length;
		if (sr) {
			($("rop") as HTMLInputElement).value = String(sr.op);
			($("rsc") as HTMLInputElement).value = String(Math.round((sr.w / sr.base) * 100));
			($("rrot") as HTMLInputElement).value = String(sr.rot || 0);
		}
		root.querySelectorAll("#rail button").forEach((b: any) => {
			b.classList.toggle("on", b.dataset.k == "b" ? S.tool == "draw" && S.brush == b.dataset.t : S.tool == b.dataset.t);
		});
		root.querySelectorAll("#sw .sw").forEach((b: any) => b.classList.toggle("on", b.dataset.c == S.color));
		($("mir") as HTMLButtonElement).classList.toggle("on", S.mirror);
		($("snapP") as HTMLButtonElement).classList.toggle("on", S.snapP);
		($("clutchBtn") as HTMLButtonElement).classList.toggle("clutch-on", isClutchActive());
		($("clutchBtn") as HTMLButtonElement).textContent = S.clutchLock ? "Clutch: LOCKED" : S.ctrl ? "Clutch: DRAWING" : "Ctrl Clutch";
		btns();
		info();
	}

	function info() {
		const n = {
			draw: { pencil: "Pencil", charcoal: "Charcoal 6B", pen: "Ink pen", shade: "Shade", hatch: "Hatch", smudge: "Blend", erase: "Eraser" }[S.brush],
			line: "Line",
			curve: curveSt ? "Curve (move & click to set arc)" : "Curve",
			rect: "Rectangle",
			ell: "Oval",
			tri: "Triangle",
			persp: "Perspective line",
			move: "Move: drag images, or pan",
		}[S.tool];
		const cl = isClutchActive
			? '<b class="cl">CTRL CLUTCH ON (glide finger to draw, release Ctrl to lift)</b>'
			: 'hold <b>Ctrl</b> + move finger to auto-draw';
		const saveTxt = saveLabel ? ` · <b>${saveLabel}</b>` : "";
		$("status").innerHTML =
			"<b>" +
			n +
			"</b> · " +
			(S.mode == "flow"
				? (S.pen ? "<b>pen DOWN</b>" : "pen UP") + " · click or Space lifts/lowers"
				: cl + " · or drag") +
			" · Ctrl+Z undo · 2-finger scroll pans · pinch zooms" +
			saveTxt;
	}

	/* references */
	function addImg(src: string) {
		const im = new Image();
		im.onload = () => {
			if (destroyed) return;
			const c = toW(W / 2, H / 2);
			const w = Math.min(im.width, (W * 0.68) / v.z);
			const r: any = { img: im, src, w, h: (im.height * w) / im.width, base: w, op: 0.35, rot: 0, vis: true };
			r.x = c.x - r.w / 2;
			r.y = c.y - r.h / 2;
			refs.push(r);
			selRef = refs.length - 1;
			renderRefs();
			ui();
			scheduleSave();
		};
		im.src = src;
	}
	const getF = (fs: FileList | File[]) => {
		for (const f of Array.from(fs)) {
			if (!/^image\//.test(f.type)) continue;
			if (f.size > 14 * 1024 * 1024) continue;
			const reader = new FileReader();
			reader.onload = () => addImg(String(reader.result));
			reader.readAsDataURL(f);
		}
	};
	($("img") as HTMLButtonElement).onclick = () => ($("file") as HTMLInputElement).click();
	($("file") as HTMLInputElement).onchange = (e) => {
		const input = e.target as HTMLInputElement;
		if (input.files) getF(input.files);
		input.value = "";
	};
	const onDragOver = (e: DragEvent) => e.preventDefault();
	const onDrop = (e: DragEvent) => {
		e.preventDefault();
		if (e.dataTransfer?.files) getF(e.dataTransfer.files);
	};
	const onPaste = (e: ClipboardEvent) => {
		const items = [...(e.clipboardData?.items || [])].map((i) => i.getAsFile()).filter(Boolean) as File[];
		getF(items);
	};
	window.addEventListener("dragover", onDragOver);
	window.addEventListener("drop", onDrop);
	window.addEventListener("paste", onPaste);

	/* fit, export, autosave */
	function bounds() {
		let a = 1e12;
		let b = 1e12;
		let c = -1e12;
		let d = -1e12;
		layers.forEach((l) => {
			if (!l.vis) return;
			l.ops.forEach((s: any) => {
				a = Math.min(a, s.b[0]);
				b = Math.min(b, s.b[1]);
				c = Math.max(c, s.b[2]);
				d = Math.max(d, s.b[3]);
			});
		});
		return a > c ? null : [a, b, c, d];
	}
	function fit() {
		const q = bounds();
		if (!q) {
			v.z = 1;
			v.x = -W / 2;
			v.y = -H / 2;
		} else {
			const z = Math.min(16, (0.88 * Math.min(W / (q[2] - q[0] || 1), H / (q[3] - q[1] || 1))));
			v.z = z;
			v.x = (q[0] + q[2]) / 2 - W / 2 / z;
			v.y = (q[1] + q[3]) / 2 - H / 2 / z;
		}
		renderAll();
		$("zv").textContent = Math.round(v.z * 100) + "%";
		scheduleSave();
	}
	function renderArtwork(maxW: number, maxH: number, thumb: boolean) {
		const q = bounds() || [v.x, v.y, v.x + W / v.z, v.y + H / v.z];
		const m = thumb ? 48 : 40;
		const bw = q[2] - q[0] + 2 * m;
		const bh = q[3] - q[1] + 2 * m;
		let z = Math.min(3, maxW / Math.max(bw, 1), maxH / Math.max(bh, 1));
		if (!thumb) z = Math.min(3, 4096 / Math.max(bw, bh, 1));
		const cw = thumb ? maxW : Math.ceil(bw * z);
		const ch = thumb ? maxH : Math.ceil(bh * z);
		const o = document.createElement("canvas");
		o.width = Math.max(1, cw);
		o.height = Math.max(1, ch);
		const c = o.getContext("2d")!;
		const drawZ = thumb ? Math.min(cw / bw, ch / bh) : z;
		const offX = thumb ? (cw - bw * drawZ) / 2 : 0;
		const offY = thumb ? (ch - bh * drawZ) / 2 : 0;
		const vw = { x: q[0] - m - offX / drawZ, y: q[1] - m - offY / drawZ, z: drawZ, W: o.width, H: o.height };
		c.fillStyle = paperCol(S.paper);
		c.fillRect(0, 0, o.width, o.height);
		paperPat(c, vw, S.paper);
		layers.forEach((l) => {
			if (!l.vis) return;
			const t = document.createElement("canvas");
			t.width = o.width;
			t.height = o.height;
			const tc = t.getContext("2d")!;
			l.ops.forEach((s: any) => drawStroke(tc, s, vw, 1));
			c.save();
			c.globalAlpha = l.op;
			if (l.blue) c.filter = "sepia(1) hue-rotate(178deg) saturate(3.2) brightness(1.06)";
			c.drawImage(t, 0, 0);
			c.restore();
		});
		if (S.shader) {
			const f = document.createElement("canvas");
			f.width = o.width;
			f.height = o.height;
			const fc = f.getContext("2d")!;
			fc.filter = S.shader;
			fc.drawImage(o, 0, 0);
			return f;
		}
		return o;
	}
	function thumbnail() {
		return renderArtwork(480, 360, true).toDataURL("image/png");
	}
	async function doExport() {
		const c = renderArtwork(4096, 4096, false);
		const dataUrl = c.toDataURL("image/png");
		return callbacks.onExport("sketch.png", dataUrl);
	}
	($("save") as HTMLButtonElement).onclick = () => {
		void doExport()
			.then((res) => callbacks.onSaved?.())
			.catch(() => undefined);
	};

	function serialize() {
		return {
			kind: "sketch",
			version: 1,
			settings: {
				brush: S.brush,
				color: S.color,
				size: S.size,
				dark: S.dark,
				stab: S.stab,
				mode: S.mode,
				paper: S.paper,
				persp: S.persp,
				snapP: S.snapP,
				mirror: S.mirror,
				ax: S.ax,
				shader: S.shader,
				clutchLock: S.clutchLock,
			},
			layers: layers.map((l) => ({ name: l.n, vis: l.vis, op: l.op, blue: !!l.blue, ops: l.ops })),
			active: act,
			refs: refs.map((r) => ({ src: r.src, x: r.x, y: r.y, w: r.w, h: r.h, base: r.base, op: r.op, rot: r.rot || 0, vis: r.vis !== false })),
			view: { cx: v.x + W / 2 / v.z, cy: v.y + H / 2 / v.z, z: v.z },
		};
	}
	async function saveNow(withThumbnail = false) {
		if (!ready || destroyed) return;
		clearTimeout(saveTimer);
		const run = saveChain.then(async () => {
			saveLabel = "Saving…";
			info();
			try {
				const thumb = withThumbnail ? thumbnail() : undefined;
				await callbacks.onSave(serialize(), thumb);
				saveLabel = "Saved";
				info();
				callbacks.onSaved?.();
			} catch (e) {
				saveLabel = "Save failed";
				info();
				console.error(e);
			}
		});
		saveChain = run.catch(() => undefined);
		await run;
	}
	function scheduleSave() {
		if (!ready || destroyed) return;
		clearTimeout(saveTimer);
		saveTimer = window.setTimeout(() => void saveNow(false), 700) as unknown as number;
		clearTimeout(thumbTimer);
		thumbTimer = window.setTimeout(() => void saveNow(true), 5000) as unknown as number;
	}

	/* load */
	v.x = -W / 2;
	v.y = -H / 2;
	const srcLayers = Array.isArray(data.layers) && data.layers.length ? data.layers : [
		{ name: "Rough", vis: true, op: 1, blue: false, ops: [] },
		{ name: "Clean", vis: true, op: 1, blue: false, ops: [] },
	];
	srcLayers.forEach((o: any) => {
		const l = addLayer(o.name || "Layer");
		l.vis = o.vis !== false;
		l.op = typeof o.op === "number" ? o.op : 1;
		l.blue = !!o.blue;
		l.ops = Array.isArray(o.ops) ? o.ops : [];
	});
	act = Math.min(Math.max(0, data.active | 0), layers.length - 1);
	if (data.view && data.view.z) {
		v.z = data.view.z;
		v.x = data.view.cx - W / 2 / v.z;
		v.y = data.view.cy - H / 2 / v.z;
	} else {
		v.z = 1;
		v.x = -W / 2;
		v.y = -H / 2;
	}
	if (S.mirror) S.ax = data.settings?.ax ?? toW(W / 2, 0).x;
	buildVps();
	if (Array.isArray(data.refs)) {
		data.refs.forEach((r: any) => {
			const im = new Image();
			const ref: any = { ...r, img: im, h: r.h ?? 100, w: r.w ?? 100, base: r.base ?? r.w ?? 100, op: r.op ?? 0.35, rot: r.rot ?? 0 };
			im.onload = () => {
				if (!destroyed) renderRefs();
			};
			im.src = r.src;
			refs.push(ref);
		});
	}

	addEventListener("resize", resize);
	resize();
	stack.style.filter = S.shader || "";
	($("col") as HTMLInputElement).value = S.color;
	($("size") as HTMLInputElement).value = String(S.size);
	($("dark") as HTMLInputElement).value = String(S.dark);
	($("stab") as HTMLInputElement).value = String(S.stab);
	($("mode") as HTMLSelectElement).value = S.mode;
	($("paper") as HTMLSelectElement).value = S.paper;
	($("persp") as HTMLSelectElement).value = String(S.persp);
	($("shader") as HTMLSelectElement).value = S.shader;
	ui();
	$("zv").textContent = Math.round(v.z * 100) + "%";
	ready = true;
	if (!bounds()) {
		// Keep the default view centered on the paper origin for a new piece.
		v.x = -W / 2;
		v.y = -H / 2;
		renderAll();
	}

	return {
		destroy() {
			destroyed = true;
			clearTimeout(saveTimer);
			clearTimeout(thumbTimer);
			clearTimeout(tm);
			clearTimeout(st);

			removeEventListener("resize", resize);
			window.removeEventListener("keydown", onKeyDown, true);
			window.removeEventListener("keyup", onKeyUp, true);
			window.removeEventListener("blur", onBlur);
			window.removeEventListener("dragover", onDragOver);
			window.removeEventListener("drop", onDrop);
			window.removeEventListener("paste", onPaste);
			gc.onpointerenter = null;
			gc.onpointerdown = null;
			gc.onpointermove = null;
			gc.onpointerup = null;
			gc.onpointercancel = null;
			gc.onpointerleave = null;
			gc.oncontextmenu = null;
			refs.forEach((r) => {
				if (r.img) r.img.src = "";
			});
		},
		saveNow,
		thumbnail,
	};
}
