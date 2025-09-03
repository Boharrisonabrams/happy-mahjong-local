// Happy Mahjong Backend API Handler
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';

// Initialize database connection
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// Simple in-memory session store for demo (in production, use Redis or database)
const sessions = new Map();

// In-memory game tables store
const gameTables = new Map();

// Demo user data
const DEMO_USER = {
  id: 'demo-user-id',
  email: 'demo@mahjong.local', 
  firstName: 'Demo',
  lastName: 'User',
  profileImageUrl: null,
  isAuthenticated: true
};

// Helper to get session from cookie
function getSessionFromCookie(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  
  const sessionCookie = cookieHeader.split(';').find(c => c.trim().startsWith('session='));
  if (!sessionCookie) return null;
  
  const sessionId = sessionCookie.split('=')[1];
  return sessions.get(sessionId);
}

// Helper to create session
function createSession(userId) {
  const sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
  sessions.set(sessionId, { userId, createdAt: Date.now() });
  return sessionId;
}

// Helper functions for game tables
function createGameTable(name, hostUserId, isPrivate = false) {
  const tableId = 'table_' + Math.random().toString(36).substr(2, 9);
  const table = {
    id: tableId,
    name: name,
    hostUserId: hostUserId,
    isPrivate: isPrivate,
    status: 'waiting', // waiting, playing, finished
    players: [
      { userId: hostUserId, seat: 0, isReady: false, isBot: false }
    ],
    botSettings: {
      seat1: { enabled: true, difficulty: 'standard' },
      seat2: { enabled: true, difficulty: 'standard' }, 
      seat3: { enabled: true, difficulty: 'standard' }
    },
    gameState: null,
    createdAt: Date.now()
  };
  
  gameTables.set(tableId, table);
  return table;
}

function getGameTable(tableId) {
  return gameTables.get(tableId);
}

function getAllGameTables() {
  return Array.from(gameTables.values()).filter(table => !table.isPrivate);
}

function deleteGameTable(tableId) {
  return gameTables.delete(tableId);
}

// Basic Mahjong game logic
function createMahjongTiles() {
  const tiles = [];
  
  // Dots (1-9, 4 of each)
  for (let i = 1; i <= 9; i++) {
    for (let j = 0; j < 4; j++) {
      tiles.push({ id: `dots_${i}_${j}`, suit: 'dots', value: i, isJoker: false });
    }
  }
  
  // Bams (1-9, 4 of each)
  for (let i = 1; i <= 9; i++) {
    for (let j = 0; j < 4; j++) {
      tiles.push({ id: `bams_${i}_${j}`, suit: 'bams', value: i, isJoker: false });
    }
  }
  
  // Craks (1-9, 4 of each)
  for (let i = 1; i <= 9; i++) {
    for (let j = 0; j < 4; j++) {
      tiles.push({ id: `craks_${i}_${j}`, suit: 'craks', value: i, isJoker: false });
    }
  }
  
  // Winds (4 of each)
  ['East', 'South', 'West', 'North'].forEach(wind => {
    for (let j = 0; j < 4; j++) {
      tiles.push({ id: `wind_${wind}_${j}`, suit: 'winds', value: wind, isJoker: false });
    }
  });
  
  // Dragons (4 of each)
  ['Red', 'Green', 'White'].forEach(dragon => {
    for (let j = 0; j < 4; j++) {
      tiles.push({ id: `dragon_${dragon}_${j}`, suit: 'dragons', value: dragon, isJoker: false });
    }
  });
  
  // Flowers (8 unique tiles)
  for (let i = 1; i <= 8; i++) {
    tiles.push({ id: `flower_${i}`, suit: 'flowers', value: i, isJoker: false });
  }
  
  // Jokers (8 tiles)
  for (let i = 1; i <= 8; i++) {
    tiles.push({ id: `joker_${i}`, suit: 'joker', value: 'Joker', isJoker: true });
  }
  
  return tiles;
}

function shuffleTiles(tiles) {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function dealInitialTiles(shuffledTiles) {
  const players = [
    { seat: 0, rack: [], melds: [], discards: [], flowers: [] },
    { seat: 1, rack: [], melds: [], discards: [], flowers: [] },
    { seat: 2, rack: [], melds: [], discards: [], flowers: [] },
    { seat: 3, rack: [], melds: [], discards: [], flowers: [] }
  ];
  
  let tileIndex = 0;
  
  // Deal 13 tiles to each player
  for (let round = 0; round < 13; round++) {
    for (let player = 0; player < 4; player++) {
      if (tileIndex < shuffledTiles.length) {
        const tile = shuffledTiles[tileIndex++];
        if (tile.suit === 'flowers') {
          players[player].flowers.push(tile);
        } else {
          players[player].rack.push(tile);
        }
      }
    }
  }
  
  return {
    players,
    wall: shuffledTiles.slice(tileIndex),
    wallCount: shuffledTiles.length - tileIndex
  };
}

function startNewGame(tableId) {
  const table = getGameTable(tableId);
  if (!table) return null;
  
  const tiles = createMahjongTiles();
  const shuffledTiles = shuffleTiles(tiles);
  const gameSetup = dealInitialTiles(shuffledTiles);
  
  table.gameState = {
    phase: 'playing', // setup, charleston, playing, finished
    currentPlayerSeat: 0,
    players: gameSetup.players,
    wall: gameSetup.wall,
    wallCount: gameSetup.wallCount,
    lastAction: null,
    turn: 1
  };
  
  table.status = 'playing';
  return table;
}

function performBotAction(table) {
  if (!table.gameState || table.gameState.currentPlayerSeat === 0 || table.gameState.wall.length === 0) {
    return;
  }
  
  const currentPlayerSeat = table.gameState.currentPlayerSeat;
  const currentPlayer = table.gameState.players[currentPlayerSeat];
  
  // Bot draws a tile
  if (table.gameState.wall.length > 0) {
    const drawnTile = table.gameState.wall.pop();
    currentPlayer.rack.push(drawnTile);
    table.gameState.wallCount = table.gameState.wall.length;
  }
  
  // Bot discards a random tile (simple AI)
  if (currentPlayer.rack.length > 0) {
    const randomIndex = Math.floor(Math.random() * currentPlayer.rack.length);
    const discardedTile = currentPlayer.rack.splice(randomIndex, 1)[0];
    currentPlayer.discards.push(discardedTile);
    
    table.gameState.lastAction = {
      type: 'discard',
      player: currentPlayerSeat,
      tile: discardedTile,
      timestamp: Date.now()
    };
  }
  
  // Move to next player
  table.gameState.currentPlayerSeat = (table.gameState.currentPlayerSeat + 1) % 4;
  table.gameState.turn++;
  
  // Continue bot actions if it's still not human player's turn
  if (table.gameState.wall.length > 0 && table.gameState.currentPlayerSeat !== 0) {
    setTimeout(() => {
      performBotAction(table);
    }, 1000);
  }
}

// Create some sample tables for demonstration
if (gameTables.size === 0) {
  createGameTable('Demo Game Room', 'demo-user-id', false);
  createGameTable('Practice Table', 'demo-user-id', false);  
  createGameTable('Beginner Friendly', 'demo-user-id', false);
}

export default async function handler(req, res) {
  try {
    // Add CORS headers
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const { pathname } = new URL(req.url, `https://${req.headers.host}`);
    
    // Health check
    if (pathname === '/api/health') {
      return res.status(200).json({ 
        message: 'Server is running', 
        timestamp: new Date().toISOString() 
      });
    }

    // Authentication endpoints
    if (pathname === '/api/auth/user' && req.method === 'GET') {
      const session = getSessionFromCookie(req);
      if (session && session.userId === DEMO_USER.id) {
        return res.status(200).json({ user: DEMO_USER });
      }
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Serve login form
    if (pathname === '/api/login' && req.method === 'GET') {
      const loginForm = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Happy Mahjong - Login</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-green-50 to-blue-50 min-h-screen flex items-center justify-center">
    <div class="bg-white p-8 rounded-lg shadow-lg w-96">
        <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">🀄 Happy Mahjong</h1>
            <p class="text-gray-600">Sign in to start playing</p>
        </div>
        
        <form method="POST" action="/api/login" class="space-y-6">
            <div>
                <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    value="demo@mahjong.local"
                    required 
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
            </div>
            
            <div>
                <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    value="demo123"
                    required 
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
            </div>
            
            <div class="bg-blue-50 p-3 rounded-md">
                <p class="text-sm text-blue-800">
                    <strong>Demo Account:</strong><br>
                    Email: demo@mahjong.local<br>
                    Password: demo123
                </p>
            </div>
            
            <button 
                type="submit" 
                class="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition duration-200"
            >
                Sign In
            </button>
        </form>
        
        <div class="text-center mt-6">
            <a href="/" class="text-sm text-gray-500 hover:text-gray-700">← Back to Home</a>
        </div>
    </div>
</body>
</html>`;
      
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(loginForm);
    }

    if (pathname === '/api/login' && req.method === 'POST') {
      // Parse form data from URL-encoded body
      let body = '';
      await new Promise((resolve) => {
        req.on('data', chunk => body += chunk.toString());
        req.on('end', resolve);
      });
      
      const formData = new URLSearchParams(body);
      const email = formData.get('email');
      const password = formData.get('password');
      
      // Check for demo credentials
      if (email === 'demo@mahjong.local' && password === 'demo123') {
        const sessionId = createSession(DEMO_USER.id);
        res.setHeader('Set-Cookie', `session=${sessionId}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`);
        res.setHeader('Location', '/');
        return res.status(302).end();
      } else {
        // Return to login page with error
        const errorForm = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Happy Mahjong - Login</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-green-50 to-blue-50 min-h-screen flex items-center justify-center">
    <div class="bg-white p-8 rounded-lg shadow-lg w-96">
        <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">🀄 Happy Mahjong</h1>
            <p class="text-gray-600">Sign in to start playing</p>
        </div>
        
        <div class="bg-red-50 border border-red-200 p-3 rounded-md mb-4">
            <p class="text-red-800 text-sm">Invalid email or password. Please try again.</p>
        </div>
        
        <form method="POST" action="/api/login" class="space-y-6">
            <div>
                <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    value="${email || 'demo@mahjong.local'}"
                    required 
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
            </div>
            
            <div>
                <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    value="demo123"
                    required 
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
            </div>
            
            <div class="bg-blue-50 p-3 rounded-md">
                <p class="text-sm text-blue-800">
                    <strong>Demo Account:</strong><br>
                    Email: demo@mahjong.local<br>
                    Password: demo123
                </p>
            </div>
            
            <button 
                type="submit" 
                class="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition duration-200"
            >
                Sign In
            </button>
        </form>
        
        <div class="text-center mt-6">
            <a href="/" class="text-sm text-gray-500 hover:text-gray-700">← Back to Home</a>
        </div>
    </div>
</body>
</html>`;
        
        res.setHeader('Content-Type', 'text/html');
        return res.status(400).send(errorForm);
      }
    }

    if (pathname === '/api/logout' && req.method === 'GET') {
      const session = getSessionFromCookie(req);
      if (session) {
        sessions.delete(session.sessionId);
      }
      res.setHeader('Set-Cookie', `session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
      return res.status(200).json({ success: true, message: 'Logged out successfully' });
    }

    // Game table endpoints
    if (pathname === '/api/tables' && req.method === 'GET') {
      const tables = getAllGameTables().map(table => ({
        id: table.id,
        name: table.name,
        status: table.status,
        playerCount: table.players.length,
        maxPlayers: 4,
        hostUser: DEMO_USER, // For demo, always show demo user as host
        isPrivate: table.isPrivate,
        createdAt: table.createdAt
      }));
      
      return res.status(200).json({ tables });
    }

    if (pathname === '/api/tables' && req.method === 'POST') {
      const session = getSessionFromCookie(req);
      if (!session || session.userId !== DEMO_USER.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      let body = '';
      await new Promise((resolve) => {
        req.on('data', chunk => body += chunk.toString());
        req.on('end', resolve);
      });

      const { name, isPrivate } = JSON.parse(body || '{}');
      
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Table name is required' });
      }

      const table = createGameTable(name.trim(), DEMO_USER.id, !!isPrivate);
      
      return res.status(201).json({
        table: {
          ...table,
          hostUser: DEMO_USER
        }
      });
    }

    // Get specific table
    const tableMatch = pathname.match(/^\/api\/tables\/([^\/]+)$/);
    if (tableMatch && req.method === 'GET') {
      const tableId = tableMatch[1];
      const table = getGameTable(tableId);
      
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      return res.status(200).json({
        table: {
          ...table,
          hostUser: DEMO_USER
        }
      });
    }

    // Delete table
    if (tableMatch && req.method === 'DELETE') {
      const session = getSessionFromCookie(req);
      if (!session || session.userId !== DEMO_USER.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const tableId = tableMatch[1];
      const table = getGameTable(tableId);
      
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      if (table.hostUserId !== DEMO_USER.id) {
        return res.status(403).json({ error: 'Only the host can delete the table' });
      }
      
      deleteGameTable(tableId);
      return res.status(200).json({ success: true });
    }

    // Start a new game
    const gameMatch = pathname.match(/^\/api\/tables\/([^\/]+)\/games$/);
    if (gameMatch && req.method === 'POST') {
      const session = getSessionFromCookie(req);
      if (!session || session.userId !== DEMO_USER.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const tableId = gameMatch[1];
      const table = startNewGame(tableId);
      
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      return res.status(200).json({
        message: 'Game started successfully',
        gameState: {
          phase: table.gameState.phase,
          currentPlayerSeat: table.gameState.currentPlayerSeat,
          turn: table.gameState.turn,
          wallCount: table.gameState.wallCount,
          // Only return the demo user's rack for security
          playerRack: table.gameState.players[0].rack,
          playerFlowers: table.gameState.players[0].flowers
        }
      });
    }

    // Get game state (polling endpoint to simulate Socket.IO)
    const gameStateMatch = pathname.match(/^\/api\/tables\/([^\/]+)\/state$/);
    if (gameStateMatch && req.method === 'GET') {
      const session = getSessionFromCookie(req);
      if (!session || session.userId !== DEMO_USER.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const tableId = gameStateMatch[1];
      const table = getGameTable(tableId);
      
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      if (!table.gameState) {
        return res.status(200).json({
          table: {
            ...table,
            hostUser: DEMO_USER
          },
          gameState: null
        });
      }
      
      return res.status(200).json({
        table: {
          ...table,
          hostUser: DEMO_USER
        },
        gameState: {
          phase: table.gameState.phase,
          currentPlayerSeat: table.gameState.currentPlayerSeat,
          turn: table.gameState.turn,
          wallCount: table.gameState.wallCount,
          lastAction: table.gameState.lastAction,
          // Return player's own tiles (seat 0 for demo user)
          playerRack: table.gameState.players[0].rack,
          playerFlowers: table.gameState.players[0].flowers,
          playerMelds: table.gameState.players[0].melds,
          // Return other players' public info (melds, discards, flower count)
          otherPlayers: table.gameState.players.slice(1).map((player, idx) => ({
            seat: idx + 1,
            rackCount: player.rack.length,
            melds: player.melds,
            discards: player.discards,
            flowerCount: player.flowers.length
          }))
        }
      });
    }

    // Draw tile action
    const drawMatch = pathname.match(/^\/api\/tables\/([^\/]+)\/draw$/);
    if (drawMatch && req.method === 'POST') {
      const session = getSessionFromCookie(req);
      if (!session || session.userId !== DEMO_USER.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const tableId = drawMatch[1];
      const table = getGameTable(tableId);
      
      if (!table || !table.gameState) {
        return res.status(404).json({ error: 'Game not found' });
      }
      
      if (table.gameState.currentPlayerSeat !== 0) {
        return res.status(400).json({ error: 'Not your turn' });
      }
      
      if (table.gameState.wall.length === 0) {
        return res.status(400).json({ error: 'No more tiles in wall' });
      }
      
      // Draw a tile
      const drawnTile = table.gameState.wall.pop();
      table.gameState.players[0].rack.push(drawnTile);
      table.gameState.wallCount = table.gameState.wall.length;
      table.gameState.lastAction = {
        type: 'draw',
        player: 0,
        tile: drawnTile,
        timestamp: Date.now()
      };
      
      return res.status(200).json({
        success: true,
        drawnTile,
        newRackCount: table.gameState.players[0].rack.length,
        wallCount: table.gameState.wallCount
      });
    }

    // Discard tile action
    const discardMatch = pathname.match(/^\/api\/tables\/([^\/]+)\/discard$/);
    if (discardMatch && req.method === 'POST') {
      const session = getSessionFromCookie(req);
      if (!session || session.userId !== DEMO_USER.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const tableId = discardMatch[1];
      const table = getGameTable(tableId);
      
      if (!table || !table.gameState) {
        return res.status(404).json({ error: 'Game not found' });
      }
      
      if (table.gameState.currentPlayerSeat !== 0) {
        return res.status(400).json({ error: 'Not your turn' });
      }

      let body = '';
      await new Promise((resolve) => {
        req.on('data', chunk => body += chunk.toString());
        req.on('end', resolve);
      });

      const { tileId } = JSON.parse(body || '{}');
      
      if (!tileId) {
        return res.status(400).json({ error: 'Tile ID is required' });
      }

      const playerRack = table.gameState.players[0].rack;
      const tileIndex = playerRack.findIndex(tile => tile.id === tileId);
      
      if (tileIndex === -1) {
        return res.status(400).json({ error: 'Tile not found in rack' });
      }

      // Remove tile from rack and add to discards
      const discardedTile = playerRack.splice(tileIndex, 1)[0];
      table.gameState.players[0].discards.push(discardedTile);
      
      // Move to next player (simple bot simulation)
      table.gameState.currentPlayerSeat = (table.gameState.currentPlayerSeat + 1) % 4;
      table.gameState.turn++;
      table.gameState.lastAction = {
        type: 'discard',
        player: 0,
        tile: discardedTile,
        timestamp: Date.now()
      };
      
      // Simple bot behavior: other players draw and discard random tiles
      if (table.gameState.wall.length > 0 && table.gameState.currentPlayerSeat !== 0) {
        setTimeout(() => {
          performBotAction(table);
        }, 1000);
      }
      
      return res.status(200).json({
        success: true,
        discardedTile,
        newRackCount: table.gameState.players[0].rack.length,
        currentPlayerSeat: table.gameState.currentPlayerSeat,
        turn: table.gameState.turn
      });
    }

    // Call tile action (Pung, Kong, etc.)
    const callMatch = pathname.match(/^\/api\/tables\/([^\/]+)\/call$/);
    if (callMatch && req.method === 'POST') {
      const session = getSessionFromCookie(req);
      if (!session || session.userId !== DEMO_USER.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const tableId = callMatch[1];
      const table = getGameTable(tableId);
      
      if (!table || !table.gameState) {
        return res.status(404).json({ error: 'Game not found' });
      }

      let body = '';
      await new Promise((resolve) => {
        req.on('data', chunk => body += chunk.toString());
        req.on('end', resolve);
      });

      const { callType, tileIds } = JSON.parse(body || '{}');
      
      if (!callType || !tileIds || !Array.isArray(tileIds)) {
        return res.status(400).json({ error: 'Call type and tile IDs are required' });
      }

      const playerRack = table.gameState.players[0].rack;
      const calledTiles = [];
      
      // Validate and collect tiles
      for (const tileId of tileIds) {
        const tileIndex = playerRack.findIndex(tile => tile.id === tileId);
        if (tileIndex === -1) {
          return res.status(400).json({ error: `Tile ${tileId} not found in rack` });
        }
        calledTiles.push(playerRack[tileIndex]);
      }

      // Get the last discarded tile (if calling someone else's discard)
      let lastDiscardedTile = null;
      if (table.gameState.lastAction && table.gameState.lastAction.type === 'discard') {
        lastDiscardedTile = table.gameState.lastAction.tile;
      }

      // Create meld
      const meld = {
        type: callType,
        tiles: lastDiscardedTile ? [lastDiscardedTile, ...calledTiles] : calledTiles,
        isConcealed: false,
        calledFrom: table.gameState.lastAction?.player || null,
        timestamp: Date.now()
      };

      // Remove tiles from rack and add meld
      for (const tile of calledTiles) {
        const index = playerRack.findIndex(t => t.id === tile.id);
        if (index !== -1) {
          playerRack.splice(index, 1);
        }
      }
      
      table.gameState.players[0].melds.push(meld);
      
      // Player gets to continue their turn after calling
      table.gameState.currentPlayerSeat = 0;
      table.gameState.lastAction = {
        type: 'call',
        player: 0,
        callType,
        meld,
        timestamp: Date.now()
      };

      return res.status(200).json({
        success: true,
        meld,
        newRackCount: table.gameState.players[0].rack.length,
        currentPlayerSeat: table.gameState.currentPlayerSeat
      });
    }

    if (pathname === '/api/patterns' && req.method === 'GET') {
      return res.status(200).json({ patterns: [] });
    }

    if (pathname === '/api/themes' && req.method === 'GET') {
      return res.status(200).json({ themes: [] });
    }

    if (pathname === '/api/profile' && req.method === 'GET') {
      const session = getSessionFromCookie(req);
      if (session && session.userId === DEMO_USER.id) {
        return res.status(200).json({ 
          profile: {
            ...DEMO_USER,
            stats: { gamesPlayed: 0, gamesWon: 0 }
          }
        });
      }
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Chat endpoints
    if (pathname.match(/^\/api\/tables\/\w+\/chat$/) && req.method === 'GET') {
      return res.status(200).json({ messages: [] });
    }

    // Default response
    return res.status(404).json({ error: 'Endpoint not found', path: pathname });
    
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}