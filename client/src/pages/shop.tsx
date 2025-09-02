import { Navigation } from "@/components/ui/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ShoppingBag, Palette, Sparkles, Crown } from "lucide-react";

export default function Shop() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-serif font-bold mb-4">MahjongMaster Shop</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Enhance your gaming experience with premium tiles, exclusive themes, and collector's edition accessories.
          </p>
        </div>

        {/* Coming Soon Notice */}
        <Card className="p-8 mb-12 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <div className="text-center">
            <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-3">Shop Coming Soon!</h2>
            <p className="text-muted-foreground mb-6">
              We're working hard to bring you an amazing collection of premium mahjong accessories and digital content.
              Our shop will feature beautiful tile sets, exclusive themes, and collectible items.
            </p>
            <Badge className="text-lg px-6 py-2">
              Launching Q2 2024
            </Badge>
          </div>
        </Card>

        {/* Preview Categories */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Palette className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Premium Tile Sets</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Beautiful handcrafted digital tiles with authentic Chinese calligraphy and artistic designs.
            </p>
            <Badge variant="secondary">Coming Soon</Badge>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Exclusive Themes</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Seasonal themes, holiday collections, and limited-edition table backgrounds.
            </p>
            <Badge variant="secondary">Coming Soon</Badge>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Collector's Edition</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Rare tiles, anniversary sets, and special commemorative collections.
            </p>
            <Badge variant="secondary">Coming Soon</Badge>
          </Card>
        </div>

        {/* External Shop Link */}
        <Card className="p-8 text-center">
          <h3 className="text-xl font-semibold mb-4">Physical Mahjong Sets Available Now</h3>
          <p className="text-muted-foreground mb-6">
            While our digital shop is in development, you can browse our partner's collection of 
            high-quality physical American Mahjong sets and accessories.
          </p>
          
          <Button 
            size="lg" 
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => window.open('https://example-mahjong-store.com', '_blank')}
            data-testid="external-shop-button"
          >
            <ExternalLink className="h-5 w-5 mr-2" />
            Visit Partner Store
          </Button>
          
          <p className="text-xs text-muted-foreground mt-3">
            Opens in a new window • Managed by our trusted retail partner
          </p>
        </Card>

        {/* Newsletter Signup */}
        <Card className="p-6 mt-12 bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-3">Stay Updated</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to know when our shop launches and get exclusive early access to new items.
            </p>
            <div className="max-w-md mx-auto flex gap-3">
              <input 
                type="email" 
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 border border-border rounded-md bg-background text-foreground"
              />
              <Button data-testid="newsletter-signup">
                Notify Me
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
