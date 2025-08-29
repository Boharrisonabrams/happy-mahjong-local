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
          absolute flex flex-col items-center space-y-2 p-3 rounded-lg
          ${visualPosition === 0 ? 'top-8 left-1/2 transform -translate-x-1/2' : ''}
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

            {/* Bot tile rack display - face-down tiles for bots */}
            {participant.isBot && participant.rackTiles && (
              <div className="flex flex-wrap gap-0.5 max-w-32 justify-center">
                {participant.rackTiles.slice(0, 14).map((_, idx) => (
                  <div 
                    key={`bot-tile-${seatPosition}-${idx}`}
                    className="w-4 h-6 bg-gradient-to-b from-orange-400 to-orange-600 dark:from-orange-600 dark:to-orange-800 border border-orange-500 dark:border-orange-700 rounded-sm shadow-sm"
                    title="Hidden tile"
                  >
                    {/* Face-down tile back - no content visible */}
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
        {[0, 1, 2, 3].map(seatPos => (
          <div key={`seat-${seatPos}`}>
            {renderPlayerPosition(seatPos)}
          </div>
        ))}

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
            {/* Player's tile rack area */}
            <div className="lg:col-span-2 space-y-3">
              {/* Exposed Rack - contains received tiles and selected tiles for passing */}
              {(exposedRack.length > 0 || isCharlestonPhase) && (
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Exposed Rack - Click to move to main rack
                    </h4>
                    {isCharlestonPhase && (
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        {(() => {
                          const phase = gameState.gameState?.charlestonPhase || 1;
                          const phaseNames = {
                            1: 'Right Pass',
                            2: 'Across Pass', 
                            3: 'Left Pass',
                            4: 'Round 2: Left Pass',
                            5: 'Round 2: Across Pass',
                            6: 'Round 2: Right Pass', 
                            7: 'Courtesy Pass (0-3 tiles)'
                          };
                          return `${phaseNames[phase] || `Phase ${phase}`} • Tiles in exposed rack: ${exposedRack.length}`;
                        })()}
                      </div>
                    )}
                  </div>
                  <TileRack 
                    tiles={exposedRack}
                    onTileClick={(tile) => {
                      // Move tile from exposed rack back to main rack
                      setExposedRack(prev => prev.filter(t => t.id !== tile.id));
                    }}
                    onTileSelect={(tile) => {
                      // Same as click - just move tile back to main rack
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
                      // During Charleston: move tile to exposed rack
                      setExposedRack(prev => [...prev, tile]);
                    } else if (gameState.isMyTurn) {
                      // During normal play: discard tile
                      actions.discardTile(tile.id);
                    }
                  }}
                  onTileSelect={(tile) => {
                    if (isCharlestonPhase) {
                      // Same as click - move tile to exposed rack
                      setExposedRack(prev => [...prev, tile]);
                    }
                  }}
                  canInteract={isCharlestonPhase ? true : gameState.isMyTurn}
                  selectedTiles={[]}
                  maxSelection={3}
                />
              </div>
            </div>

            {/* Action tray and chat */}
            <div className="space-y-4">
              <ActionTray 
                gameState={gameState}
                onAction={(action, data) => {
                  switch (action) {
                    case 'charleston_decision':
                      // Handle Stop/Continue decision for Round 2
                      actions.sendMessage({
                        type: 'charleston_decision',
                        data: { decision: data.decision } // 'stop' or 'continue'
                      });
                      break;
                    
                    case 'charleston_confirm':
                      // Find tiles that are in exposed rack but NOT received tiles (these are the ones to pass)
                      const receivedTileIds = gameState.charlestonInfo?.receivedTiles?.map(t => t.id) || [];
                      const tilesToPass = exposedRack.filter(tile => !receivedTileIds.includes(tile.id));
                      
                      // Check if this is Courtesy pass (phase 7) which allows 0-3 tiles
                      const isCourtesy = gameState.gameState?.charlestonPhase === 7;
                      const requiredTiles = isCourtesy ? 'up to 3' : 'exactly 3';
                      
                      if (isCourtesy ? (tilesToPass.length <= 3) : (tilesToPass.length === 3)) {
                        // Filter out jokers - no jokers may be passed per Charleston rules
                        const nonJokerTiles = tilesToPass.filter(tile => !tile.isJoker);
                        if (nonJokerTiles.length === tilesToPass.length) {
                          console.log('Charleston pass: Sending tiles to server:', nonJokerTiles);
                          actions.passTiles(nonJokerTiles);
                          // Clear passed tiles from exposed rack
                          setExposedRack(prev => prev.filter(tile => 
                            !tilesToPass.some(passed => passed.id === tile.id)
                          ));
                        } else {
                          toast({
                            title: "Cannot Pass Jokers",
                            description: "Jokers cannot be passed during Charleston. Please select non-joker tiles only.",
                            variant: "destructive"
                          });
                        }
                      } else {
                        toast({
                          title: isCourtesy ? "Too Many Tiles" : "Select 3 Tiles",
                          description: isCourtesy 
                            ? `Courtesy pass allows up to 3 tiles. You have ${tilesToPass.length} tiles selected.`
                            : `You need exactly 3 tiles in your exposed rack to pass. Currently have ${tilesToPass.length} tiles.`,
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
