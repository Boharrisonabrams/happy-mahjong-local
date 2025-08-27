import { TileInfo } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MahjongTileProps {
  tile: TileInfo;
  size?: 'small' | 'medium' | 'large';
  orientation?: 'vertical' | 'horizontal';
  showTooltip?: boolean;
  isSelected?: boolean;
  canInteract?: boolean;
  onClick?: () => void;
  className?: string;
}

export function MahjongTile({ 
  tile, 
  size = 'medium',
  orientation = 'vertical',
  showTooltip = false,
  isSelected = false,
  canInteract = true,
  onClick,
  className
}: MahjongTileProps) {
  const sizeClasses = {
    small: orientation === 'vertical' ? 'w-8 h-10' : 'w-10 h-8',
    medium: orientation === 'vertical' ? 'w-10 h-12' : 'w-12 h-10',
    large: orientation === 'vertical' ? 'w-12 h-16' : 'w-16 h-12'
  };

  const getTileDisplay = () => {
    if (tile.isJoker) {
      return <span className="text-purple-600 font-bold">🃏</span>;
    }

    if (tile.isFlower) {
      return <span className="text-pink-500">🌸</span>;
    }

    switch (tile.suit) {
      case 'dots':
        return <span className="text-blue-600 font-bold">{tile.value}●</span>;
      case 'bams':
        return <span className="text-green-600 font-bold">{tile.value}🎋</span>;
      case 'craks':
        return <span className="text-red-600 font-bold">{tile.value}万</span>;
      case 'winds':
        const windDisplay = {
          'N': '北', 'E': '東', 'S': '南', 'W': '西'
        }[tile.value as string] || tile.value;
        return <span className="text-slate-700 font-bold">{windDisplay}</span>;
      case 'dragons':
        const dragonDisplay = {
          'R': '中', 'G': '發', 'W': '白'
        }[tile.value as string] || tile.value;
        const dragonColor = {
          'R': 'text-red-600', 'G': 'text-green-600', 'W': 'text-slate-500'
        }[tile.value as string] || 'text-slate-600';
        return <span className={cn("font-bold", dragonColor)}>{dragonDisplay}</span>;
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

  const getTooltipText = () => {
    let text = `${tile.suit.charAt(0).toUpperCase() + tile.suit.slice(1)} ${tile.value}`;
    if (tile.isJoker) text = 'Joker';
    if (tile.isFlower) text = `Flower ${tile.value}`;
    return text;
  };

  const tileElement = (
    <Card 
      className={cn(
        "flex items-center justify-center text-center transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)",
        "border-2 shadow-soft cursor-pointer select-none backdrop-blur-sm",
        "relative overflow-hidden group",
        sizeClasses[size],
        getTileColor(),
        isSelected && "ring-2 ring-primary ring-offset-2 transform scale-110 shadow-medium z-10",
        canInteract && "hover:shadow-medium hover:scale-105 hover:-translate-y-1",
        !canInteract && "opacity-75 cursor-not-allowed grayscale",
        orientation === 'horizontal' && "transform rotate-90",
        className
      )}
      onClick={canInteract ? onClick : undefined}
      data-testid={`mahjong-tile-${tile.id}`}
    >
      {/* Subtle shimmer effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      </div>
      
      <div className={cn(
        "flex items-center justify-center relative z-10 font-bold",
        size === 'small' && "text-xs",
        size === 'medium' && "text-base",
        size === 'large' && "text-lg"
      )}>
        {getTileDisplay()}
      </div>
    </Card>
  );

  if (showTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {tileElement}
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return tileElement;
}
