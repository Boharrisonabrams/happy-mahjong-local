import { Navigation } from "@/components/ui/navigation";
import { Hero } from "@/components/ui/hero";
import { Features } from "@/components/ui/features";
import { LobbyPreview } from "@/components/ui/lobby-preview";
import { LearningSection } from "@/components/ui/learning-section";
import { CustomizationSection } from "@/components/ui/customization-section";
import { CTA } from "@/components/ui/cta";
import { Footer } from "@/components/ui/footer";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <Features />
      <LobbyPreview />
      <LearningSection />
      <CustomizationSection />
      <CTA />
      <Footer />
    </div>
  );
}
