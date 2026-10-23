import { join, normalize, resolve, extname, sep } from "node:path";
import { PATHS } from "electrobun/main";
import {
	deleteArtFile,
	exportPng,
	loadArt,
	loadLibrary,
	openDataFolder,
	readThumb,
	revealPath,
	saveArt,
	saveLibrary,
} from "./storage";

type ServerOptions = {
	token: string;
	setWindowTitle: (title: string) => void;
};

const json = (value: unknown, status = 200, extra?: HeadersInit) =>
	new Response(JSON.stringify(value), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-store",
			...extra,
		},
	});

const corsHeaders = (origin: string | null): HeadersInit => {
	const allow =
		origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
			? origin
			: "";
	return {
		"Access-Control-Allow-Origin": allow,
		"Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, X-GraphitePad-Token",
		"Access-Control-Max-Age": "86400",
		Vary: "Origin",
	};
};

function parseDataUrl(dataUrl: unknown) {
	if (typeof dataUrl !== "string") return null;
	const comma = dataUrl.indexOf(",");
	if (comma < 0) return null;
	return dataUrl.slice(comma + 1);
}

async function handleApi(req: Request, url: URL, opts: ServerOptions) {
	const origin = req.headers.get("origin");
	const cors = corsHeaders(origin);
	if (req.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: cors });
	}
	const token = req.headers.get("x-graphitepad-token") ?? url.searchParams.get("token");
	if (token !== opts.token) {
		return json({ ok: false, error: "Unauthorized" }, 401, cors);
	}

	const path = url.pathname;
	try {
		if (path === "/api/ping") {
			return json({ ok: true, app: "GraphitePad" }, 200, cors);
		}
		if (path === "/api/library" && req.method === "GET") {
			return json(await loadLibrary(), 200, cors);
		}
		if (path === "/api/library" && req.method === "PUT") {
			const body = (await req.json()) as { version?: number };
			if (!body || body.version !== 1) throw new Error("Invalid library");
			await saveLibrary(body as never);
			return json({ ok: true }, 200, cors);
		}
		const artMatch = path.match(/^\/api\/art\/([^/]+)$/);
		if (artMatch && req.method === "GET") {
			const art = await loadArt(decodeURIComponent(artMatch[1]));
			return json(art, 200, cors);
		}
		if (artMatch && req.method === "PUT") {
			const id = decodeURIComponent(artMatch[1]);
			const body = (await req.json()) as {
				content?: unknown;
				thumbnail?: string;
			};
			if (!body?.content) throw new Error("Missing artwork content");
			const result = await saveArt(id, body.content, body.thumbnail);
			return json(result, 200, cors);
		}
		if (artMatch && req.method === "DELETE") {
			const id = decodeURIComponent(artMatch[1]);
			await deleteArtFile(id);
			return json({ ok: true }, 200, cors);
		}
		const thumbMatch = path.match(/^\/api\/thumb\/([^/]+)$/);
		if (thumbMatch && req.method === "GET") {
			const data = await readThumb(decodeURIComponent(thumbMatch[1]));
			if (!data) return new Response("Not found", { status: 404, headers: cors });
			return new Response(data, {
				headers: {
					"Content-Type": "image/png",
					"Cache-Control": "public, max-age=31536000, immutable",
					...cors,
				},
			});
		}
		if (path === "/api/export" && req.method === "POST") {
			const body = (await req.json()) as { filename?: string; dataUrl?: string };
			const b64 = parseDataUrl(body.dataUrl);
			if (!body.filename || !b64) throw new Error("Invalid export payload");
			const result = await exportPng(body.filename, body.dataUrl!);
			return json(result, 200, cors);
		}
		if (path === "/api/reveal" && req.method === "POST") {
			const body = (await req.json()) as { path?: string };
			if (!body.path) throw new Error("Missing path");
			return json(await revealPath(body.path), 200, cors);
		}
		if (path === "/api/open-data" && req.method === "POST") {
			return json(await openDataFolder(), 200, cors);
		}
		if (path === "/api/title" && req.method === "POST") {
			const body = (await req.json()) as { title?: string };
			opts.setWindowTitle((body.title ?? "GraphitePad").slice(0, 160));
			return json({ ok: true }, 200, cors);
		}
		return json({ ok: false, error: "Not found" }, 404, cors);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error("[api]", path, message);
		return json({ ok: false, error: message }, 400, cors);
	}
}

const MIME: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".txt": "text/plain; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".woff2": "font/woff2",
	".ico": "image/x-icon",
};

export function startServer(opts: ServerOptions) {
	const root = resolve(join(PATHS.VIEWS_FOLDER, "app"));
	const server = Bun.serve({
		hostname: "127.0.0.1",
		port: 0,
		fetch: async (req) => {
			const url = new URL(req.url);
			if (url.pathname.startsWith("/api/")) {
				return handleApi(req, url, opts);
			}

			let pathname: string;
			try {
				pathname = decodeURIComponent(url.pathname);
			} catch {
				return new Response("Bad request", { status: 400 });
			}
			let target = resolve(join(root, pathname === "/" ? "index.html" : pathname));
			if (!target.startsWith(root + sep) && target !== root) {
				return new Response("Forbidden", { status: 403 });
			}
			if (pathname === "/" || !extname(pathname)) {
				target = join(root, "index.html");
			}
			const file = Bun.file(target);
			if (await file.exists()) {
				const headers: Record<string, string> = {
					"Content-Type": MIME[extname(target)] ?? file.type ?? "application/octet-stream",
				};
				if (target.includes(`${sep}_next${sep}static${sep}`)) {
					headers["Cache-Control"] = "public, max-age=31536000, immutable";
				} else {
					headers["Cache-Control"] = "no-cache";
				}
				return new Response(file, { headers });
			}
			return new Response("Not found", { status: 404 });
		},
		error(error) {
			console.error("[server]", error);
			return new Response("Internal error", { status: 500 });
		},
	});
	console.log("[GraphitePad] static root:", root);
	console.log("[GraphitePad] listening on", server.url.href);
	return server;
}
