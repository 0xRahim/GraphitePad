export default {
	scripts: {
		install: ["bun", "install"],
		dev: ["bun", "run", "scripts/dev.ts"],
		"dev:web": ["bun", "run", "next", "dev", "-p", "3311"],
		build: ["bun", "run", "scripts/build.ts"],
		typecheck: ["bun", "run", "tsc", "--noEmit"],
	},
};
