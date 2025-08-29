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
import { Loader2, Wifi, WifiOff, Users, MessageSquare, Lightbulb, Crown, Settings } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from "react";
import React from "react";
import type { TileInfo } from "@shared/schema";

// Bot name mapping
const getBotName = (seatPosition: number) => {
  const botNames = ['Bot Alice', 'Bot Bob', 'Bot Charlie', 'Bot Dana'];
  return botNames[seatPosition] || `Bot ${seatPosition + 1}`;
};

export default function GameTable() {
  const { id: tableId } = useParams<{ id: string }>();
  const { gameState, actions, isLoading, isConnected } = useGame(tableId);
  const { toast } = useToast();
  
  // Charleston state management - simplified
  const [receivedTilesFromCharleston, setReceivedTilesFromCharleston] = useState<TileInfo[]>([]);
  
  // Exposed rack - contains both received tiles and tiles moved from main rack
  const [exposedRack, setExposedRack] = useState<TileInfo[]>([]);
  
  const isCharlestonPhase = gameState.gameState?.phase === 'charleston';
  
  // Handle Charleston ending - move all exposed tiles back to main hand
  useEffect(() => {
    if (!isCharlestonPhase && exposedRack.length > 0) {
      console.log('🏁 Charleston ended, moving', exposedRack.length, 'tiles back to main hand');
      setExposedRack([]); // Clear the exposed rack since tiles filter back to main hand automatically
    }
  }, [isCharlestonPhase, exposedRack.length]);
  const myTiles = gameState.playerStates?.[gameState.myPlayer?.seatPosition || 0]?.rack || [];
  
  // Update exposed rack when Charleston info changes
  React.useEffect(() => {
    console.log('🀄 Charleston info changed:', gameState.charlestonInfo);
    console.log('🀄 Received tiles from info:', gameState.charlestonInfo?.receivedTiles);
    console.log('🀄 Current exposed rack state:', exposedRack.length);
    
    if (gameState.charlestonInfo?.receivedTiles) {
      console.log('🀄 Adding received tiles to exposed rack:', gameState.charlestonInfo.receivedTiles);
      // Set exposed rack to ONLY contain received tiles (replace any existing tiles)
      setExposedRack(gameState.charlestonInfo.receivedTiles);
      // Clear the temporary received tiles state
      setReceivedTilesFromCharleston([]);
    }
  }, [gameState.charlestonInfo, exposedRack.length]);

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
    // Visual positions: 0=top, 1=right, 2=bottom, 3=left
    if (seatPosition === myPosition) {
      return 2; // Current player always at bottom
    }
    
    // Calculate visual position based on offset from current player
    const offset = (seatPosition - myPosition + 4) % 4;
    const visualMap = [2, 0, 1, 3]; // offset 0->bottom, 1->top, 2->right, 3->left  
    return visualMap[offset];
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
          absolute flex flex-col items-center space-y-1 p-2 rounded-lg
          ${visualPosition === 0 ? 'top-6 left-1/2 transform -translate-x-1/2' : ''}
          ${visualPosition === 1 ? 'right-3 top-1/3 transform -translate-y-1/2' : ''}
          ${visualPosition === 2 ? 'bottom-6 left-1/2 transform -translate-x-1/2' : ''}
          ${visualPosition === 3 ? 'left-3 top-1/3 transform -translate-y-1/2' : ''}
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
              {!participant.isBot && (
                <Badge variant={participant.isReady ? 'default' : 'secondary'} className="text-xs">
                  {participant.isReady ? 'Ready' : 'Not Ready'}
                </Badge>
              )}
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

            {/* Bot tile rack display - proper rack tiles for bots */}
            {participant.isBot && participant.rackTiles && (
              <div 
                className={`
                  flex gap-0.5 items-center justify-center mt-1
                  ${visualPosition === 0 ? 'flex-row' : ''}
                  ${visualPosition === 1 ? 'flex-col' : ''}
                  ${visualPosition === 2 ? 'flex-row' : ''}
                  ${visualPosition === 3 ? 'flex-col' : ''}
                `}
              >
                {participant.rackTiles.slice(0, 14).map((_, idx) => (
                  <div 
                    key={`bot-tile-${seatPosition}-${idx}`}
                    className={`
                      bg-gradient-to-b from-orange-300 to-orange-500 dark:from-orange-500 dark:to-orange-700 
                      border border-orange-400 dark:border-orange-600 rounded-md shadow-md
                      flex items-center justify-center text-xs font-bold text-orange-900 dark:text-orange-100
                      ${visualPosition === 0 || visualPosition === 2 ? 'w-8 h-12' : 'w-12 h-8'}
                      hover:shadow-lg transition-shadow
                    `}
                    title="Hidden tile"
                  >
                    <div className="w-2 h-2 bg-orange-600 dark:bg-orange-300 rounded-full opacity-50"></div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Tile count indicator */}
            <div className="text-xs text-muted-foreground">
              {participant.isBot 
                ? `${participant.rackTiles?.length || 14} tiles`
                : `${playerState?.rack?.length || 13} tiles`}
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
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 flex">
      {/* Game Board Area - Left Side */}
      <div className="flex-1 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-[url('/api/placeholder/pattern')] bg-repeat"></div>
        </div>

        {/* Main game area */}
        <div className="relative w-full h-full min-h-screen p-6 pb-40">
        {/* Central game area - more rectangular */}
        <div className="absolute left-1/4 right-1/4 top-1/3 bottom-1/2 bg-green-700/80 backdrop-blur-sm rounded-2xl border-4 border-yellow-400/50 flex items-center justify-center">
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
        {[0, 1, 2, 3].map(seatPos => (
          <div key={`seat-${seatPos}`}>
            {renderPlayerPosition(seatPos)}
          </div>
        ))}

        {/* Discard area - center */}
        <div className="absolute left-1/2 top-2/5 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32">
          <DiscardArea 
            discards={gameState.gameState?.lastDiscardedTile ? [gameState.gameState.lastDiscardedTile] : []}
            lastDiscardedBySeat={gameState.gameState?.lastDiscardedBySeat}
            />
          </div>
        </div>
      </div>

      {/* Right Sidebar - Game Info & Controls */}
      <div className="w-80 bg-white dark:bg-gray-900 border-l border-border flex flex-col">
        {/* Connection Status */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center space-x-2">
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

        {/* Game Info */}
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-lg mb-3" data-testid="table-name">
            {gameState.table.name}
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Status:</span>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex justify-between">
              <span>Round Number:</span>
              <span>1</span>
            </div>
            <div className="flex justify-between">
              <span>Bots:</span>
              <span>3</span>
            </div>
            <div className="flex justify-between">
              <span>Players:</span>
              <div className="text-right">
                {gameState.participants
                  .filter(p => !p.isBot && p.userId)
                  .map(p => (
                    <div key={p.userId}>
                      {p.userId === gameState.myPlayer?.userId ? 'You' : p.displayName || p.userId}
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>

        {/* Action Tray */}
        {gameState.myPlayer && (
          <div className="p-4 border-b border-border">
            <ActionTray 
              gameState={gameState}
              onAction={(action, data) => {
                switch (action) {
                  case 'charleston_decision':
                    actions.charlestonDecision(data.decision);
                    break;
                  case 'charleston_confirm':
                    const receivedTileIds = gameState.charlestonInfo?.receivedTiles?.map(t => t.id) || [];
                    const tilesToPass = exposedRack.filter(tile => !receivedTileIds.includes(tile.id));
                    const isCourtesy = gameState.gameState?.charlestonPhase === 7;
                    if (isCourtesy ? (tilesToPass.length <= 3) : (tilesToPass.length === 3)) {
                      const nonJokerTiles = tilesToPass.filter(tile => !tile.isJoker);
                      if (nonJokerTiles.length === tilesToPass.length) {
                        actions.passTiles(nonJokerTiles);
                        setExposedRack(prev => prev.filter(tile => 
                          !tilesToPass.some(passed => passed.id === tile.id)
                        ));
                      } else {
                        toast({
                          title: "Cannot Pass Jokers",
                          description: "Jokers cannot be passed during Charleston.",
                          variant: "destructive"
                        });
                      }
                    } else {
                      toast({
                        title: isCourtesy ? "Too Many Tiles" : "Select 3 Tiles",
                        description: isCourtesy 
                          ? `Courtesy pass allows up to 3 tiles. You have ${tilesToPass.length} tiles selected.`
                          : `You need exactly 3 tiles in your exposed rack to pass.`,
                        variant: "destructive"
                      });
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
          </div>
        )}

        {/* Game Assistance */}
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold mb-3 flex items-center">
            <Lightbulb className="w-4 h-4 mr-2" />
            Game Help
          </h3>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">
              Get Hint
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              Suggested Hand
            </Button>
            <div className="flex items-center justify-between pt-1">
              <label className="text-sm">Turn on Coach</label>
              <input type="checkbox" className="rounded" />
            </div>
          </div>
        </div>

        {/* Game Controls */}
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold mb-3 flex items-center">
            <Crown className="w-4 h-4 mr-2" />
            Game Controls
          </h3>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">
              New Game
            </Button>
            <Button variant="destructive" size="sm" className="w-full justify-start">
              End Game
            </Button>
          </div>
        </div>

        {/* Settings */}
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold mb-3 flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </h3>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">
              Tile Theme
            </Button>
          </div>
        </div>

        {/* Chat - moved to bottom */}
        <div className="mt-auto p-4">
          <h3 className="font-semibold mb-3 flex items-center">
            <MessageSquare className="w-4 h-4 mr-2" />
            Table Chat
          </h3>
          <div className="h-64">
            <GameChat 
              tableId={tableId!}
              onSendMessage={actions.sendChatMessage}
            />
          </div>
        </div>
      </div>

      {/* Player Tile Racks - Bottom Section */}
      {gameState.myPlayer && (
        <div className="fixed bottom-0 left-0 right-80 bg-card/95 backdrop-blur-sm border-t p-3">
          <div className="space-y-2">

            {/* Exposed Rack - contains received tiles and selected tiles for passing */}
            {(exposedRack.length > 0 || isCharlestonPhase) && (
              <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Exposed Rack - Click to move to main rack
                  </h4>
                  {isCharlestonPhase ? (
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => {
                        const receivedTileIds = gameState.charlestonInfo?.receivedTiles?.map(t => t.id) || [];
                        const tilesToPass = exposedRack.filter(tile => !receivedTileIds.includes(tile.id));
                        const isCourtesy = gameState.gameState?.charlestonPhase === 7;
                        if (isCourtesy ? (tilesToPass.length <= 3) : (tilesToPass.length === 3)) {
                          const nonJokerTiles = tilesToPass.filter(tile => !tile.isJoker);
                          if (nonJokerTiles.length === tilesToPass.length) {
                            actions.passTiles(nonJokerTiles);
                            setExposedRack(prev => prev.filter(tile => 
                              !tilesToPass.some(passed => passed.id === tile.id)
                            ));
                          } else {
                            toast({
                              title: "Cannot Pass Jokers",
                              description: "Jokers cannot be passed during Charleston.",
                              variant: "destructive"
                            });
                          }
                        } else {
                          toast({
                            title: isCourtesy ? "Too Many Tiles" : "Select 3 Tiles",
                            description: isCourtesy 
                              ? `Courtesy pass allows up to 3 tiles. You have ${tilesToPass.length} tiles selected.`
                              : `You need exactly 3 tiles in your exposed rack to pass.`,
                            variant: "destructive"
                          });
                        }
                      }}
                      data-testid="confirm-pass"
                    >
                      Confirm Pass
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {exposedRack.length} tiles
                    </Badge>
                  )}
                </div>
                <TileRack 
                  tiles={exposedRack}
                  onTileClick={(tile) => {
                    setExposedRack(prev => prev.filter(t => t.id !== tile.id));
                  }}
                  onTileSelect={(tile) => {
                    setExposedRack(prev => prev.filter(t => t.id !== tile.id));
                  }}
                  canInteract={true}
                  selectedTiles={[]}
                  maxSelection={3}
                />
              </div>
            )}

            {/* Main tile rack */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium">Your Main Rack</h4>
                <div className="text-xs text-muted-foreground">
                  {isCharlestonPhase ? 'Click tiles to move to exposed rack' : ''}
                  {isCharlestonPhase && exposedRack.length > 0 ? ' • Click exposed tiles above to move here' : ''}
                </div>
              </div>
              <TileRack 
                tiles={myTiles.filter(tile => !exposedRack.some(et => et.id === tile.id))}
                onTileClick={(tile) => {
                  if (isCharlestonPhase) {
                    setExposedRack(prev => [...prev, tile]);
                  } else if (gameState.isMyTurn) {
                    actions.discardTile(tile.id);
                  }
                }}
                onTileSelect={(tile) => {
                  if (isCharlestonPhase) {
                    setExposedRack(prev => [...prev, tile]);
                  }
                }}
                canInteract={isCharlestonPhase ? true : gameState.isMyTurn}
                selectedTiles={[]}
                maxSelection={3}
              />
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
