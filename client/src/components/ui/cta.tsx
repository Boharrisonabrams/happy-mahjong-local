import { Button } from "@/components/ui/button";
import { Play, HelpCircle } from "lucide-react";
import { Link } from "wouter";

export function CTA() {
  return (
    <section className="py-20 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground">
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
          Ready to Master American Mahjong?
        </h2>
        <p className="text-xl mb-8 text-primary-foreground/90">
          Join thousands of players in the most authentic online Mahjong experience. Start playing in seconds, no download required.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/play">
            <Button 
              size="lg"
              className="bg-accent text-accent-foreground px-8 py-4 text-lg hover:bg-accent/90 font-semibold"
              data-testid="cta-play-button"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Playing Free
            </Button>
          </Link>
          
          <Link href="/learn">
            <Button 
              variant="outline"
              size="lg"
              className="border-2 border-primary-foreground/30 text-primary-foreground px-8 py-4 text-lg hover:bg-primary-foreground/10 font-semibold"
              data-testid="cta-learn-button"
            >
              <HelpCircle className="w-5 h-5 mr-2" />
              Learn the Rules
            </Button>
          </Link>
        </div>
        
        <p className="text-sm text-primary-foreground/70 mt-6">
          No signup required to start • Premium features available • Play on any device
        </p>
      </div>
    </section>
  );
}
