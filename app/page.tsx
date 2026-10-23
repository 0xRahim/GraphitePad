"use client";

import dynamic from "next/dynamic";
import { BrandMark } from "@/components/BrandMark";

const App = dynamic(() => import("@/components/App"), {
	ssr: false,
	loading: () => (
		<div className="boot">
			<span className="boot-lockup">
				<BrandMark className="boot-mark" />
				<span className="wordmark">GraphitePad</span>
			</span>
		</div>
	),
});

export default function Page() {
	return <App />;
}
