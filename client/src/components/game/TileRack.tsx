import { TileInfo } from "@shared/schema";
import { MahjongTile } from "./MahjongTile";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TileRackProps {
  tiles: TileInfo[];
  onTileClick?: (tile: TileInfo) => void;
  onTileSelect?: (tile: TileInfo) => void;
  selectedTiles: TileInfo[];
  canInteract: boolean;
  className?: string;
  maxSelection?: number;
  sortTiles?: boolean;
}

export function TileRack({ 
  tiles, 
  onTileClick,
  onTileSelect,
  selectedTiles,
  canInteract,
  className,
  maxSelection = 3,
  sortTiles = true
}: TileRackProps) {
  const sortedTiles = sortTiles ? [...tiles].sort((a, b) => {
    // Sort by suit first, then by value
    const suitOrder = { dots: 0, bams: 1, craks: 2, winds: 3, dragons: 4, flowers: 5, joker: 6 };
    const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
    if (suitDiff !== 0) return suitDiff;
    
    // Sort by value within suit
    if (typeof a.value === 'number' && typeof b.value === 'number') {
      return a.value - b.value;
    }
    
    return String(a.value).localeCompare(String(b.value));
  }) : tiles;

  const handleTileClick = (tile: TileInfo) => {
    if (!canInteract) return;

    if (onTileSelect) {
      // Handle selection mode
      const isSelected = selectedTiles.some(t => t.id === tile.id);
      
      if (isSelected) {
        // Deselect tile
        onTileSelect(tile);
      } else if (selectedTiles.length < maxSelection) {
        // Select tile if under limit
        onTileSelect(tile);
      }
    } else if (onTileClick) {
      // Handle direct action mode
      onTileClick(tile);
    }
  };

  const isSelected = (tile: TileInfo) => {
    return selectedTiles.some(t => t.id === tile.id);
  };

  if (tiles.length === 0) {
    return (
      <Card className={cn("p-4 text-center", className)}>
        <p className="text-muted-foreground text-sm">No tiles in hand</p>
      </Card>
    );
  }

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Your Hand ({tiles.length} tiles)
        </h3>
        {onTileSelect && (
          <p className="text-xs text-muted-foreground">
            Selected: {selectedTiles.length}/{maxSelection}
          </p>
        )}
      </div>
      
      <div 
        className="flex flex-wrap gap-0.5 justify-center md:justify-start"
        data-testid="tile-rack"
      >
        {sortedTiles.map((tile, index) => (
          <div
            key={tile.id}
            className={cn(
              "transition-all duration-200",
              isSelected(tile) && "transform -translate-y-2 ring-2 ring-accent",
              canInteract && "hover:transform hover:-translate-y-1 hover:shadow-lg cursor-pointer",
              !canInteract && "opacity-75 cursor-not-allowed"
            )}
            onClick={() => handleTileClick(tile)}
            data-testid={`tile-${tile.id}`}
          >
            <MahjongTile 
              tile={tile} 
              size="large"
              showTooltip={true}
              isSelected={isSelected(tile)}
              canInteract={canInteract}
            />
          </div>
        ))}
      </div>

      {canInteract && onTileClick && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Click a tile to pass
        </p>
      )}

      {canInteract && onTileSelect && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Select {maxSelection} tiles to pass
        </p>
      )}
    </Card>
  );
}
