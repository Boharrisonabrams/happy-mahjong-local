import { useParams } from "wouter";
import { useGame } from "@/hooks/useGame";
import { TileRack } from "./TileRack";
import { DiscardArea } from "./DiscardArea";
import { PlayerMelds } from "./PlayerMelds";
import { ActionTray } from "./ActionTray";
import { GameChat } from "./GameChat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Wifi, WifiOff, Users, MessageSquare } from "lucide-react";
import { useState } from "react";
import type { TileInfo } from "@shared/schema";

// Bot name mapping
const getBotName = (seatPosition: number) => {
  const botNames = ['Bot Alice', 'Bot Bob', 'Bot Charlie', 'Bot Dana'];
  return botNames[seatPosition] || `Bot ${seatPosition + 1}`;
};

export default function GameTable() {
  const { id: tableId } = useParams<{ id: string }>();
  const { gameState, actions, isLoading, isConnected } = useGame(tableId);
  
  // Charleston state management
  const [selectedTilesForCharleston, setSelectedTilesForCharleston] = useState<TileInfo[]>([]);
  
  const isCharlestonPhase = gameState.gameState?.phase === 'charleston';
  const myTiles = gameState.playerStates?.[gameState.myPlayer?.seatPosition]?.rack || [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50 dark:bg-green-950">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading game table...</p>
        </div>
      </div>
    );
  }

  if (!gameState.table) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-950">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-destructive mb-4">Table Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested table could not be found.</p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </Card>
      </div>
    );
  }

  // Map seat positions to visual positions with current user always at bottom
  const getVisualPosition = (seatPosition: number) => {
    if (!gameState?.myPlayer) return seatPosition;
    
    const myPosition = gameState.myPlayer.seatPosition;
    // Rotate positions so current user is always at visual position 2 (bottom)
    // Visual positions: 0=top, 1=right, 2=bottom, 3=left
    if (seatPosition === myPosition) {
      return 2; // Current player always at bottom
    }
    
    const offset = (seatPosition - myPosition + 4) % 4;
    return offset === 0 ? 2 : offset; // If same position, put at bottom, otherwise use offset
  };

  const renderPlayerPosition = (seatPosition: number) => {
    const participant = gameState.participants?.find(p => p.seatPosition === seatPosition);
    const playerState = gameState.playerStates?.[seatPosition];
    const isCurrentPlayer = gameState.gameState?.currentPlayerIndex === seatPosition;
    const isMyPosition = participant?.userId === gameState.myPlayer?.userId;
    const visualPosition = getVisualPosition(seatPosition);

    return (
      <div 
        className={`
          absolute flex flex-col items-center space-y-2 p-3 rounded-lg
          ${visualPosition === 0 ? 'top-4 left-1/2 transform -translate-x-1/2' : ''}
          ${visualPosition === 1 ? 'right-4 top-1/2 transform -translate-y-1/2' : ''}
          ${visualPosition === 2 ? 'bottom-4 left-1/2 transform -translate-x-1/2' : ''}
          ${visualPosition === 3 ? 'left-4 top-1/2 transform -translate-y-1/2' : ''}
          ${isCurrentPlayer ? 'bg-accent/20 border-2 border-accent' : 'bg-muted/50'}
          ${isMyPosition ? 'ring-2 ring-primary' : ''}
        `}
        data-testid={`player-position-${seatPosition}`}
      >
        {participant ? (
          <>
            <div className="flex items-center space-x-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={participant.user?.profileImageUrl || ''} />
                <AvatarFallback>
                  {participant.isBot 
                    ? getBotName(seatPosition).split(' ')[1]?.[0] || 'B'  // "Bot Alice" -> "A"
                    : (participant.user?.firstName?.[0] || 'P')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">
                {participant.isBot 
                  ? getBotName(seatPosition)
                  : (participant.user?.firstName || `Player ${seatPosition + 1}`)}
                {isMyPosition && ' (You)'}
              </span>
            </div>
            
            <div className="flex space-x-1">
              <Badge variant={participant.isReady ? 'default' : 'secondary'} className="text-xs">
                {participant.isReady ? 'Ready' : 'Not Ready'}
              </Badge>
              {participant.isBot && (
                <Badge variant="outline" className="text-xs">Bot</Badge>
              )}
              {isCurrentPlayer && (
                <Badge variant="destructive" className="text-xs">Turn</Badge>
              )}
            </div>

            {/* Player's exposed melds */}
            <PlayerMelds 
              melds={playerState?.melds || []} 
              position={seatPosition}
              isCompact={!isMyPosition}
            />

            {/* Tile count indicator */}
            <div className="text-xs text-muted-foreground">
              {playerState?.rack?.length || 13} tiles
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center mb-2">
              <Users className="w-4 h-4 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground">Empty Seat</p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-2 text-xs"
              onClick={() => actions.joinTable(tableId!)}
              data-testid={`join-seat-${seatPosition}`}
            >
              Join
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full bg-[url('/api/placeholder/pattern')] bg-repeat"></div>
      </div>

      {/* Connection status */}
      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center space-x-2 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className="text-sm font-medium">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Game info panel */}
      <div className="absolute top-4 left-4 z-10 bg-card/90 backdrop-blur-sm rounded-lg p-4 min-w-64">
        <h2 className="font-bold text-lg mb-2" data-testid="table-name">
          {gameState.table.name}
        </h2>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Status:</span>
            <Badge variant={gameState.table.status === 'playing' ? 'default' : 'secondary'}>
              {gameState.table.status}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span>Players:</span>
            <span>{gameState.participants.length}/4</span>
          </div>
          {gameState.gameState && (
            <div className="flex justify-between">
              <span>Phase:</span>
              <Badge variant="outline">{gameState.gameState.phase}</Badge>
            </div>
          )}
        </div>
      </div>

      {/* Main game area */}
      <div className="relative w-full h-full min-h-screen p-8">
        {/* Central game area */}
        <div className="absolute inset-1/4 bg-green-700/80 backdrop-blur-sm rounded-2xl border-4 border-yellow-400/50 flex items-center justify-center">
          <div className="text-center">
            {gameState.gameState?.phase === 'setup' && (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-white">Waiting for Players</h3>
                <p className="text-green-100">
                  {4 - gameState.participants.length} more players needed
                </p>
              </div>
            )}
            
            {gameState.gameState?.phase === 'charleston' && (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-white">Charleston Phase</h3>
                <p className="text-green-100">Select 3 tiles to pass</p>
              </div>
            )}

            {gameState.gameState?.phase === 'playing' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Game in Progress</h3>
                {gameState.isMyTurn && (
                  <p className="text-accent text-lg font-semibold animate-pulse">
                    Your Turn!
                  </p>
                )}
                <div className="text-green-100">
                  <p>Wall: {gameState.gameState.wallCount} tiles</p>
                </div>
              </div>
            )}

            {gameState.gameState?.phase === 'finished' && (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-white">Hand Complete</h3>
                <p className="text-green-100">Starting next hand...</p>
              </div>
            )}
          </div>
        </div>

        {/* Player positions - render all seats but visually positioned relative to current user */}
        {gameState.participants && gameState.participants.length > 0 ? (
          gameState.participants.map(p => (
            <div key={`participant-${p.seatPosition}`}>
              {renderPlayerPosition(p.seatPosition)}
            </div>
          ))
        ) : (
          [0, 1, 2, 3].map(seatPos => (
            <div key={`empty-seat-${seatPos}`}>
              {renderPlayerPosition(seatPos)}
            </div>
          ))
        )}

        {/* Discard area - center */}
        <div className="absolute inset-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32">
          <DiscardArea 
            discards={gameState.gameState?.lastDiscardedTile ? [gameState.gameState.lastDiscardedTile] : []}
            lastDiscardedBySeat={gameState.gameState?.lastDiscardedBySeat}
          />
        </div>
      </div>

      {/* Bottom UI for current player */}
      {gameState.myPlayer && (
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t p-4">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Player's tile rack */}
            <div className="lg:col-span-2">
              <TileRack 
                tiles={myTiles}
                onTileClick={(tile) => {
                  if (!isCharlestonPhase && gameState.isMyTurn) {
                    actions.discardTile(tile.id);
                  }
                }}
                onTileSelect={(tile) => {
                  if (isCharlestonPhase) {
                    setSelectedTilesForCharleston(prev => {
                      const isSelected = prev.some(t => t.id === tile.id);
                      if (isSelected) {
                        return prev.filter(t => t.id !== tile.id);
                      } else if (prev.length < 3) {
                        return [...prev, tile];
                      }
                      return prev;
                    });
                  }
                }}
                canInteract={isCharlestonPhase ? true : gameState.isMyTurn}
                selectedTiles={isCharlestonPhase ? selectedTilesForCharleston : []}
                maxSelection={3}
              />
            </div>

            {/* Action tray and chat */}
            <div className="space-y-4">
              <ActionTray 
                gameState={gameState}
                onAction={(action, data) => {
                  switch (action) {
                    case 'charleston_confirm':
                      if (selectedTilesForCharleston.length === 3) {
                        actions.passTiles(selectedTilesForCharleston);
                        setSelectedTilesForCharleston([]);
                      }
                      break;
                    case 'draw':
                      actions.drawTile();
                      break;
                    case 'call':
                      actions.callTile(data.callType);
                      break;
                    case 'ready':
                      actions.setReady(data.ready);
                      break;
                    case 'win':
                      actions.declareWin();
                      break;
                  }
                }}
              />
              
              <div className="h-32">
                <GameChat 
                  tableId={tableId!}
                  onSendMessage={actions.sendChatMessage}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {gameState.error && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <Card className="bg-destructive/90 text-destructive-foreground p-4 max-w-md">
            <h3 className="font-semibold mb-2">Error</h3>
            <p className="text-sm">{gameState.error}</p>
            <Button 
              variant="secondary" 
              size="sm" 
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Reload
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
