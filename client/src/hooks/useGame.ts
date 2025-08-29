import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "./useWebSocket";
import { useAuth } from "./useAuth";
import { GameTable, Game, GameParticipant, TileInfo, MeldInfo, PlayerStateInfo, GameStateInfo } from "@shared/schema";

export interface GameState {
  table?: GameTable;
  currentGame?: Game;
  participants: GameParticipant[];
  playerStates: { [seatPosition: number]: PlayerStateInfo };
  gameState?: GameStateInfo;
  isMyTurn: boolean;
  myPlayer?: GameParticipant;
  isConnected: boolean;
  error?: string;
  charlestonInfo?: {
    passComplete?: boolean;
    receivedTiles?: any[];
    [key: string]: any;
  };
}

export interface GameActions {
  joinTable: (tableId: string) => void;
  leaveTable: () => void;
  drawTile: () => void;
  discardTile: (tileId: string) => void;
  callTile: (callType: string) => void;
  exposeMeld: (tiles: TileInfo[], meldType: string) => void;
  passTiles: (tiles: TileInfo[]) => void;
  declareWin: () => void;
  sendChatMessage: (message: string) => void;
  setReady: (ready: boolean) => void;
}

export function useGame(tableId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [gameState, setGameState] = useState<GameState>({
    participants: [],
    playerStates: {},
    isMyTurn: false,
    isConnected: false
  });

  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'table_joined':
        setGameState(prev => ({
          ...prev,
          table: message.data.table,
          currentGame: message.data.currentGame,
          participants: message.data.participants,
          isConnected: true,
          error: undefined
        }));
        break;

      case 'player_joined':
        setGameState(prev => ({
          ...prev,
          participants: [...prev.participants, message.data.participant]
        }));
        break;

      case 'player_left':
        setGameState(prev => ({
          ...prev,
          participants: prev.participants.filter(p => p.userId !== message.data.userId)
        }));
        break;

      case 'game_action':
        setGameState(prev => ({
          ...prev,
          gameState: message.data.gameState,
          playerStates: message.data.playerStates || prev.playerStates,
          isMyTurn: message.data.isMyTurn || false
        }));
        break;

      case 'game_state_updated':
        setGameState(prev => {
          const newGameState = message.data.gameState;
          
          // Extract updated player states from gameState.players
          const updatedPlayerStates: Record<number, any> = {};
          if (newGameState?.players) {
            newGameState.players.forEach((player: any, index: number) => {
              updatedPlayerStates[index] = {
                rack: player.hand || [],
                melds: player.melded || [],
                discarded: player.discarded || [],
                flowers: player.flowers || []
              };
            });
          }
          
          return {
            ...prev,
            gameState: newGameState,
            playerStates: Object.keys(updatedPlayerStates).length > 0 
              ? updatedPlayerStates 
              : (message.data.playerStates || prev.playerStates),
            charlestonInfo: message.data.charleston
          };
        });
        break;

      case 'charleston_received_tiles':
        console.log('🀄 CHARLESTON RECEIVED TILES DEBUG:', message.data);
        console.log('🀄 Setting received tiles in state:', message.data.receivedTiles);
        // Update state with received tiles from Charleston pass
        setGameState(prev => {
          const newState = {
            ...prev,
            charlestonInfo: {
              ...prev.charlestonInfo,
              receivedTiles: message.data.receivedTiles,
              fromSeat: message.data.fromSeat,
              phase: message.data.phase,
              direction: message.data.direction
            }
          };
          console.log('🀄 Updated game state with charleston info:', newState.charlestonInfo);
          return newState;
        });
        break;

      case 'charleston_ended':
        console.log('🏁 Charleston ended! Transitioning to normal play');
        setGameState(prev => ({
          ...prev,
          gameState: { 
            ...prev.gameState, 
            phase: 'playing' 
          } as GameStateInfo,
          charlestonInfo: null // Clear Charleston info
        }));
        break;

      case 'charleston_decision_required':
        console.log('🛑 Charleston decision required:', message.data);
        setGameState(prev => ({
          ...prev,
          charlestonInfo: {
            ...prev.charlestonInfo,
            decisionRequired: true,
            decisionMessage: message.data.message
          }
        }));
        break;

      case 'charleston_decision_result':
        console.log('✅ Charleston decision result:', message.data);
        setGameState(prev => ({
          ...prev,
          gameState: message.data.gameState,
          charlestonInfo: {
            ...prev.charlestonInfo,
            decisionRequired: false,
            decisionMessage: message.data.message
          }
        }));
        break;

      case 'charleston_votes_updated':
        console.log('📊 Charleston votes updated:', message.data);
        setGameState(prev => ({
          ...prev,
          charlestonInfo: {
            ...prev.charlestonInfo,
            votesReceived: message.data.votesReceived,
            votesRequired: message.data.votesRequired
          }
        }));
        break;

      case 'charleston_phase_started':
        console.log('🔄 New Charleston phase started:', message.data);
        setGameState(prev => ({
          ...prev,
          gameState: message.data.gameState,
          charlestonInfo: {
            phase: message.data.phase,
            phaseName: message.data.phaseName,
            direction: message.data.direction,
            requiredTiles: message.data.requiredTiles,
            receivedTiles: null, // Clear previous received tiles
            passComplete: false,
            decisionRequired: false
          }
        }));
        break;

      case 'game_started':
        setGameState(prev => ({
          ...prev,
          table: message.data.table,
          currentGame: message.data.game,
          gameState: message.data.gameState,
          participants: message.data.participants || prev.participants,
          playerStates: message.data.playerStates || prev.playerStates
        }));
        break;

      case 'charleston_phase':
        setGameState(prev => ({
          ...prev,
          gameState: { ...prev.gameState, phase: 'charleston' } as GameStateInfo
        }));
        break;

      case 'hand_complete':
        setGameState(prev => ({
          ...prev,
          gameState: { ...prev.gameState, phase: 'finished' } as GameStateInfo
        }));
        break;

      case 'player_ready':
        setGameState(prev => ({
          ...prev,
          participants: prev.participants.map(p => 
            p.userId === message.data.userId 
              ? { ...p, isReady: message.data.ready }
              : p
          )
        }));
        break;

      case 'error':
        setGameState(prev => ({
          ...prev,
          error: message.data.message
        }));
        break;
    }
  }, []);

  const { isConnected, sendMessage } = useWebSocket(handleWebSocketMessage);

  // Update connection status
  useEffect(() => {
    setGameState(prev => ({ ...prev, isConnected }));
  }, [isConnected]);

  // Calculate my player and turn status
  useEffect(() => {
    if (!user || !gameState.participants.length) return;

    const myPlayer = gameState.participants.find(p => p.userId === (user as any)?.id);
    const isMyTurn = gameState.gameState?.currentPlayerIndex === myPlayer?.seatPosition;

    setGameState(prev => ({
      ...prev,
      myPlayer,
      isMyTurn: isMyTurn || false
    }));
  }, [user, gameState.participants, gameState.gameState]);

  // Fetch table data
  const { data: tableData, isLoading } = useQuery({
    queryKey: ['/api/tables', tableId],
    enabled: !!tableId,
    refetchInterval: 5000, // Refetch every 5 seconds for updates
  });

  useEffect(() => {
    if (tableData) {
      setGameState(prev => ({
        ...prev,
        table: (tableData as any)?.table,
        currentGame: (tableData as any)?.currentGame,
        participants: (tableData as any)?.participants || []
      }));
    }
  }, [tableData]);

  // Mutations for game actions
  const joinTableMutation = useMutation({
    mutationFn: async (tableId: string) => {
      sendMessage({ type: 'join_table', data: { tableId } });
    }
  });

  const leaveTableMutation = useMutation({
    mutationFn: async () => {
      sendMessage({ type: 'leave_table' });
    }
  });

  const sendChatMutation = useMutation({
    mutationFn: async (message: string) => {
      return await apiRequest('POST', `/api/tables/${tableId}/chat`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables', tableId, 'chat'] });
    }
  });

  // Authenticate WebSocket when user is available
  useEffect(() => {
    if (user && isConnected) {
      sendMessage({ 
        type: 'authenticate', 
        data: { userId: (user as any)?.id } 
      });
    }
  }, [user, isConnected, sendMessage]);

  // Auto-join table when page loads and WebSocket is connected
  useEffect(() => {
    console.log('Auto-join useEffect triggered. Values:', {
      tableId: !!tableId,
      user: !!user,
      isConnected,
      hasTable: !!gameState.table,
      tableStatus: gameState.table?.status,
      participants: gameState.participants?.length || 0
    });
    
    if (tableId && user && isConnected && gameState.participants?.length === 0) {
      console.log('Auto-joining table - Starting sequence:', { 
        tableId, 
        userId: (user as any)?.id, 
        isConnected,
        hasTable: !!gameState.table 
      });
      
      // Ensure authentication first, then join with longer delay
      sendMessage({ 
        type: 'authenticate', 
        data: { userId: (user as any)?.id } 
      });
      
      // Longer delay to ensure authentication completes
      setTimeout(() => {
        console.log('Auto-join: Sending join_table after auth delay');
        sendMessage({ 
          type: 'join_table', 
          data: { tableId } 
        });
      }, 500); // Increased from 200ms to 500ms
    }
  }, [tableId, user, isConnected, gameState.table, sendMessage]);

  // Game actions
  const actions: GameActions = {
    joinTable: useCallback((tableId: string) => {
      if (user && isConnected) {
        // Ensure authentication first, then join
        sendMessage({ 
          type: 'authenticate', 
          data: { userId: (user as any)?.id } 
        });
        setTimeout(() => {
          sendMessage({ type: 'join_table', data: { tableId } });
        }, 100); // Small delay to ensure auth is processed
      }
    }, [user, isConnected, sendMessage]),

    leaveTable: useCallback(() => {
      leaveTableMutation.mutate();
    }, [leaveTableMutation]),

    drawTile: useCallback(() => {
      if (!gameState.isMyTurn) return;
      sendMessage({
        type: 'game_action',
        data: { action: 'draw_tile' },
        tableId,
        gameId: gameState.currentGame?.id
      });
    }, [gameState.isMyTurn, gameState.currentGame?.id, sendMessage, tableId]),

    discardTile: useCallback((tileId: string) => {
      if (!gameState.isMyTurn) return;
      sendMessage({
        type: 'game_action',
        data: { action: 'discard_tile', tileId },
        tableId,
        gameId: gameState.currentGame?.id
      });
    }, [gameState.isMyTurn, gameState.currentGame?.id, sendMessage, tableId]),

    callTile: useCallback((callType: string) => {
      sendMessage({
        type: 'game_action',
        data: { action: 'call_tile', callType },
        tableId,
        gameId: gameState.currentGame?.id
      });
    }, [gameState.currentGame?.id, sendMessage, tableId]),

    exposeMeld: useCallback((tiles: TileInfo[], meldType: string) => {
      sendMessage({
        type: 'game_action',
        data: { action: 'expose_meld', tiles, meldType },
        tableId,
        gameId: gameState.currentGame?.id
      });
    }, [gameState.currentGame?.id, sendMessage, tableId]),

    passTiles: useCallback((tiles: TileInfo[]) => {
      sendMessage({
        type: 'charleston_pass',
        data: { tiles },
        tableId,
        gameId: gameState.currentGame?.id
      });
    }, [gameState.currentGame?.id, sendMessage, tableId]),

    declareWin: useCallback(() => {
      if (!gameState.isMyTurn) return;
      sendMessage({
        type: 'game_action',
        data: { action: 'declare_win' },
        tableId,
        gameId: gameState.currentGame?.id
      });
    }, [gameState.isMyTurn, gameState.currentGame?.id, sendMessage, tableId]),

    sendChatMessage: useCallback((message: string) => {
      sendChatMutation.mutate(message);
    }, [sendChatMutation]),

    setReady: useCallback((ready: boolean) => {
      sendMessage({
        type: 'ready_check',
        data: { ready },
        tableId
      });
    }, [sendMessage, tableId]),

    charlestonDecision: useCallback((decision: 'stop' | 'continue') => {
      sendMessage({
        type: 'charleston_decision',
        data: { decision },
        tableId,
        gameId: gameState.currentGame?.id
      });
    }, [sendMessage, tableId, gameState.currentGame?.id])
  };

  return {
    gameState,
    actions,
    isLoading,
    isConnected
  };
}
