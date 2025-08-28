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

      case 'game_started':
        setGameState(prev => ({
          ...prev,
          currentGame: message.data.game,
          gameState: message.data.gameState,
          playerStates: message.data.playerStates
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

    const myPlayer = gameState.participants.find(p => p.userId === user.id);
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
        table: tableData.table,
        currentGame: tableData.currentGame,
        participants: tableData.participants
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
        data: { userId: user.id } 
      });
    }
  }, [user, isConnected, sendMessage]);

  // Game actions
  const actions: GameActions = {
    joinTable: useCallback((tableId: string) => {
      if (user && isConnected) {
        // Ensure authentication first, then join
        sendMessage({ 
          type: 'authenticate', 
          data: { userId: user.id } 
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
    }, [sendMessage, tableId])
  };

  return {
    gameState,
    actions,
    isLoading,
    isConnected
  };
}
