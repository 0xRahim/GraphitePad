import type { ElectrobunConfig } from "electrobun";

export default {
	app: {
		name: "GraphitePad",
		identifier: "com.graphitepad.app",
		version: "0.1.0",
	},
	build: {
		mainProcess: "bun",
		bun: {
			entrypoint: "src/bun/index.ts",
		},
		copy: {
			out: "views/app",
		},
		watchIgnore: ["out/**", ".next/**", "node_modules/**"],
		mac: {
			bundleCEF: false,
			icons: "assets/brand/app-icon.iconset",
		},
		linux: {
			bundleCEF: false,
			icon: "assets/brand/app-icon.png",
		},
		win: {
			bundleCEF: false,
			icon: "assets/brand/app-icon.ico",
		},
	},
} satisfies ElectrobunConfig;
