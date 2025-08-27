import { MeldInfo } from "@shared/schema";
import { MahjongTile } from "./MahjongTile";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlayerMeldsProps {
  melds: MeldInfo[];
  position: number;
  isCompact?: boolean;
  className?: string;
}

export function PlayerMelds({ melds, position, isCompact = false, className }: PlayerMeldsProps) {
  if (melds.length === 0) {
    return null;
  }

  const getMeldTypeDisplay = (type: string) => {
    switch (type) {
      case 'pung':
        return 'Pung';
      case 'kong':
        return 'Kong';
      case 'quint':
        return 'Quint';
      case 'pair':
        return 'Pair';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getMeldTypeColor = (type: string) => {
    switch (type) {
      case 'pung':
        return 'bg-blue-100 text-blue-800';
      case 'kong':
        return 'bg-green-100 text-green-800';
      case 'quint':
        return 'bg-purple-100 text-purple-800';
      case 'pair':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={cn("space-y-2", className)} data-testid={`player-melds-${position}`}>
      {!isCompact && (
        <h4 className="text-xs font-medium text-muted-foreground">
          Exposed Melds ({melds.length})
        </h4>
      )}
      
      <div className="space-y-2">
        {melds.map((meld, index) => (
          <Card 
            key={index}
            className={cn(
              "p-2 bg-muted/30",
              isCompact && "p-1"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <Badge 
                variant="secondary" 
                className={cn("text-xs", getMeldTypeColor(meld.type))}
              >
                {getMeldTypeDisplay(meld.type)}
              </Badge>
              
              {!meld.isConcealed && (
                <div className="flex items-center space-x-1">
                  <Badge variant="outline" className="text-xs">
                    Exposed
                  </Badge>
                  {meld.calledFrom !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      From P{meld.calledFrom + 1}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-1 justify-center">
              {meld.tiles.map((tile, tileIndex) => (
                <MahjongTile
                  key={tileIndex}
                  tile={tile}
                  size={isCompact ? "small" : "medium"}
                  orientation={position === 1 || position === 3 ? "horizontal" : "vertical"}
                  showTooltip={true}
                  canInteract={false}
                  className={cn(
                    meld.isConcealed && "opacity-75",
                    "transition-all duration-200"
                  )}
                />
              ))}
            </div>

            {!isCompact && (
              <div className="text-center mt-2">
                <p className="text-xs text-muted-foreground">
                  {meld.tiles.length} tiles
                  {meld.isConcealed ? " (concealed)" : " (exposed)"}
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
