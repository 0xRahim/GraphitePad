import { DownloadCta } from "@/components/landing/download-cta";
import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { PixelSection } from "@/components/landing/pixel-section";
import { Shortcuts } from "@/components/landing/shortcuts";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { SketchSection } from "@/components/landing/sketch-section";
import { StudioDemos } from "@/components/landing/studio-demos";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero />
        <SketchSection />
        <PixelSection />
        <Features />
        <Shortcuts />
        <StudioDemos />
        <DownloadCta />
      </main>
      <SiteFooter />
    </>
  );
}
