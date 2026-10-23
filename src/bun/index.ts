import { BrowserWindow } from "electrobun/main";
import { startServer } from "./server";

const token = crypto.randomUUID().replace(/-/g, "");
let mainWindow: BrowserWindow | null = null;

const server = startServer({
	token,
	setWindowTitle: (title) => {
		try {
			mainWindow?.setTitle(title);
		} catch {
			// Window may be closing.
		}
	},
});

const devUrl = process.env.GRAPHITEPAD_DEV_URL?.trim();
const appUrl = devUrl
	? `${devUrl}${devUrl.includes("?") ? "&" : "?"}api=${encodeURIComponent(
			`http://127.0.0.1:${server.port}`,
		)}&token=${token}`
	: `http://127.0.0.1:${server.port}/?token=${token}`;

mainWindow = new BrowserWindow({
	title: "GraphitePad",
	url: appUrl,
	frame: {
		width: 1440,
		height: 900,
	},
});

console.log("[GraphitePad] window:", appUrl);
