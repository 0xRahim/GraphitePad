import type { Metadata } from "next";
import "./globals.css";
import "./library.css";
import "./studio.css";

export const metadata: Metadata = {
	title: "GraphitePad",
	description: "A quiet studio for sketches and pixel art.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `try{var t=localStorage.getItem("graphitepad:theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`,
					}}
				/>
			</head>
			<body>{children}</body>
		</html>
	);
}
