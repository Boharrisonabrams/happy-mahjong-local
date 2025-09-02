import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, GraduationCap, Users, Clock } from "lucide-react";
import { Link } from "wouter";

export function Hero() {
  return (
    <section className="gradient-hero text-primary-foreground overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-4">
                <span className="text-sm font-medium">🎋 Authentic American Mahjong Experience</span>
              </div>
              <h1 className="text-6xl md:text-7xl font-serif font-bold leading-tight bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent drop-shadow-lg">
                Master American Mahjong Online
              </h1>
              <p className="text-xl md:text-2xl text-primary-foreground/90 leading-relaxed font-medium max-w-2xl">
                Play the classic game with friends or challenge our AI opponents. Learn, practice, and perfect your strategy in the most authentic online experience.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6">
              <Link href="/play">
                <Button 
                  size="lg" 
                  className="btn-modern bg-gradient-accent text-accent-foreground hover:scale-105 text-lg px-10 py-5 shadow-medium hover:shadow-strong transition-all duration-300"
                  data-testid="play-now-button"
                >
                  <Play className="w-6 h-6 mr-3" />
                  Play Now
                </Button>
              </Link>
              
              <Link href="/learn">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="btn-modern glass border-white/30 text-white hover:bg-white/20 hover:scale-105 text-lg px-10 py-5 shadow-medium hover:shadow-strong transition-all duration-300"
                  data-testid="learn-button"
                >
                  <GraduationCap className="w-6 h-6 mr-3" />
                  Learn to Play
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-primary-foreground/90">
              <div className="flex items-center space-x-3 glass rounded-xl px-4 py-3">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <div className="font-semibold text-white">1,200+</div>
                  <div className="text-sm">Active Players</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 glass rounded-xl px-4 py-3">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Clock className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <div className="font-semibold text-white">24/7</div>
                  <div className="text-sm">Tables Available</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative animate-float">
            {/* Game Table Preview */}
            <div className="glass-strong rounded-3xl p-8 shadow-strong border border-white/20">
              <div className="game-table-bg rounded-2xl p-6 mb-4">
                <div className="grid grid-cols-3 gap-4 mb-6">
                {/* Top player */}
                <div className="col-span-3 text-center">
                  <div className="flex justify-center space-x-1 mb-3">
                    <GameTile>北</GameTile>
                    <GameTile>東</GameTile>
                    <GameTile>南</GameTile>
                  </div>
                  <div className="text-xs text-white/80 font-medium">Player 1</div>
                </div>
                
                {/* Left player */}
                <div className="flex flex-col items-center justify-center space-y-1">
                  <div className="text-xs text-white/80 font-medium mb-1">Player 4</div>
                  <div className="flex flex-col space-y-1">
                    <GameTile orientation="left">中</GameTile>
                    <GameTile orientation="left">發</GameTile>
                  </div>
                </div>
                
                {/* Center area */}
                <div className="flex items-center justify-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-xl border-2 border-primary/30 flex items-center justify-center shadow-medium animate-pulse-glow">
                    <div className="w-6 h-6 grid grid-cols-2 gap-1">
                      <div className="bg-white rounded-sm opacity-90"></div>
                      <div className="bg-white rounded-sm opacity-90"></div>
                      <div className="bg-white rounded-sm opacity-90"></div>
                      <div className="bg-white rounded-sm opacity-90"></div>
                    </div>
                  </div>
                </div>
                
                {/* Right player */}
                <div className="flex flex-col items-center justify-center space-y-1">
                  <div className="text-xs text-white/80 font-medium mb-1">Player 2</div>
                  <div className="flex flex-col space-y-1">
                    <GameTile orientation="right">白</GameTile>
                    <GameTile orientation="right">🀄</GameTile>
                  </div>
                </div>
                
                {/* Bottom player (current user) */}
                <div className="col-span-3 text-center">
                  <div className="text-xs text-white/80 font-medium mb-3">Player 3 (You)</div>
                  <div className="flex justify-center space-x-1">
                    <GameTile>1筒</GameTile>
                    <GameTile>2筒</GameTile>
                    <GameTile>3筒</GameTile>
                    <GameTile special>🃏</GameTile>
                  </div>
                </div>
                </div>
              </div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 bg-gradient-accent text-accent-foreground px-4 py-2 rounded-full text-sm font-bold shadow-strong animate-pulse border border-white/20">
              ✨ Your Turn!
            </div>
            <div className="absolute -bottom-4 -left-4 glass-strong text-white px-4 py-2 rounded-full text-sm font-medium shadow-medium border border-white/20">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live Chat</span>
              </div>
            </div>
            
            {/* Background decoration */}
            <div className="absolute -z-10 -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl"></div>
            <div className="absolute -z-10 -bottom-10 -left-10 w-32 h-32 bg-gradient-to-tr from-accent/10 to-transparent rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Helper component for game tiles
function GameTile({ 
  children, 
  orientation = 'normal', 
  special = false 
}: { 
  children: React.ReactNode;
  orientation?: 'normal' | 'left' | 'right';
  special?: boolean;
}) {
  return (
    <div className={`
      w-10 h-12 bg-gradient-to-b from-white via-white to-gray-50
      border-2 border-white/50 rounded-lg text-sm shadow-soft
      flex items-center justify-center font-bold text-slate-800
      hover:shadow-medium hover:scale-105 transition-all duration-200
      backdrop-blur-sm
      ${orientation === 'left' ? 'transform -rotate-90 w-8 h-10' : ''}
      ${orientation === 'right' ? 'transform rotate-90 w-8 h-10' : ''}
      ${special ? 'border-purple-300 bg-gradient-to-b from-purple-100 via-purple-50 to-purple-100 text-purple-700 shadow-purple-200/50' : ''}
    `}>
      {children}
    </div>
  );
}
