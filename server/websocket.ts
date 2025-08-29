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
      
      // Find receiving player (Right pass: +1, Across: +2, Left: +3)
      const passDirection = gameState.charleston?.currentPass || 'right';
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

      // Update game state
      await storage.updateGame(game.id, {
        gameState: JSON.stringify(gameState)
      });

      // Broadcast updated game state to all players
      this.broadcastToTable(client.tableId, {
        type: 'game_state_updated',
        data: { 
          gameState,
          charleston: {
            passComplete: true,
            from: currentPlayer.seatPosition,
            to: receivingPlayer.seatPosition,
            tiles: data.tiles.length
          }
        }
      });

      console.log('Charleston pass completed successfully');

    } catch (error) {
      console.error('Error handling Charleston pass:', error);
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
      const humanPlayers = participants.filter(p => !p.isBot);
      const botPlayers = participants.filter(p => p.isBot);
      
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
