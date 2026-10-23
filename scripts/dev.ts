export {};

const port = process.env.GRAPHITEPAD_WEB_PORT ?? "3311";
const devUrl = `http://localhost:${port}`;

const next = Bun.spawn(["bun", "run", "next", "dev", "-p", port], {
	stdout: "inherit",
	stderr: "inherit",
	env: process.env,
});

const waitForWeb = async () => {
	for (let i = 0; i < 120; i += 1) {
		try {
			const res = await fetch(devUrl, { signal: AbortSignal.timeout(1000) });
			if (res.ok) return true;
		} catch {
			// Still booting.
		}
		await Bun.sleep(500);
	}
	return false;
};

const webReady = await waitForWeb();
if (!webReady) {
	next.kill();
	console.error(`[dev] Next.js did not start at ${devUrl}`);
	process.exit(1);
}

const desktop = Bun.spawn(["hutch", "electrobun", "dev", "--env=dev", "--watch"], {
	stdout: "inherit",
	stderr: "inherit",
	env: { ...process.env, GRAPHITEPAD_DEV_URL: devUrl },
});

let stopping = false;
const stop = () => {
	if (stopping) return;
	stopping = true;
	desktop.kill();
	next.kill();
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

const code = await desktop.exited;
stop();
process.exit(code ?? 0);
