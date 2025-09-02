import { useState, useEffect } from 'react';
import { useTileTheme } from '@/contexts/TileThemeContext';
import { MahjongTile } from './MahjongTile';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Sample tiles to preview themes
const PREVIEW_TILES = [
  { id: 'preview-joker', suit: 'joker', value: 'JOKER', isJoker: true, isFlower: false },
  { id: 'preview-dot', suit: 'dots', value: 5, isJoker: false, isFlower: false },
  { id: 'preview-bam', suit: 'bams', value: 3, isJoker: false, isFlower: false },
  { id: 'preview-crak', suit: 'craks', value: 7, isJoker: false, isFlower: false },
  { id: 'preview-wind', suit: 'winds', value: 'E', isJoker: false, isFlower: false },
  { id: 'preview-dragon', suit: 'dragons', value: 'R', isJoker: false, isFlower: false }
];

export function TileThemePreview() {
  const { currentTheme, setTheme, getAllThemes } = useTileTheme();
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const themes = getAllThemes();
  const selectedTheme = themes[selectedThemeIndex];

  // Check initial dark mode state
  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handlePrevious = () => {
    setSelectedThemeIndex((prev) => (prev === 0 ? themes.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedThemeIndex((prev) => (prev === themes.length - 1 ? 0 : prev + 1));
  };

  const handleSelectTheme = () => {
    setTheme(selectedTheme.id);
  };

  return (
    <div className="space-y-4">
      {/* Light/Dark Mode Toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Appearance</label>
        <div className="flex items-center space-x-2">
          <Sun className="h-4 w-4" />
          <Switch 
            checked={isDarkMode} 
            onCheckedChange={toggleDarkMode}
          />
          <Moon className="h-4 w-4" />
        </div>
      </div>

      <label className="text-sm font-medium block">Tile Theme</label>
      
      {/* Theme selector with navigation */}
      <div className="bg-muted/50 rounded-lg p-3 space-y-3">
        {/* Theme name and navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            className="h-6 w-6 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center">
            <div className="font-medium text-sm">{selectedTheme.name}</div>
            <div className="text-xs text-muted-foreground">{selectedTheme.description}</div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNext}
            className="h-6 w-6 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Tile preview with temporary theme override */}
        <div className="flex justify-center gap-1 py-2">
          {PREVIEW_TILES.map((tile) => (
            <div key={tile.id} className="transform scale-75">
              <TilePreviewWithTheme tile={tile} theme={selectedTheme} />
            </div>
          ))}
        </div>

        {/* Select button */}
        <div className="flex justify-center">
          <Button
            onClick={handleSelectTheme}
            size="sm"
            variant={currentTheme === selectedTheme.id ? "default" : "outline"}
            className="h-7 text-xs px-3"
          >
            {currentTheme === selectedTheme.id ? "Selected" : "Use This Theme"}
          </Button>
        </div>

        {/* Theme indicator dots */}
        <div className="flex justify-center gap-1">
          {themes.map((_, index) => (
            <button
              key={index}
              onClick={() => setSelectedThemeIndex(index)}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                index === selectedThemeIndex ? "bg-primary" : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper component to render tiles with a specific theme
function TilePreviewWithTheme({ tile, theme }: { tile: any; theme: any }) {
  const getTileDisplay = () => {
    if (tile.isJoker) {
      return theme.renderJoker();
    }

    if (tile.isFlower) {
      return theme.renderFlower();
    }

    switch (tile.suit) {
      case 'dots':
        return theme.renderDot(tile.value);
      case 'bams':
        return theme.renderBam(tile.value);
      case 'craks':
        return theme.renderCrak(tile.value);
      case 'winds':
        return theme.renderWind(tile.value);
      case 'dragons':
        return theme.renderDragon(tile.value);
      default:
        return <span className="font-bold">{tile.value}</span>;
    }
  };

  const getTileColor = () => {
    if (tile.isJoker) return 'border-purple-300/50 bg-gradient-to-br from-purple-100 via-purple-50 to-white shadow-purple-200/30';
    if (tile.isFlower) return 'border-pink-300/50 bg-gradient-to-br from-pink-100 via-pink-50 to-white shadow-pink-200/30';
    
    switch (tile.suit) {
      case 'dots':
        return 'border-blue-300/50 bg-gradient-to-br from-blue-100 via-blue-50 to-white shadow-blue-200/30';
      case 'bams':
        return 'border-green-300/50 bg-gradient-to-br from-green-100 via-green-50 to-white shadow-green-200/30';
      case 'craks':
        return 'border-red-300/50 bg-gradient-to-br from-red-100 via-red-50 to-white shadow-red-200/30';
      case 'winds':
      case 'dragons':
        return 'border-slate-300/50 bg-gradient-to-br from-slate-100 via-slate-50 to-white shadow-slate-200/30';
      default:
        return 'border-gray-300/50 bg-gradient-to-br from-gray-50 to-white shadow-gray-200/30';
    }
  };

  return (
    <div className={cn(
      "w-8 h-10 flex items-center justify-center text-center",
      "border-2 shadow-soft cursor-pointer select-none backdrop-blur-sm rounded",
      "relative overflow-hidden",
      getTileColor()
    )}>
      <div className="flex items-center justify-center relative z-10 font-bold text-xs">
        {getTileDisplay()}
      </div>
    </div>
  );
}