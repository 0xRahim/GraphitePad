export {};

const web = Bun.spawn(["bun", "run", "build:web"], {
	stdout: "inherit",
	stderr: "inherit",
	env: process.env,
});
const webCode = await web.exited;
if (webCode !== 0) process.exit(webCode ?? 1);

const desktop = Bun.spawn(["hutch", "electrobun", "build", "--env=stable"], {
	stdout: "inherit",
	stderr: "inherit",
	env: process.env,
});
const desktopCode = await desktop.exited;
process.exit(desktopCode ?? 0);
