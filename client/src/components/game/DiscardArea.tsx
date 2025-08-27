import { TileInfo } from "@shared/schema";
import { MahjongTile } from "./MahjongTile";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DiscardAreaProps {
  discards: TileInfo[];
  lastDiscardedBySeat?: number;
  onTileClick?: (tile: TileInfo) => void;
  className?: string;
  maxVisible?: number;
}

export function DiscardArea({ 
  discards, 
  lastDiscardedBySeat,
  onTileClick,
  className,
  maxVisible = 20
}: DiscardAreaProps) {
  const visibleDiscards = discards.slice(-maxVisible);
  const lastTile = discards[discards.length - 1];

  if (discards.length === 0) {
    return (
      <Card className={cn("p-4 text-center min-h-24 flex items-center justify-center", className)}>
        <p className="text-muted-foreground text-sm">No discards yet</p>
      </Card>
    );
  }

  return (
    <Card className={cn("p-4", className)} data-testid="discard-area">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Discards ({discards.length})
        </h3>
        {lastDiscardedBySeat !== undefined && (
          <Badge variant="outline" className="text-xs">
            From Player {lastDiscardedBySeat + 1}
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {/* Most recent discard (larger, prominent) */}
        {lastTile && (
          <div className="flex justify-center">
            <div 
              className={cn(
                "transition-all duration-300 transform hover:scale-105",
                onTileClick && "cursor-pointer"
              )}
              onClick={() => onTileClick?.(lastTile)}
            >
              <MahjongTile 
                tile={lastTile}
                size="large"
                showTooltip={true}
                isSelected={false}
                canInteract={!!onTileClick}
                className="ring-2 ring-accent/50 shadow-lg"
              />
            </div>
          </div>
        )}

        {/* Previous discards (smaller, in grid) */}
        {visibleDiscards.length > 1 && (
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2 text-center">
              Recent discards
            </p>
            <div className="grid grid-cols-6 md:grid-cols-8 gap-1 justify-items-center">
              {visibleDiscards.slice(0, -1).reverse().map((tile, index) => (
                <div
                  key={`${tile.id}-${index}`}
                  className={cn(
                    "transition-opacity duration-200",
                    index > 15 && "opacity-50" // Fade older tiles
                  )}
                  onClick={() => onTileClick?.(tile)}
                >
                  <MahjongTile 
                    tile={tile}
                    size="small"
                    showTooltip={true}
                    canInteract={!!onTileClick}
                    className={cn(
                      onTileClick && "hover:ring-1 hover:ring-accent/30"
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Call action indicators */}
        {onTileClick && lastTile && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Click to call for pung, kong, or win
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
