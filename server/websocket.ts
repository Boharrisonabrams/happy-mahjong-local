import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';
import { gameEngine } from './services/gameEngine';
import { botService } from './services/botService';
import { analyticsService } from './services/analytics';
import { featureFlagService } from './services/featureFlags';

export interface WebSocketMessage {
  type: string;
  data?: any;
  tableId?: string;
  gameId?: string;
}

export interface ClientConnection {
  ws: WebSocket;
  userId?: string;
  sessionId: string;
  tableId?: string;
  isAlive: boolean;
  lastPing: number;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private tableClients: Map<string, Set<string>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      clientTracking: false
    });

    this.setupWebSocket();
    this.startHeartbeat();
  }

  private setupWebSocket(): void {
    console.log('=== WEBSOCKET SERVER STARTING ===');
    console.log('WebSocket server listening on port...');
    
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      console.log('=== NEW WEBSOCKET CONNECTION ===');
      console.log('Connection from:', req.socket.remoteAddress);
      
      const sessionId = this.generateSessionId();
      const clientId = sessionId;
      console.log('Assigned client ID:', clientId);

      const client: ClientConnection = {
        ws,
        sessionId,
        isAlive: true,
        lastPing: Date.now()
      };

      this.clients.set(clientId, client);

      // Setup message handling
      ws.on('message', async (message: Buffer) => {
        console.log('=== WEBSOCKET MESSAGE RECEIVED ===');
        console.log('Raw message:', message.toString());
        try {
          const data = JSON.parse(message.toString()) as WebSocketMessage;
          console.log('Parsed message:', data);
          console.log('Message type:', data.type);
          await this.handleMessage(clientId, data);
        } catch (error) {
          console.error('WebSocket message error:', error);
          this.sendToClient(clientId, {
            type: 'error',
            data: { message: 'Invalid message format' }
          });
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.handleClientDisconnect(clientId);
      });

      // Handle pong responses
      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.isAlive = true;
          client.lastPing = Date.now();
        }
      });

      // Send initial connection confirmation
      this.sendToClient(clientId, {
        type: 'connected',
        data: { sessionId }
      });
    });
  }

  private async handleMessage(clientId: string, message: WebSocketMessage): Promise<void> {
    console.log('=== HANDLE MESSAGE ===');
    console.log('Client ID:', clientId);
    console.log('Message:', message);
    
    const client = this.clients.get(clientId);
    if (!client) {
      console.log('No client found for ID:', clientId);
      return;
    }

    console.log('Processing message type:', message.type);
    switch (message.type) {
      case 'authenticate':
        try {
          await this.handleAuthentication(clientId, message.data);
        } catch (error) {
          console.error('Authentication handler error:', error);
        }
        break;
      
      case 'join_table':
        console.log('SWITCH CASE: join_table received');
        await this.handleJoinTable(clientId, message.data);
        break;
      
      case 'leave_table':
        await this.handleLeaveTable(clientId, message.data);
        break;
      
      case 'game_action':
        await this.handleGameAction(clientId, message);
        break;
      
      case 'chat_message':
        await this.handleChatMessage(clientId, message.data);
        break;
      
      case 'ready_check':
        await this.handleReadyCheck(clientId, message.data);
        break;
      
      case 'charleston_pass':
        await this.handleCharlestonPass(clientId, message.data);
        break;
        
      case 'charleston_decision':
        await this.handleCharlestonDecision(clientId, message.data);
        break;
      
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  private async handleAuthentication(clientId: string, data: any): Promise<void> {
    console.log('=== HANDLE AUTHENTICATION ===');
    console.log('Client ID:', clientId);
    console.log('Data:', data);
    
    const client = this.clients.get(clientId);
    if (!client) {
      console.log('No client found during auth');
      return;
    }

    // In a real implementation, you'd validate the auth token
    // For now, we'll use the provided userId
    client.userId = data.userId;
    console.log('Set client.userId to:', client.userId);

    this.sendToClient(clientId, {
      type: 'authenticated',
      data: { userId: data.userId }
    });
    console.log('Sent authenticated response');
  }

  private async handleJoinTable(clientId: string, data: any): Promise<void> {
    console.log('=== HANDLE JOIN TABLE ===');
    console.log('Client ID:', clientId);
    console.log('Data:', data);
    
    const client = this.clients.get(clientId);
    if (!client) {
      console.log('No client found for join_table:', clientId);
      return;
    }
    if (!client.userId) {
      console.log('No userId set for client:', clientId, 'client exists:', !!client);
      return;
    }
    console.log('Auth check passed - client.userId:', client.userId);

    const { tableId } = data;
    console.log('User', client.userId, 'joining table', tableId);
    
    try {
      console.log('Getting table from storage...');
      console.log('Storage object:', !!storage);
      console.log('Storage.getGameTable:', !!storage?.getGameTable);
      const table = await storage.getGameTable(tableId);
      if (!table) {
        console.log('Table not found:', tableId);
        this.sendToClient(clientId, {
          type: 'error',
          data: { message: 'Table not found' }
        });
        return;
      }
      console.log('Table found:', table.id, 'gameMode:', table.gameMode);

      // Add client to table
      client.tableId = tableId;
      
      if (!this.tableClients.has(tableId)) {
        this.tableClients.set(tableId, new Set());
      }
      this.tableClients.get(tableId)!.add(clientId);

      // Get current game state
      console.log('Getting current game state...');
      console.log('table.currentGameId:', table.currentGameId);
      const currentGame = table.currentGameId ? await storage.getGame(table.currentGameId) : null;
      console.log('Current game:', currentGame?.id || 'none');
      const participants = currentGame ? await storage.getGameParticipants(currentGame.id) : [];
      console.log('Current participants:', participants.length);

      // Send table state to client
      this.sendToClient(clientId, {
        type: 'table_joined',
        data: {
          table,
          currentGame,
          participants
        }
      });

      // Notify other clients in the table
      this.broadcastToTable(tableId, {
        type: 'player_joined',
        data: { userId: client.userId }
      }, clientId);

      // Track analytics
      console.log('Tracking analytics...');
      try {
        await analyticsService.trackTableJoined(
          client.userId,
          tableId,
          client.sessionId,
          table.isPrivate || false,
          participants.length + 1
        );
        console.log('Analytics tracked successfully');
      } catch (analyticsError) {
        console.error('Analytics error (non-fatal):', analyticsError);
      }

      // Auto-add bots based on table configuration and ensure user is added
      console.log('Checking bot addition conditions:');
      console.log('- table.gameMode:', table.gameMode);
      console.log('- table.botDifficulty:', table.botDifficulty);
      
      if ((table.gameMode === 'single-player' && table.botDifficulty)) {
        console.log('Calling autoAddBotsToTable...');
        await this.autoAddBotsToTable(table, currentGame, client.userId);
      } else {
        console.log('Not adding bots, adding player only');
        // For regular multiplayer, just add the human player
        await this.ensurePlayerParticipant(client.userId, table, currentGame);
      }

    } catch (error) {
      console.error('Error joining table:', error);
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: 'Failed to join table' }
      });
    }
  }

  private async handleLeaveTable(clientId: string, data: any): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.tableId) return;

    const tableId = client.tableId;
    
    // Remove client from table
    this.tableClients.get(tableId)?.delete(clientId);
    client.tableId = undefined;

    // Notify other clients
    this.broadcastToTable(tableId, {
      type: 'player_left',
      data: { userId: client.userId }
    }, clientId);

    // Track analytics
    if (client.userId) {
      await analyticsService.trackTableLeft(
        client.userId,
        tableId,
        client.sessionId,
        0 // Would calculate actual session duration
      );
    }
  }

  private async handleGameAction(clientId: string, message: WebSocketMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.userId || !client.tableId) return;

    const { action, data } = message.data;

    try {
      // Get current game
      const table = await storage.getGameTable(client.tableId);
      if (!table || !table.currentGameId) return;

      const game = await storage.getGame(table.currentGameId);
      if (!game) return;

      const participants = await storage.getGameParticipants(game.id);
      const currentPlayer = participants.find(p => p.userId === client.userId);
      if (!currentPlayer) return;

      // Process the action based on type
      let actionResult;
      switch (action) {
        case 'draw_tile':
          actionResult = await this.processDrawTile(game, currentPlayer, data);
          break;
        case 'discard_tile':
          actionResult = await this.processDiscardTile(game, currentPlayer, data);
          break;
        case 'call_tile':
          actionResult = await this.processCallTile(game, currentPlayer, data);
          break;
        case 'expose_meld':
          actionResult = await this.processExposeMeld(game, currentPlayer, data);
          break;
        default:
          console.warn(`Unknown game action: ${action}`);
          return;
      }

      if (actionResult) {
        // Log the action
        await storage.logGameAction({
          gameId: game.id,
          playerId: client.userId,
          actionType: action,
          actionData: data,
          gameStateBefore: JSON.stringify(game.gameState),
          gameStateAfter: JSON.stringify(actionResult.newGameState)
        });

        // Update game state
        await storage.updateGame(game.id, {
          gameState: actionResult.newGameState,
          currentPlayerIndex: actionResult.nextPlayerIndex
        });

        // Broadcast action to all players in the table
        this.broadcastToTable(client.tableId, {
          type: 'game_action',
          data: {
            action,
            playerId: client.userId,
            result: actionResult,
            gameState: actionResult.newGameState
          }
        });

        // Handle bot turns if next player is a bot
        const nextParticipant = participants[actionResult.nextPlayerIndex];
        if (nextParticipant?.isBot) {
          setTimeout(() => {
            this.processBotTurn(game.id, nextParticipant);
          }, botService.getBotResponseDelay('standard'));
        }
      }

    } catch (error) {
      console.error('Error processing game action:', error);
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: 'Failed to process game action' }
      });
    }
  }

  private async handleChatMessage(clientId: string, data: any): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.userId || !client.tableId) return;

    // Check if chat is enabled
    const chatEnabled = await featureFlagService.isFeatureEnabled('chat_enabled', client.userId);
    if (!chatEnabled) {
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: 'Chat is currently disabled' }
      });
      return;
    }

    try {
      // Store chat message
      const message = await storage.createChatMessage({
        tableId: client.tableId,
        userId: client.userId,
        message: data.message
      });

      // Broadcast to all clients in the table
      this.broadcastToTable(client.tableId, {
        type: 'chat_message',
        data: message
      });

    } catch (error) {
      console.error('Error handling chat message:', error);
    }
  }

  private async handleReadyCheck(clientId: string, data: any): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.userId || !client.tableId) return;

    try {
      // Update player ready status
      // This would involve updating the game participant record
      
      // Broadcast ready status to table
      this.broadcastToTable(client.tableId, {
        type: 'player_ready',
        data: { userId: client.userId, ready: data.ready }
      });

    } catch (error) {
      console.error('Error handling ready check:', error);
    }
  }

  private async processBotCharlestonPasses(participants: any[], gameState: any, passDirection: string, phase: number = 1): Promise<{ [playerSeat: number]: any[] }> {
    console.log('=== PROCESSING BOT CHARLESTON PASSES ===');
    const directionMap: Record<string, number> = { 'right': 1, 'across': 2, 'left': 3 };
    const receivedTilesInfo: { [playerSeat: number]: any[] } = {};
    
    // Process all bots
    for (const participant of participants) {
      if (!participant.isBot) continue;
      
      console.log(`Processing Charleston pass for bot ${participant.seatPosition}`);
      
      // Get bot's current hand
      const botHand = gameState.players[participant.seatPosition].hand;
      if (botHand.length < 3) {
        console.log(`Bot ${participant.seatPosition} doesn't have enough tiles`);
        continue;
      }

      // Create bot state for decision making
      const botState = {
        rack: botHand,
        melds: gameState.players[participant.seatPosition].melded || [],
        discarded: gameState.players[participant.seatPosition].discarded || [],
        flowers: gameState.players[participant.seatPosition].flowers || []
      };

      // Get bot's difficulty from seat settings
      const difficulty = 'standard'; // Default to standard for now
      
      // Let bot decide which tiles to pass
      let tilesToPass = botService.decideBotCharlestonPass(botState, 0, difficulty);
      
      if (phase === 7) {
        // Courtesy pass: bots can pass 0-3 tiles
        const courtesyCount = Math.floor(Math.random() * 4); // 0, 1, 2, or 3 tiles
        tilesToPass = tilesToPass.slice(0, courtesyCount);
        console.log(`Bot ${participant.seatPosition} courtesy passing ${courtesyCount} tiles`);
      } else {
        // Regular passes: exactly 3 tiles
        if (tilesToPass.length !== 3) {
          console.log(`Bot ${participant.seatPosition} didn't select 3 tiles, selecting first 3`);
          // Fallback: pass first 3 non-joker tiles
          const safeTiles = botHand.filter((t: any) => !t.isJoker && !t.isFlower).slice(0, 3);
          tilesToPass.splice(0, tilesToPass.length, ...safeTiles);
        }
      }

      console.log(`Bot ${participant.seatPosition} passing tiles:`, tilesToPass.map((t: any) => `${t.suit}-${t.value}`));

      // Find receiving player for this bot
      const receiverIndex = (participant.seatPosition + (directionMap[passDirection] || 1)) % 4;
      const receivingHand = gameState.players[receiverIndex].hand;
      
      // Track which tiles this receiver gets
      if (!receivedTilesInfo[receiverIndex]) {
        receivedTilesInfo[receiverIndex] = [];
      }
      receivedTilesInfo[receiverIndex].push(...tilesToPass);
      
      // Remove tiles from bot's hand
      tilesToPass.forEach((tile: any) => {
        const index = botHand.findIndex((h: any) => h.id === tile.id);
        if (index !== -1) {
          botHand.splice(index, 1);
        }
      });
      
      // Add tiles to receiving player
      receivingHand.push(...tilesToPass);
      
      console.log(`Bot Charleston: ${participant.seatPosition} → ${receiverIndex} (${passDirection})`);
    }
    
    return receivedTilesInfo;
  }

  private getCharlestonSender(receiverSeat: number, direction: string): number {
    // Determine who sent tiles to this receiver based on direction
    switch (direction) {
      case 'right': // Receiver gets from left
        return (receiverSeat + 3) % 4;
      case 'left': // Receiver gets from right  
        return (receiverSeat + 1) % 4;
      case 'across': // Receiver gets from across
        return (receiverSeat + 2) % 4;
      default:
        return (receiverSeat + 2) % 4;
    }
  }

  private getCharlestonDirectionForPhase(phase: number): string {
    switch (phase) {
      case 1: return 'right';   // Round 1: Right
      case 2: return 'across';  // Round 1: Across  
      case 3: return 'left';    // Round 1: Left
      case 4: return 'left';    // Round 2: Left
      case 5: return 'across';  // Round 2: Across
      case 6: return 'right';   // Round 2: Right
      case 7: return 'across';  // Courtesy: Across
      default: return 'right';
    }
  }

  private getCharlestonPhaseName(phase: number): string {
    switch (phase) {
      case 1: return 'Round 1 Phase 1: Pass to East (Right)';
      case 2: return 'Round 1 Phase 2: Pass to North (Across)';  
      case 3: return 'Round 1 Phase 3: Pass to West (Left)';
      case 4: return 'Round 2 Phase 1: Pass to West (Left)';
      case 5: return 'Round 2 Phase 2: Pass to North (Across)';
      case 6: return 'Round 2 Phase 3: Pass to East (Right)';
      case 7: return 'Courtesy Pass: Pass to North (0-3 tiles)';
      default: return 'Charleston Phase';
    }
  }

  private async handleCharlestonPass(clientId: string, data: any): Promise<void> {
    console.log('=== HANDLE CHARLESTON PASS ===');
    console.log('Client ID:', clientId);
    console.log('Data:', data);
    
    const client = this.clients.get(clientId);
    if (!client || !client.userId || !client.tableId) {
      console.log('Charleston pass: No client, userId, or tableId');
      return;
    }

    try {
      console.log('Processing Charleston pass for user', client.userId, 'with tiles:', data.tiles);
      
      // Get current game
      const table = await storage.getGameTable(client.tableId);
      if (!table || !table.currentGameId) {
        console.log('No active game for Charleston pass');
        return;
      }

      const game = await storage.getGame(table.currentGameId);
      if (!game) {
        console.log('Game not found');
        return;
      }

      const participants = await storage.getGameParticipants(game.id);
      const currentPlayer = participants.find(p => p.userId === client.userId);
      if (!currentPlayer) {
        console.log('Player not in game');
        return;
      }

      // Parse current game state
      const gameState = typeof game.gameState === 'string' ? JSON.parse(game.gameState) : game.gameState;
      
      // VALIDATE TILE COUNT BASED ON PHASE
      const currentPhase = gameState.charlestonPhase || 1;
      if (currentPhase === 7) {
        // Courtesy pass: 0-3 tiles allowed
        if (data.tiles.length > 3) {
          console.log('Courtesy pass: Too many tiles');
          return;
        }
      } else {
        // Regular passes: exactly 3 tiles required
        if (data.tiles.length !== 3) {
          console.log('Regular Charleston: Must pass exactly 3 tiles');
          return;
        }
      }
      
      // Find receiving player (Right pass: +1, Across: +2, Left: +3)
      // Get pass direction based on proper Charleston flow
      const getCharlestonDirection = (phase: number): string => {
        switch (phase) {
          case 1: return 'right';   // Round 1: Right
          case 2: return 'across';  // Round 1: Across  
          case 3: return 'left';    // Round 1: Left
          case 4: return 'left';    // Round 2: Left
          case 5: return 'across';  // Round 2: Across
          case 6: return 'right';   // Round 2: Right
          case 7: return 'across';  // Courtesy: Across
          default: return 'right';
        }
      };
      const passDirection = getCharlestonDirection(gameState.charlestonPhase || 1);
      const directionMap: Record<string, number> = { 'right': 1, 'across': 2, 'left': 3 };
      const receiverIndex = (currentPlayer.seatPosition + (directionMap[passDirection] || 1)) % 4;
      const receivingPlayer = participants.find(p => p.seatPosition === receiverIndex);
      
      if (!receivingPlayer) {
        console.log('No receiving player found');
        return;
      }

      console.log(`Charleston: ${currentPlayer.seatPosition} → ${receivingPlayer.seatPosition} (${passDirection})`);

      // Update player hands
      const currentHand = gameState.players[currentPlayer.seatPosition].hand;
      const receivingHand = gameState.players[receivingPlayer.seatPosition].hand;
      
      // Remove tiles from current player
      data.tiles.forEach((tile: any) => {
        const index = currentHand.findIndex((h: any) => h.id === tile.id);
        if (index !== -1) {
          currentHand.splice(index, 1);
        }
      });
      
      // Add tiles to receiving player
      receivingHand.push(...data.tiles);
      
      console.log(`Transferred ${data.tiles.length} tiles from player ${currentPlayer.seatPosition} to ${receivingPlayer.seatPosition}`);

      // AUTO-COMPLETE CHARLESTON: Trigger bot passes for this round
      const receivedTilesInfo = await this.processBotCharlestonPasses(participants, gameState, passDirection, currentPhase);

      // Update game state
      await storage.updateGame(game.id, {
        gameState: JSON.stringify(gameState)
      });

      console.log('Charleston received tiles info:', receivedTilesInfo);
      
      // Send specific received tiles message to each player
      console.log('=== SENDING CHARLESTON RECEIVED TILES ===');
      console.log('All participants:', participants.map(p => ({ seat: p.seatPosition, userId: p.userId, isBot: p.isBot })));
      console.log('Available clients:', Array.from(this.clients.keys()));
      
      for (const participant of participants) {
        if (participant.isBot) continue; // Skip bots
        
        // Find client by searching through all clients for matching userId
        let foundClient = null;
        for (const [clientId, client] of this.clients.entries()) {
          if (client.userId === participant.userId) {
            foundClient = client;
            console.log(`✅ Found client for user ${participant.userId}: ${clientId}`);
            break;
          }
        }
        
        console.log(`Checking participant ${participant.seatPosition}: userId=${participant.userId}, foundClient=${!!foundClient}, hasReceivedTiles=${!!receivedTilesInfo[participant.seatPosition]}`);
        
        if (foundClient && receivedTilesInfo[participant.seatPosition]) {
          console.log(`✅ SENDING received tiles to player ${participant.seatPosition}:`, receivedTilesInfo[participant.seatPosition]);
          const message = {
            type: 'charleston_received_tiles',
            data: {
              receivedTiles: receivedTilesInfo[participant.seatPosition],
              fromSeat: this.getCharlestonSender(participant.seatPosition, passDirection),
              phase: gameState.charlestonPhase,
              direction: passDirection
            }
          };
          console.log(`📤 Sending charleston_received_tiles message:`, message);
          foundClient.ws.send(JSON.stringify(message));
        } else {
          console.log(`❌ Cannot send to participant ${participant.seatPosition}: foundClient=${!!foundClient}, hasReceivedTiles=${!!receivedTilesInfo[participant.seatPosition]}`);
        }
      }
      
      // Broadcast updated game state to all players (but without received tiles in general broadcast)
      this.broadcastToTable(client.tableId, {
        type: 'game_state_updated',
        data: { 
          gameState,
          charleston: {
            passComplete: true,
            from: currentPlayer.seatPosition,
            to: receivingPlayer.seatPosition,
            tiles: data.tiles.length,
            direction: passDirection,
            phase: gameState.charlestonPhase
          }
        }
      });

      // INCREMENT CHARLESTON PHASE
      const nextPhase = currentPhase + 1;
      
      console.log(`Charleston phase incremented from ${currentPhase} to ${nextPhase}`);
      
      // HANDLE CHARLESTON DECISION POINTS
      if (currentPhase === 3) {
        // After Round 1 (Left pass) - Stop or Continue decision required from ALL players
        console.log('🛑 Round 1 complete. Waiting for Stop/Continue decision from all players...');
        gameState.charlestonPhase = 3.5; // Special phase for decision
        gameState.charlestonDecision = {
          status: 'pending',
          votes: {}, // Will collect votes from each player
          requiredVotes: 4 // All 4 players must vote
        };
        
        // Broadcast decision request to all players
        this.broadcastToTable(client.tableId, {
          type: 'charleston_decision_required',
          data: { 
            message: 'Round 1 complete! Do you want to continue to Round 2?',
            phase: 'stop_or_continue'
          }
        });
        
        // In single-player mode, auto-vote for bots to continue
        const table = await storage.getTable(client.tableId);
        const isPrivateTable = table && table.isPrivate;
        
        if (isPrivateTable) {
          console.log('🤖 Single-player mode: Auto-voting for bots to continue to Round 2');
          
          // Auto-vote for all 3 bot players (seats 1, 2, 3 - assuming user is seat 0)
          for (const player of gameState.players) {
            if (player.seatPosition !== 0) { // Not the human user
              gameState.charlestonDecision!.votes[player.seatPosition] = 'continue';
              console.log(`🤖 Bot at seat ${player.seatPosition} auto-voted: continue`);
            }
          }
          
          // Check if we now have enough votes (3 bots + waiting for 1 human)
          const currentVotes = Object.keys(gameState.charlestonDecision!.votes).length;
          console.log(`🗳️ Current votes: ${currentVotes}/4 required votes`);
          
          // If only human vote is missing, they'll vote manually via UI
          // If all votes collected, handle in the charleston_decision handler
        }
        
        // Don't increment phase yet - wait for all player decisions
        return;
        
      } else if (currentPhase === 6) {
        // After Round 2 (Right pass) - Move to Courtesy
        console.log('🎭 Round 2 complete. Moving to Courtesy pass...');
        gameState.charlestonPhase = 7;
        
        // Broadcast Courtesy pass started
        const newDirection = this.getCharlestonDirectionForPhase(7);
        const newPhaseName = this.getCharlestonPhaseName(7);
        
        console.log(`🔄 Broadcasting Courtesy phase (${newPhaseName} - ${newDirection}) to all players`);
        
        this.broadcastToTable(client.tableId, {
          type: 'charleston_phase_started',
          data: { 
            phase: 7,
            phaseName: newPhaseName,
            direction: newDirection,
            requiredTiles: 0, // Courtesy allows 0-3 tiles
            gameState
          }
        });
        
      } else if (currentPhase === 7) {
        // After Courtesy pass - End Charleston
        console.log('🏁 Courtesy pass complete. Charleston ending...');
        gameState.charlestonPhase = 8; // Will trigger end condition below
        
      } else {
        // Normal phase increment
        gameState.charlestonPhase = nextPhase;
        
        // Broadcast new phase started to all players
        const newDirection = this.getCharlestonDirectionForPhase(nextPhase);
        const newPhaseName = this.getCharlestonPhaseName(nextPhase);
        
        console.log(`🔄 Broadcasting new Charleston phase ${nextPhase} (${newPhaseName} - ${newDirection}) to all players`);
        
        this.broadcastToTable(client.tableId, {
          type: 'charleston_phase_started',
          data: { 
            phase: nextPhase,
            phaseName: newPhaseName,
            direction: newDirection,
            requiredTiles: nextPhase === 7 ? 0 : 3, // Courtesy allows 0-3 tiles
            gameState
          }
        });
      }
      
      // Update the game state in storage FIRST  
      await storage.updateGame(game.id, {
        gameState: JSON.stringify(gameState)
      });
      
      // CHECK IF CHARLESTON SHOULD END
      if (gameState.charlestonPhase >= 8) {
        console.log('🏁 Charleston sequence completed! Transitioning to normal play...');
        
        // End Charleston - transition to playing phase
        gameState.phase = 'playing';
        delete gameState.charlestonPhase;
        
        // Move all tiles from exposed rack back to main rack for all players
        // (This will be handled on the client side when they receive the phase change)
        
        console.log('✅ Game transitioned from Charleston to Playing phase');
        
        // Broadcast phase transition
        this.broadcastToTable(client.tableId, {
          type: 'charleston_ended',
          data: { 
            gameState,
            message: 'Charleston completed! Game begins now.' 
          }
        });
        
        // Update the game state in storage
        await storage.updateGame(game.id, {
          gameState: JSON.stringify(gameState)
        });
      }

      console.log('Charleston pass completed successfully');

    } catch (error) {
      console.error('Error handling Charleston pass:', error);
    }
  }

  // Charleston decision handler
  private async handleCharlestonDecision(clientId: string, data: any): Promise<void> {
    console.log('=== HANDLE CHARLESTON DECISION ===');
    console.log('Client ID:', clientId, 'Decision:', data.decision);
    
    const client = this.clients.get(clientId);
    if (!client || !client.userId || !client.tableId) {
      console.log('Decision: No client, userId, or tableId');
      return;
    }

    try {
      // Get current game
      const table = await storage.getGameTable(client.tableId);
      if (!table || !table.currentGameId) {
        console.log('No active game for Charleston decision');
        return;
      }

      const game = await storage.getGame(table.currentGameId);
      if (!game) {
        console.log('Game not found');
        return;
      }

      const participants = await storage.getGameParticipants(game.id);
      const currentPlayer = participants.find(p => p.userId === client.userId);
      if (!currentPlayer) {
        console.log('Player not in game');
        return;
      }

      // Parse current game state
      const gameState = typeof game.gameState === 'string' ? JSON.parse(game.gameState) : game.gameState;
      
      if (!gameState.charlestonDecision || gameState.charlestonDecision.status !== 'pending') {
        console.log('No pending Charleston decision');
        return;
      }

      // Record the vote
      gameState.charlestonDecision.votes[currentPlayer.seatPosition] = data.decision; // 'continue' or 'stop'
      console.log(`Player ${currentPlayer.seatPosition} voted: ${data.decision}`);

      // Automatically vote for bots (they randomly decide)
      for (const participant of participants) {
        if (participant.isBot && !gameState.charlestonDecision.votes.hasOwnProperty(participant.seatPosition)) {
          const botDecision = Math.random() > 0.3 ? 'continue' : 'stop'; // 70% chance to continue
          gameState.charlestonDecision.votes[participant.seatPosition] = botDecision;
          console.log(`Bot ${participant.seatPosition} voted: ${botDecision}`);
        }
      }

      const voteCount = Object.keys(gameState.charlestonDecision.votes).length;
      console.log(`Votes collected: ${voteCount}/${gameState.charlestonDecision.requiredVotes}`);

      // Check if all votes are collected
      if (voteCount >= gameState.charlestonDecision.requiredVotes) {
        const votes = Object.values(gameState.charlestonDecision.votes);
        const continueVotes = votes.filter(v => v === 'continue').length;
        const stopVotes = votes.filter(v => v === 'stop').length;

        console.log(`Final vote tally: Continue=${continueVotes}, Stop=${stopVotes}`);

        // Unanimous agreement required to continue
        if (continueVotes === 4) {
          // All players want to continue - proceed to Round 2
          console.log('🔄 Unanimous Continue! Proceeding to Round 2...');
          gameState.charlestonPhase = 4; // Phase 4: Round 2 Left pass
          gameState.charlestonDecision = { status: 'continue' };
          
          this.broadcastToTable(client.tableId, {
            type: 'charleston_decision_result',
            data: { 
              result: 'continue',
              message: 'All players agreed to continue! Round 2 begins...',
              gameState
            }
          });
          
        } else {
          // At least one player wants to stop - skip to Courtesy pass
          console.log('🛑 One or more players voted Stop. Skipping to Courtesy pass...');
          gameState.charlestonPhase = 7; // Phase 7: Courtesy pass
          gameState.charlestonDecision = { status: 'stop' };
          
          this.broadcastToTable(client.tableId, {
            type: 'charleston_decision_result',
            data: { 
              result: 'stop',
              message: `Round 2 skipped (${stopVotes} Stop, ${continueVotes} Continue). Moving to Courtesy pass...`,
              gameState
            }
          });
        }

        // Update game state in storage
        await storage.updateGame(game.id, {
          gameState: JSON.stringify(gameState)
        });
      } else {
        // Still waiting for more votes
        console.log(`Waiting for ${gameState.charlestonDecision.requiredVotes - voteCount} more votes...`);
        
        // Update game state with current votes
        await storage.updateGame(game.id, {
          gameState: JSON.stringify(gameState)
        });
        
        // Broadcast vote update
        this.broadcastToTable(client.tableId, {
          type: 'charleston_votes_updated',
          data: { 
            votesReceived: voteCount,
            votesRequired: gameState.charlestonDecision.requiredVotes
          }
        });
      }

    } catch (error) {
      console.error('Error handling Charleston decision:', error);
    }
  }

  // Game action processors
  private async processDrawTile(game: any, player: any, data: any): Promise<any> {
    // Implement tile drawing logic
    return {
      newGameState: game.gameState,
      nextPlayerIndex: game.currentPlayerIndex
    };
  }

  private async processDiscardTile(game: any, player: any, data: any): Promise<any> {
    // Implement tile discarding logic
    return {
      newGameState: game.gameState,
      nextPlayerIndex: (game.currentPlayerIndex + 1) % 4
    };
  }

  private async processCallTile(game: any, player: any, data: any): Promise<any> {
    // Implement tile calling logic
    return {
      newGameState: game.gameState,
      nextPlayerIndex: player.seatPosition
    };
  }

  private async processExposeMeld(game: any, player: any, data: any): Promise<any> {
    // Implement meld exposure logic
    return {
      newGameState: game.gameState,
      nextPlayerIndex: (game.currentPlayerIndex + 1) % 4
    };
  }

  // Bot turn processing
  private async processBotTurn(gameId: string, botParticipant: any): Promise<void> {
    try {
      const game = await storage.getGame(gameId);
      if (!game) return;

      // Get bot decision
      const gameState = typeof game.gameState === 'string' ? JSON.parse(game.gameState) : game.gameState;
      const botAction = botService.decideBotAction(
        botParticipant,
        gameState as any,
        'standard', // Would get from table settings
        ['draw', 'discard'] // Would determine available actions
      );

      // Process bot action similar to player actions
      // This would trigger the same game state updates and broadcasts

    } catch (error) {
      console.error('Error processing bot turn:', error);
    }
  }

  // Utility methods
  private sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  private broadcastToTable(tableId: string, message: WebSocketMessage, excludeClientId?: string): void {
    const tableClientIds = this.tableClients.get(tableId);
    if (!tableClientIds) return;

    for (const clientId of Array.from(tableClientIds)) {
      if (clientId !== excludeClientId) {
        this.sendToClient(clientId, message);
      }
    }
  }

  private handleClientDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client && client.tableId) {
      this.tableClients.get(client.tableId)?.delete(clientId);
      
      // Notify table of disconnection
      this.broadcastToTable(client.tableId, {
        type: 'player_disconnected',
        data: { userId: client.userId }
      });
    }
    
    this.clients.delete(clientId);
  }

  // Heartbeat to detect dead connections
  private startHeartbeat(): void {
    setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          this.handleClientDisconnect(clientId);
          return;
        }
        
        client.isAlive = false;
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      });
    }, 30000); // 30 seconds
  }

  private async ensurePlayerParticipant(userId: string, table: any, currentGame: any): Promise<void> {
    try {
      // If no current game, we'll create one in autoAddBotsToTable
      if (!currentGame) return;

      // Check if player is already a participant
      const participants = await storage.getGameParticipants(currentGame.id);
      const existingParticipant = participants.find(p => p.userId === userId);
      
      if (!existingParticipant) {
        // Find an empty seat for the player
        const seatPosition = this.findEmptySeat(participants, table.maxPlayers || 4);
        if (seatPosition !== -1) {
          await storage.addGameParticipant({
            gameId: currentGame.id,
            userId: userId,
            botId: null,
            seatPosition,
            isBot: false,
            rackTiles: [],
            meldedTiles: [],
            discardedTiles: [],
            flowers: [],
            isReady: false
          });
        }
      }
    } catch (error) {
      console.error('Error ensuring player participant:', error);
    }
  }

  private async autoAddBotsToTable(table: any, currentGame: any, humanUserId?: string): Promise<void> {
    console.log('=== AUTO ADD BOTS TO TABLE ===');
    console.log('Table:', table.id, 'Game:', currentGame?.id, 'User:', humanUserId);
    try {
      // If no current game, create one
      if (!currentGame) {
        console.log('Creating new game...');
        // Create proper game state with players array
        const gameData = {
          tableId: table.id,
          seed: `${Date.now()}_${Math.random()}`,
          gameState: { 
            phase: 'charleston',
            currentPlayerIndex: 0, 
            wallCount: 144,
            players: [
              { hand: [], discarded: [], melded: [], flowers: [] },
              { hand: [], discarded: [], melded: [], flowers: [] },
              { hand: [], discarded: [], melded: [], flowers: [] },
              { hand: [], discarded: [], melded: [], flowers: [] }
            ],
            charleston: {
              currentPass: 'right',
              passesCompleted: 0,
              phase: 'passing'
            }
          }
        };
        console.log('Calling storage.createGame...');
        currentGame = await storage.createGame(gameData);
        console.log('Game created:', currentGame.id);
        
        // Update table with current game
        console.log('Updating table with currentGameId...');
        await storage.updateGameTable(table.id, { 
          currentGameId: currentGame.id, 
          status: 'playing' 
        });
        console.log('Table updated successfully');
      }

      // Add the human player first if provided
      if (humanUserId) {
        console.log('Adding human player...');
        await this.ensurePlayerParticipant(humanUserId, table, currentGame);
        console.log('Human player added');
      }

      // Get current participants
      console.log('Getting current participants...');
      const participants = await storage.getGameParticipants(currentGame.id);
      console.log('Current participants:', participants.length);
      
      // Debug participant data
      participants.forEach((p, i) => {
        console.log(`Participant ${i}:`, {
          seatPosition: p.seatPosition,
          userId: p.userId,
          botId: p.botId,
          isBot: p.isBot,
          hasRackTiles: !!(p.rackTiles as any)?.length
        });
      });
      
      const humanPlayers = participants.filter(p => !p.isBot);
      const botPlayers = participants.filter(p => p.isBot);
      console.log('Human players filtered:', humanPlayers.length);
      console.log('Bot players filtered:', botPlayers.length);
      
      // Calculate how many bots we need based on table configuration
      const maxPlayers = table.maxPlayers || 4;
      let botsNeeded = 0;
      
      if (table.gameMode === 'single-player') {
        // Single player: fill all remaining seats with bots
        botsNeeded = Math.max(0, maxPlayers - humanPlayers.length);
      } else if (table.gameMode === 'multiplayer' && table.settings?.botCount) {
        // Multiplayer: only add the specified number of bots
        const targetBotCount = table.settings.botCount;
        const currentBots = participants.filter(p => p.isBot).length;
        botsNeeded = Math.max(0, targetBotCount - currentBots);
      }
      
      console.log('Bots needed:', botsNeeded, 'Human players:', humanPlayers.length);
      
      // Add bots to fill empty seats
      try {
        console.log('Starting bot addition loop for', botsNeeded, 'bots');
      for (let i = 0; i < botsNeeded; i++) {
        console.log(`Adding bot ${i + 1} of ${botsNeeded}`);
        console.log('Finding empty seat...');
        const seatPosition = this.findEmptySeat(participants, maxPlayers);
        console.log('Empty seat found:', seatPosition);
        if (seatPosition !== -1) {
          // Get seat-specific bot settings if available
          const seatBotSettings = table.settings?.seatBotSettings;
          const botDifficulty = seatBotSettings?.[seatPosition] || table.botDifficulty || 'standard';
          
          console.log(`Creating bot for seat ${seatPosition} with difficulty: ${botDifficulty}`);
          const botParticipant = await storage.addGameParticipant({
            gameId: currentGame.id,
            userId: null,
            botId: `bot_${botDifficulty}_${seatPosition}`,
            seatPosition,
            isBot: true,
            rackTiles: [],
            meldedTiles: [],
            discardedTiles: [],
            flowers: [],
            isReady: true // Bots are always ready
          });
          console.log('Bot participant created:', botParticipant.isBot ? `Bot seat ${seatPosition}` : 'ERROR');
          
          // Update participants list for next iteration
          participants.push(botParticipant);

          // Notify all clients in the table about new bot
          this.broadcastToTable(table.id, {
            type: 'player_joined',
            data: { 
              participant: botParticipant,
              isBot: true 
            }
          });
        }
      }

      // Check if table is now full and start game
      const updatedParticipants = await storage.getGameParticipants(currentGame.id);
      
      if (updatedParticipants.length >= maxPlayers) {
        await this.startGame(table, currentGame);
      }
      } catch (botError) {
        console.error('CRITICAL: Bot addition loop failed:', botError);
        console.error('Bot error stack:', (botError as Error).stack);
      }

    } catch (error) {
      console.error('Error auto-adding bots:', error);
    }
  }

  private findEmptySeat(participants: any[], maxPlayers: number): number {
    const occupiedSeats = new Set(participants.map(p => p.seatPosition));
    for (let i = 0; i < maxPlayers; i++) {
      if (!occupiedSeats.has(i)) {
        return i;
      }
    }
    return -1;
  }

  private async startGame(table: any, game: any): Promise<void> {
    try {
      // Initialize game with tiles and starting state
      const fullTileset = gameEngine.generateFullTileset();
      const shuffledTiles = gameEngine.shuffleTiles(fullTileset, game.seed);
      const { playerHands, wall } = gameEngine.dealInitialHands(shuffledTiles);
      
      // Update participants with their starting tiles
      const participants = await storage.getGameParticipants(game.id);
      
      for (let i = 0; i < participants.length; i++) {
        const participant = participants[i];
        const hand = playerHands[i] || [];
        
        await storage.updateGameParticipant(participant.id, {
          rackTiles: hand
        });
      }

      // Update game state with proper players array
      const gameState = {
        phase: 'charleston',
        currentPlayerIndex: 0,
        wallCount: wall.length,
        players: [
          { hand: playerHands[0] || [], discarded: [], melded: [], flowers: [] },
          { hand: playerHands[1] || [], discarded: [], melded: [], flowers: [] },
          { hand: playerHands[2] || [], discarded: [], melded: [], flowers: [] },
          { hand: playerHands[3] || [], discarded: [], melded: [], flowers: [] }
        ],
        charleston: {
          currentPass: 'right',
          passesCompleted: 0,
          phase: 'passing'
        }
      };

      await storage.updateGame(game.id, {
        gameState: JSON.stringify(gameState),
        wallTiles: wall,
        status: 'charleston'
      });

      // Update table status
      await storage.updateGameTable(table.id, {
        status: 'playing'
      });

      // Get updated participants with tiles
      const updatedParticipants = await storage.getGameParticipants(game.id);
      
      // Create playerStates from participants
      const playerStates: { [key: number]: any } = {};
      updatedParticipants.forEach(p => {
        playerStates[p.seatPosition] = {
          rack: p.rackTiles || [],
          melds: p.meldedTiles || [],
          discards: p.discardedTiles || [],
          flowers: p.flowers || []
        };
      });
      
      // Notify all clients that game has started
      this.broadcastToTable(table.id, {
        type: 'game_started',
        data: {
          table,
          game: { ...game, gameState },
          participants: updatedParticipants,
          playerStates,
          gameState
        }
      });

    } catch (error) {
      console.error('Error starting game:', error);
    }
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

export function setupWebSocket(server: Server): WebSocketManager {
  return new WebSocketManager(server);
}
