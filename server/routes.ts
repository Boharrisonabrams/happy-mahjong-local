import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupWebSocket } from "./websocket";
import { gameEngine } from "./services/gameEngine";
import { botService } from "./services/botService";
import { patternValidator } from "./services/patternValidator";
import { puzzleGenerator } from "./services/puzzleGenerator";
import { featureFlagService } from "./services/featureFlags";
import { analyticsService } from "./services/analytics";
import { insertGameTableSchema, insertGameSchema, insertChatMessageSchema, insertUserReportSchema, insertHandPatternSchema } from "@shared/schema";
import fs from 'fs';
import path from 'path';

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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const tableData = insertGameTableSchema.parse({
        ...req.body,
        hostUserId: userId
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
        { tableId: table.id, isPrivate: tableData.isPrivate, botDifficulty: tableData.botDifficulty },
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

  // Game routes
  app.post('/api/tables/:tableId/games', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
        { gameId: game.id, handNumber: game.gameNumber },
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const progress = await storage.getTutorialProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching tutorial progress:", error);
      res.status(500).json({ message: "Failed to fetch tutorial progress" });
    }
  });

  app.post('/api/tutorial/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const updates = req.body;
      
      const user = await storage.upsertUser({ id: userId, ...updates });
      res.json(user);

      // Track settings changes
      for (const [key, value] of Object.entries(updates)) {
        await analyticsService.trackEvent(
          'settings_changed',
          { settingName: key, newValue: value },
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
