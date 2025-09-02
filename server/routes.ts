import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// Use local auth in development, Replit auth in production
const useLocalAuth = process.env.LOCAL_DEV_MODE === "true";
const authModule = useLocalAuth ? "./localAuth" : "./replitAuth";
const { setupAuth, isAuthenticated } = await import(authModule);
import { setupWebSocket } from "./websocket";
import { gameEngine } from "./services/gameEngine";
import { botService } from "./services/botService";
import { patternValidator } from "./services/patternValidator";
import { puzzleGenerator } from "./services/puzzleGenerator";
import { featureFlagService } from "./services/featureFlags";
import { analyticsService } from "./services/analytics";
import { 
  insertGameTableSchema, 
  insertGameSchema, 
  insertChatMessageSchema, 
  insertUserReportSchema, 
  insertHandPatternSchema,
  insertTileThemeSchema,
  insertUserThemePreferenceSchema
} from "@shared/schema";
// Import storage service based on environment
let ObjectStorageService: any;
let objectStorageServiceInstance: any;

if (useLocalAuth) {
  const localModule = await import("./localObjectStorage");
  ObjectStorageService = localModule.LocalObjectStorageService;
  objectStorageServiceInstance = localModule.localObjectStorageService;
} else {
  const cloudModule = await import("./objectStorage");
  ObjectStorageService = cloudModule.ObjectStorageService;
  objectStorageServiceInstance = new ObjectStorageService();
}
import fs from 'fs';
import path from 'path';

// Helper function to get user ID consistently across auth systems
function getUserId(user: any): string {
  return useLocalAuth ? user.id : user.claims.sub;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Initialize feature flags
  await featureFlagService.initializeDefaultFlags();

  // Load initial hand patterns
  await loadInitialPatterns();

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req.user);
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Feature flags routes
  app.get('/api/feature-flags', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const flags = await featureFlagService.getClientFlags(userId);
      res.json(flags);
    } catch (error) {
      console.error("Error fetching feature flags:", error);
      res.status(500).json({ message: "Failed to fetch feature flags" });
    }
  });

  // Game tables routes
  app.get('/api/tables', async (req, res) => {
    try {
      const tables = await storage.getGameTables(20);
      res.json(tables);
    } catch (error) {
      console.error("Error fetching tables:", error);
      res.status(500).json({ message: "Failed to fetch tables" });
    }
  });

  app.post('/api/tables', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req.user);
      const { seatBotSettings, botCount, ...bodyData } = req.body;
      
      // Prepare settings object
      let settings = null;
      if (bodyData.gameMode === 'single-player' && seatBotSettings) {
        settings = { seatBotSettings };
      } else if (bodyData.gameMode === 'multiplayer' && botCount > 0) {
        settings = { botCount };
      }
      
      const tableData = insertGameTableSchema.parse({
        ...bodyData,
        hostUserId: userId,
        settings
      });

      // Generate invite code if private
      if (tableData.isPrivate) {
        tableData.inviteCode = generateInviteCode();
      }

      const table = await storage.createGameTable(tableData);
      res.json(table);

      // Track analytics
      await analyticsService.trackEvent(
        'table_created',
        { 
          tableId: table.id, 
          isPrivate: !!tableData.isPrivate, 
          gameMode: tableData.gameMode, 
          botDifficulty: tableData.botDifficulty || '',
          botCount: bodyData.gameMode === 'multiplayer' ? botCount : null
        },
        userId,
        req.sessionID
      );
    } catch (error) {
      console.error("Error creating table:", error);
      res.status(500).json({ message: "Failed to create table" });
    }
  });

  app.get('/api/tables/:id', async (req, res) => {
    try {
      const table = await storage.getGameTable(req.params.id);
      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }

      const currentGame = table.currentGameId ? await storage.getGame(table.currentGameId) : null;
      const participants = currentGame ? await storage.getGameParticipants(currentGame.id) : [];

      res.json({
        table,
        currentGame,
        participants
      });
    } catch (error) {
      console.error("Error fetching table:", error);
      res.status(500).json({ message: "Failed to fetch table" });
    }
  });

  app.delete('/api/tables/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req.user);
      const table = await storage.getGameTable(req.params.id);
      
      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }

      // Only allow host to delete the table
      if (table.hostUserId !== userId) {
        return res.status(403).json({ message: "Only the table host can delete this table" });
      }

      await storage.deleteGameTable(req.params.id);
      res.json({ message: "Table deleted successfully" });
    } catch (error) {
      console.error("Error deleting table:", error);
      res.status(500).json({ message: "Failed to delete table" });
    }
  });

  // Game routes
  app.post('/api/tables/:tableId/games', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req.user);
      const { tableId } = req.params;
      
      const table = await storage.getGameTable(tableId);
      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }

      if (table.hostUserId !== userId) {
        return res.status(403).json({ message: "Only table host can start games" });
      }

      // Generate game seed
      const seed = `${Date.now()}_${Math.random()}`;
      
      const game = await storage.createGame({
        tableId,
        seed,
        gameState: { phase: 'setup', currentPlayerIndex: 0, wallCount: 0 }
      });

      // Update table with current game
      await storage.updateGameTable(tableId, { currentGameId: game.id, status: 'playing' });

      res.json(game);

      // Track analytics
      await analyticsService.trackEvent(
        'hand_started',
        { gameId: game.id, handNumber: game.gameNumber || 0 },
        userId,
        req.sessionID,
        tableId,
        game.id
      );
    } catch (error) {
      console.error("Error creating game:", error);
      res.status(500).json({ message: "Failed to create game" });
    }
  });

  // Chat routes
  app.get('/api/tables/:tableId/chat', async (req, res) => {
    try {
      const messages = await storage.getChatMessages(req.params.tableId, 50);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.post('/api/tables/:tableId/chat', isAuthenticated, featureFlagService.createFeatureMiddleware('chat_enabled'), async (req: any, res) => {
    try {
      const userId = getUserId(req.user);
      const messageData = insertChatMessageSchema.parse({
        ...req.body,
        tableId: req.params.tableId,
        userId
      });

      const message = await storage.createChatMessage(messageData);
      res.json(message);
    } catch (error) {
      console.error("Error creating chat message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Hand patterns routes
  app.get('/api/patterns', async (req, res) => {
    try {
      const category = req.query.category as string;
      const patterns = await storage.getHandPatterns(category);
      res.json(patterns);
    } catch (error) {
      console.error("Error fetching patterns:", error);
      res.status(500).json({ message: "Failed to fetch patterns" });
    }
  });

  app.get('/api/patterns/active', async (req, res) => {
    try {
      const patterns = await storage.getActiveHandPatterns();
      res.json(patterns);
    } catch (error) {
      console.error("Error fetching active patterns:", error);
      res.status(500).json({ message: "Failed to fetch active patterns" });
    }
  });

  // Hand analysis routes
  app.post('/api/analyze-hand', isAuthenticated, featureFlagService.createFeatureMiddleware('ai_hints_enabled'), async (req: any, res) => {
    try {
      const { rack, melds, flowers } = req.body;
      const patterns = await storage.getActiveHandPatterns();
      
      const analysis = patternValidator.analyzeHandForSuggestions(rack, melds, flowers, patterns);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing hand:", error);
      res.status(500).json({ message: "Failed to analyze hand" });
    }
  });

  app.post('/api/validate-win', isAuthenticated, async (req: any, res) => {
    try {
      const { rack, melds, flowers } = req.body;
      const patterns = await storage.getActiveHandPatterns();
      
      const validation = patternValidator.validateWinningHand(rack, melds, flowers, patterns);
      res.json(validation);
    } catch (error) {
      console.error("Error validating win:", error);
      res.status(500).json({ message: "Failed to validate win" });
    }
  });

  // Daily puzzle routes
  app.get('/api/puzzles/daily', async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      let puzzle = await storage.getDailyPuzzle(today);
      
      if (!puzzle) {
        // Generate today's puzzle
        const puzzleData = puzzleGenerator.generateDailyPuzzle(today);
        puzzle = await storage.createDailyPuzzle({
          date: today,
          seed: `daily_${today}`,
          puzzleData,
          difficulty: puzzleData.difficulty
        });
      }

      res.json(puzzle);
    } catch (error) {
      console.error("Error fetching daily puzzle:", error);
      res.status(500).json({ message: "Failed to fetch daily puzzle" });
    }
  });

  app.post('/api/puzzles/:puzzleId/attempts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req.user);
      const { puzzleId } = req.params;
      const { timeSeconds, moves, hintsUsed, completed } = req.body;

      const score = completed ? puzzleGenerator.calculatePuzzleScore(timeSeconds, moves, hintsUsed, 'medium') : 0;

      const attempt = await storage.createPuzzleAttempt({
        puzzleId,
        userId,
        timeSeconds,
        moves,
        hint_used: hintsUsed,
        completed,
        score
      });

      res.json(attempt);

      // Track analytics
      if (completed) {
        const puzzle = await storage.getDailyPuzzle(''); // Would need puzzle date
        await analyticsService.trackPuzzleCompletion(
          userId,
          req.sessionID,
          puzzle?.date || '',
          timeSeconds,
          moves,
          hintsUsed,
          score
        );
      }
    } catch (error) {
      console.error("Error recording puzzle attempt:", error);
      res.status(500).json({ message: "Failed to record attempt" });
    }
  });

  app.get('/api/puzzles/:puzzleId/leaderboard', async (req, res) => {
    try {
      const leaderboard = await storage.getPuzzleLeaderboard(req.params.puzzleId, 10);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Tutorial routes
  app.get('/api/tutorial/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req.user);
      const progress = await storage.getTutorialProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching tutorial progress:", error);
      res.status(500).json({ message: "Failed to fetch tutorial progress" });
    }
  });

  app.post('/api/tutorial/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req.user);
      const { tutorialStep, completed } = req.body;
      
      const progress = await storage.updateTutorialProgress({
        userId,
        tutorialStep,
        completed
      });

      res.json(progress);

      // Track analytics
      await analyticsService.trackTutorialProgress(
        userId,
        req.sessionID,
        tutorialStep,
        completed ? 1 : undefined
      );
    } catch (error) {
      console.error("Error updating tutorial progress:", error);
      res.status(500).json({ message: "Failed to update tutorial progress" });
    }
  });

  // User reporting routes
  app.post('/api/reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req.user);
      const reportData = insertUserReportSchema.parse({
        ...req.body,
        reporterId: userId
      });

      const report = await storage.createUserReport(reportData);
      res.json(report);
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ message: "Failed to create report" });
    }
  });

  // Admin routes
  app.get('/api/admin/reports', isAuthenticated, async (req: any, res) => {
    try {
      // In production, you'd check for admin role
      const reports = await storage.getUserReports('pending');
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.post('/api/admin/patterns', isAuthenticated, async (req: any, res) => {
    try {
      // In production, you'd check for admin role
      const patternData = insertHandPatternSchema.parse(req.body);
      const pattern = await storage.createHandPattern(patternData);
      res.json(pattern);
    } catch (error) {
      console.error("Error creating pattern:", error);
      res.status(500).json({ message: "Failed to create pattern" });
    }
  });

  app.get('/api/admin/feature-flags', isAuthenticated, async (req: any, res) => {
    try {
      // In production, you'd check for admin role
      const flags = await featureFlagService.getAllFlags();
      res.json(flags);
    } catch (error) {
      console.error("Error fetching feature flags:", error);
      res.status(500).json({ message: "Failed to fetch feature flags" });
    }
  });

  app.patch('/api/admin/feature-flags/:id', isAuthenticated, async (req: any, res) => {
    try {
      // In production, you'd check for admin role
      const updated = await featureFlagService.updateFlag(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating feature flag:", error);
      res.status(500).json({ message: "Failed to update feature flag" });
    }
  });

  // Profile routes
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req.user);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user statistics
      const engagement = await analyticsService.getUserEngagementMetrics(userId);
      
      res.json({
        user,
        engagement
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.patch('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req.user);
      const updates = req.body;
      
      const user = await storage.upsertUser({ id: userId, ...updates });
      res.json(user);

      // Track settings changes
      for (const [key, value] of Object.entries(updates)) {
        await analyticsService.trackEvent(
          'settings_changed',
          { settingName: key, oldValue: null, newValue: value },
          userId,
          req.sessionID
        );
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Analytics routes
  app.post('/api/analytics/event', async (req, res) => {
    try {
      const { eventType, eventData, userId, sessionId, tableId, gameId } = req.body;
      
      await analyticsService.trackEvent(
        eventType,
        eventData,
        userId,
        sessionId,
        tableId,
        gameId
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking analytics event:", error);
      res.status(500).json({ message: "Failed to track event" });
    }
  });

  // Tile theme routes
  const objectStorageService = objectStorageServiceInstance;

  // Get all public themes (for theme selection gallery)
  app.get('/api/themes/public', async (req, res) => {
    try {
      const themes = await storage.getPublicTileThemes();
      res.json(themes);
    } catch (error) {
      console.error("Error fetching public themes:", error);
      res.status(500).json({ message: "Failed to fetch public themes" });
    }
  });

  // Set user's selected theme
  app.put('/api/user/theme', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req.user);
      const { themeId } = req.body;
      
      if (!themeId) {
        return res.status(400).json({ message: "Theme ID is required" });
      }

      // Verify theme exists and is public
      const theme = await storage.getTileTheme(themeId);
      if (!theme || !theme.isPublic) {
        return res.status(404).json({ message: "Theme not found or not available" });
      }

      await storage.updateUserSelectedTheme(userId, themeId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting user theme:", error);
      res.status(500).json({ message: "Failed to set user theme" });
    }
  });

  // Get all tile themes (authenticated user's themes or public themes)
  app.get('/api/themes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req.user);
      const { public_only } = req.query;
      
      let themes;
      if (public_only === 'true') {
        themes = await storage.getPublicTileThemes();
      } else {
        // Get user's own themes plus public themes
        const userThemes = await storage.getTileThemes(userId);
        const publicThemes = await storage.getPublicTileThemes();
        themes = [...userThemes, ...publicThemes.filter(pt => pt.creatorId !== userId)];
      }
      
      res.json(themes);
    } catch (error) {
      console.error("Error fetching tile themes:", error);
      res.status(500).json({ message: "Failed to fetch tile themes" });
    }
  });

  // Get specific tile theme
  app.get('/api/themes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const theme = await storage.getTileTheme(req.params.id);
      if (!theme) {
        return res.status(404).json({ message: "Theme not found" });
      }
      res.json(theme);
    } catch (error) {
      console.error("Error fetching tile theme:", error);
      res.status(500).json({ message: "Failed to fetch tile theme" });
    }
  });

  // Create new tile theme
  app.post('/api/themes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req.user);
      const themeData = insertTileThemeSchema.parse({
        ...req.body,
        creatorId: userId,
      });

      const theme = await storage.createTileTheme(themeData);
      res.json(theme);

      // Track analytics
      await analyticsService.trackEvent(
        'theme_created',
        { themeId: theme.id, themeName: theme.name },
        userId,
        req.sessionID
      );
    } catch (error) {
      console.error("Error creating tile theme:", error);
      res.status(500).json({ message: "Failed to create tile theme" });
    }
  });

  // Get upload URL for tile theme images
  app.post('/api/themes/upload', isAuthenticated, async (req: any, res) => {
    try {
      const { themeId, tileType } = req.body;
      
      if (!themeId || !tileType) {
        return res.status(400).json({ message: "themeId and tileType are required" });
      }

      const uploadURL = await objectStorageService.getTileThemeUploadURL(themeId, tileType);
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Update theme with uploaded image paths
  app.post('/api/themes/:id/images', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req.user);
      const { imageType, imageUrl } = req.body;
      
      if (!imageType || !imageUrl) {
        return res.status(400).json({ message: "imageType and imageUrl are required" });
      }

      const theme = await storage.getTileTheme(req.params.id);
      if (!theme) {
        return res.status(404).json({ message: "Theme not found" });
      }
      
      if (theme.creatorId !== userId) {
        return res.status(403).json({ message: "Not authorized to modify this theme" });
      }

      // Normalize the uploaded URL to a local object path
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(imageUrl);

      // Update the tile image paths in the theme
      const currentPaths = theme.tileImagePaths || {};
      const updatedPaths = {
        ...currentPaths,
        [imageType]: normalizedPath
      };

      const updatedTheme = await storage.updateTileTheme(req.params.id, {
        tileImagePaths: updatedPaths
      });

      res.json(updatedTheme);
    } catch (error) {
      console.error("Error updating theme images:", error);
      res.status(500).json({ message: "Failed to update theme images" });
    }
  });

  // Create HTTP server and setup WebSocket
  const httpServer = createServer(app);
  setupWebSocket(httpServer);

  return httpServer;
}

// Utility functions
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function loadInitialPatterns(): Promise<void> {
  try {
    const patternsFile = path.join(import.meta.dirname, 'data', 'patterns.json');
    const patterns = JSON.parse(fs.readFileSync(patternsFile, 'utf8'));
    
    for (const patternData of patterns) {
      const existing = await storage.getHandPatterns(patternData.category);
      const found = existing.find(p => p.name === patternData.name);
      
      if (!found) {
        await storage.createHandPattern(patternData);
      }
    }
  } catch (error) {
    console.warn('Could not load initial patterns:', error);
  }
}
