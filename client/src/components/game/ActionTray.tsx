import { GameState } from "@/hooks/useGame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Hand, 
  Crown, 
  Users, 
  CheckCircle, 
  XCircle,
  Lightbulb,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionTrayProps {
  gameState: GameState;
  onAction: (action: string, data?: any) => void;
  className?: string;
}

export function ActionTray({ gameState, onAction, className }: ActionTrayProps) {
  const { gameState: currentGameState, isMyTurn, myPlayer } = gameState;
  const isReady = myPlayer?.isReady || false;

  const renderSetupActions = () => (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">Game Setup</h3>
      
      <div className="space-y-2">
        <Button 
          variant={isReady ? "default" : "outline"}
          size="sm" 
          className="w-full"
          onClick={() => onAction('ready', { ready: !isReady })}
          data-testid="ready-button"
        >
          {isReady ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Ready
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 mr-2" />
              Not Ready
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground text-center">
          {gameState.participants.filter(p => p.isReady).length}/4 players ready
        </div>
      </div>
    </div>
  );

  const renderCharlestonDecision = () => (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">Round 2 Decision</h3>
      
      <div className="space-y-2">
        <div className="text-xs text-center p-2 bg-muted rounded">
          {gameState.charlestonInfo?.decisionMessage || 'Do you want to continue to Round 2?'}
        </div>
        
        {gameState.charlestonInfo?.votesReceived && (
          <div className="text-xs text-center text-muted-foreground">
            Votes: {gameState.charlestonInfo.votesReceived}/{gameState.charlestonInfo.votesRequired}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-2">
          <Button 
            size="sm" 
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
            onClick={() => onAction('charleston_decision', { decision: 'stop' })}
            data-testid="charleston-stop"
          >
            <XCircle className="w-4 h-4 mr-1" />
            Stop
          </Button>
          
          <Button 
            size="sm"
            variant="outline" 
            className="border-green-300 text-green-700 hover:bg-green-50"
            onClick={() => onAction('charleston_decision', { decision: 'continue' })}
            data-testid="charleston-continue"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Continue
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          All 4 players must agree to continue
        </div>
      </div>
    </div>
  );

  const renderCharlestonActions = () => (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">Charleston Phase</h3>
      
      <div className="space-y-2">
        <Badge variant="secondary" className="w-full justify-center">
          {gameState.charlestonInfo?.phaseName || 'Pass 3 tiles'}
        </Badge>
        
        <Button 
          size="sm" 
          className="w-full"
          disabled={false}
          onClick={() => onAction('charleston_confirm')}
          data-testid="charleston-confirm"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Confirm Pass
        </Button>

        <div className="text-xs text-muted-foreground text-center">
          {gameState.charlestonInfo?.requiredTiles === 0 
            ? 'Pass 0-3 tiles (your choice)'
            : `Select ${gameState.charlestonInfo?.requiredTiles || 3} tiles from your rack`
          }
        </div>
      </div>
    </div>
  );

  const renderPlayingActions = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Game Actions</h3>
        <Badge variant={isMyTurn ? "default" : "secondary"}>
          {isMyTurn ? "Your Turn" : "Wait"}
        </Badge>
      </div>

      <div className="space-y-2">
        {/* Draw tile action */}
        <Button 
          size="sm" 
          className="w-full"
          disabled={!isMyTurn}
          onClick={() => onAction('draw')}
          data-testid="draw-tile-button"
        >
          <Hand className="w-4 h-4 mr-2" />
          Draw Tile
        </Button>

        <Separator />

        {/* Call actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline"
            size="sm"
            disabled={isMyTurn}
            onClick={() => onAction('call', { callType: 'pung' })}
            data-testid="call-pung-button"
          >
            Pung
          </Button>
          <Button 
            variant="outline"
            size="sm"
            disabled={isMyTurn}
            onClick={() => onAction('call', { callType: 'kong' })}
            data-testid="call-kong-button"
          >
            Kong
          </Button>
        </div>

        <Separator />

        {/* Win declaration */}
        <Button 
          variant="default"
          size="sm"
          className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
          disabled={!isMyTurn}
          onClick={() => onAction('win')}
          data-testid="declare-win-button"
        >
          <Crown className="w-4 h-4 mr-2" />
          Mahjong!
        </Button>
      </div>

      <div className="text-xs text-muted-foreground text-center space-y-1">
        {isMyTurn ? (
          <p>Click a tile in your rack to discard</p>
        ) : (
          <p>Watch for tiles to call</p>
        )}
      </div>
    </div>
  );

  const renderGameInfo = () => (
    <div className="space-y-2 pt-3 border-t">
      <h4 className="font-medium text-xs text-muted-foreground">Game Info</h4>
      
      <div className="space-y-1 text-xs">
        {currentGameState && (
          <>
            <div className="flex justify-between">
              <span>Round:</span>
              <span>{currentGameState.currentPlayerIndex + 1}</span>
            </div>
            <div className="flex justify-between">
              <span>Wall:</span>
              <span>{currentGameState.wallCount} tiles</span>
            </div>
            {currentGameState.phase === 'charleston' && (
              <div className="flex justify-between">
                <span>Charleston:</span>
                <span>Phase {(currentGameState as any).charlestonPhase || 1}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <Card className={cn("p-3", className)} data-testid="action-tray">
      {currentGameState?.phase === 'setup' && renderSetupActions()}
      {currentGameState?.phase === 'charleston' && gameState.charlestonInfo?.decisionRequired && renderCharlestonDecision()}
      {currentGameState?.phase === 'charleston' && !gameState.charlestonInfo?.decisionRequired && renderCharlestonActions()}
      {currentGameState?.phase === 'playing' && renderPlayingActions()}
      
      {currentGameState?.phase !== 'setup' && renderGameInfo()}

      {/* Hint button (if feature enabled) */}
      <div className="pt-2 border-t">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-xs"
          onClick={() => onAction('hint')}
          data-testid="hint-button"
        >
          <Lightbulb className="w-3 h-3 mr-1" />
          Get Hint
        </Button>
      </div>
    </Card>
  );
}
