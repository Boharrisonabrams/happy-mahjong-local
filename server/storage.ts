import {
  users,
  gameTables,
  games,
  gameParticipants,
  gameActions,
  handPatterns,
  chatMessages,
  userReports,
  tutorialProgress,
  dailyPuzzles,
  puzzleAttempts,
  featureFlags,
  analyticsEvents,
  type User,
  type UpsertUser,
  type GameTable,
  type InsertGameTable,
  type Game,
  type InsertGame,
  type GameParticipant,
  type InsertGameParticipant,
  type InsertGameAction,
  type GameAction,
  type HandPattern,
  type InsertHandPattern,
  type ChatMessage,
  type InsertChatMessage,
  type UserReport,
  type InsertUserReport,
  type TutorialProgress,
  type InsertTutorialProgress,
  type DailyPuzzle,
  type InsertDailyPuzzle,
  type PuzzleAttempt,
  type InsertPuzzleAttempt,
  type FeatureFlag,
  type InsertFeatureFlag,
  type AnalyticsEvent,
  type InsertAnalyticsEvent,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, count, or } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Game table operations
  createGameTable(table: InsertGameTable): Promise<GameTable>;
  getGameTable(id: string): Promise<GameTable | undefined>;
  getGameTables(limit?: number): Promise<GameTable[]>;
  updateGameTable(id: string, updates: Partial<GameTable>): Promise<GameTable>;
  deleteGameTable(id: string): Promise<void>;
  
  // Game operations
  createGame(game: InsertGame): Promise<Game>;
  getGame(id: string): Promise<Game | undefined>;
  updateGame(id: string, updates: Partial<Game>): Promise<Game>;
  getGamesByTable(tableId: string): Promise<Game[]>;
  
  // Game participant operations
  addGameParticipant(participant: InsertGameParticipant): Promise<GameParticipant>;
  getGameParticipants(gameId: string): Promise<GameParticipant[]>;
  updateGameParticipant(id: string, updates: Partial<GameParticipant>): Promise<GameParticipant>;
  removeGameParticipant(id: string): Promise<void>;
  
  // Game action operations
  logGameAction(action: InsertGameAction): Promise<GameAction>;
  getGameActions(gameId: string, limit?: number): Promise<GameAction[]>;
  
  // Hand pattern operations
  createHandPattern(pattern: InsertHandPattern): Promise<HandPattern>;
  getHandPatterns(category?: string): Promise<HandPattern[]>;
  getActiveHandPatterns(): Promise<HandPattern[]>;
  updateHandPattern(id: string, updates: Partial<HandPattern>): Promise<HandPattern>;
  
  // Chat operations
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(tableId: string, limit?: number): Promise<ChatMessage[]>;
  
  // User report operations
  createUserReport(report: InsertUserReport): Promise<UserReport>;
  getUserReports(status?: string): Promise<UserReport[]>;
  updateUserReport(id: string, updates: Partial<UserReport>): Promise<UserReport>;
  
  // Tutorial operations
  getTutorialProgress(userId: string): Promise<TutorialProgress[]>;
  updateTutorialProgress(progress: InsertTutorialProgress): Promise<TutorialProgress>;
  
  // Daily puzzle operations
  createDailyPuzzle(puzzle: InsertDailyPuzzle): Promise<DailyPuzzle>;
  getDailyPuzzle(date: string): Promise<DailyPuzzle | undefined>;
  createPuzzleAttempt(attempt: InsertPuzzleAttempt): Promise<PuzzleAttempt>;
  getPuzzleAttempts(puzzleId: string, userId?: string): Promise<PuzzleAttempt[]>;
  getPuzzleLeaderboard(puzzleId: string, limit?: number): Promise<PuzzleAttempt[]>;
  
  // Feature flag operations
  getFeatureFlags(): Promise<FeatureFlag[]>;
  getFeatureFlag(name: string): Promise<FeatureFlag | undefined>;
  updateFeatureFlag(id: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag>;
  
  // Analytics operations
  logAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent>;
  getAnalyticsEvents(filters?: any): Promise<AnalyticsEvent[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Game table operations
  async createGameTable(tableData: InsertGameTable): Promise<GameTable> {
    const [table] = await db.insert(gameTables).values(tableData).returning();
    return table;
  }

  async getGameTable(id: string): Promise<GameTable | undefined> {
    const [table] = await db.select().from(gameTables).where(eq(gameTables.id, id));
    return table;
  }

  async getGameTables(limit = 50): Promise<GameTable[]> {
    return await db
      .select()
      .from(gameTables)
      .where(eq(gameTables.status, 'waiting'))
      .orderBy(desc(gameTables.createdAt))
      .limit(limit);
  }

  async updateGameTable(id: string, updates: Partial<GameTable>): Promise<GameTable> {
    const [table] = await db
      .update(gameTables)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(gameTables.id, id))
      .returning();
    return table;
  }

  async deleteGameTable(id: string): Promise<void> {
    // Delete related records first to avoid foreign key violations
    
    // Get the current game if any
    const table = await this.getGameTable(id);
    if (table?.currentGameId) {
      // Delete game participants
      await db.delete(gameParticipants).where(eq(gameParticipants.gameId, table.currentGameId));
      
      // Delete game actions
      await db.delete(gameActions).where(eq(gameActions.gameId, table.currentGameId));
      
      // Delete the game
      await db.delete(games).where(eq(games.id, table.currentGameId));
    }
    
    // Delete analytics events for this table
    await db.delete(analyticsEvents).where(eq(analyticsEvents.tableId, id));
    
    // Delete chat messages for this table
    await db.delete(chatMessages).where(eq(chatMessages.tableId, id));
    
    // Finally delete the table
    await db.delete(gameTables).where(eq(gameTables.id, id));
  }

  // Game operations
  async createGame(gameData: InsertGame): Promise<Game> {
    const [game] = await db.insert(games).values(gameData).returning();
    return game;
  }

  async getGame(id: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game;
  }

  async updateGame(id: string, updates: Partial<Game>): Promise<Game> {
    const [game] = await db
      .update(games)
      .set(updates)
      .where(eq(games.id, id))
      .returning();
    return game;
  }

  async getGamesByTable(tableId: string): Promise<Game[]> {
    return await db
      .select()
      .from(games)
      .where(eq(games.tableId, tableId))
      .orderBy(desc(games.createdAt));
  }

  // Game participant operations
  async addGameParticipant(participantData: InsertGameParticipant): Promise<GameParticipant> {
    const [participant] = await db.insert(gameParticipants).values(participantData).returning();
    return participant;
  }

  async getGameParticipants(gameId: string): Promise<GameParticipant[]> {
    return await db
      .select()
      .from(gameParticipants)
      .where(eq(gameParticipants.gameId, gameId))
      .orderBy(gameParticipants.seatPosition);
  }

  async updateGameParticipant(id: string, updates: Partial<GameParticipant>): Promise<GameParticipant> {
    const [participant] = await db
      .update(gameParticipants)
      .set(updates)
      .where(eq(gameParticipants.id, id))
      .returning();
    return participant;
  }

  async removeGameParticipant(id: string): Promise<void> {
    await db.delete(gameParticipants).where(eq(gameParticipants.id, id));
  }

  // Game action operations
  async logGameAction(actionData: InsertGameAction): Promise<GameAction> {
    const [action] = await db.insert(gameActions).values(actionData).returning();
    return action;
  }

  async getGameActions(gameId: string, limit = 1000): Promise<GameAction[]> {
    return await db
      .select()
      .from(gameActions)
      .where(eq(gameActions.gameId, gameId))
      .orderBy(gameActions.timestamp)
      .limit(limit);
  }

  // Hand pattern operations
  async createHandPattern(patternData: InsertHandPattern): Promise<HandPattern> {
    const [pattern] = await db.insert(handPatterns).values(patternData).returning();
    return pattern;
  }

  async getHandPatterns(category?: string): Promise<HandPattern[]> {
    const query = db.select().from(handPatterns);
    if (category) {
      return await query.where(eq(handPatterns.category, category));
    }
    return await query.orderBy(handPatterns.category, handPatterns.name);
  }

  async getActiveHandPatterns(): Promise<HandPattern[]> {
    return await db
      .select()
      .from(handPatterns)
      .where(eq(handPatterns.isActive, true))
      .orderBy(handPatterns.category, handPatterns.name);
  }

  async updateHandPattern(id: string, updates: Partial<HandPattern>): Promise<HandPattern> {
    const [pattern] = await db
      .update(handPatterns)
      .set(updates)
      .where(eq(handPatterns.id, id))
      .returning();
    return pattern;
  }

  // Chat operations
  async createChatMessage(messageData: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db.insert(chatMessages).values(messageData).returning();
    return message;
  }

  async getChatMessages(tableId: string, limit = 100): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.tableId, tableId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  // User report operations
  async createUserReport(reportData: InsertUserReport): Promise<UserReport> {
    const [report] = await db.insert(userReports).values(reportData).returning();
    return report;
  }

  async getUserReports(status?: string): Promise<UserReport[]> {
    const query = db.select().from(userReports);
    if (status) {
      return await query.where(eq(userReports.status, status));
    }
    return await query.orderBy(desc(userReports.createdAt));
  }

  async updateUserReport(id: string, updates: Partial<UserReport>): Promise<UserReport> {
    const [report] = await db
      .update(userReports)
      .set(updates)
      .where(eq(userReports.id, id))
      .returning();
    return report;
  }

  // Tutorial operations
  async getTutorialProgress(userId: string): Promise<TutorialProgress[]> {
    return await db
      .select()
      .from(tutorialProgress)
      .where(eq(tutorialProgress.userId, userId))
      .orderBy(tutorialProgress.tutorialStep);
  }

  async updateTutorialProgress(progressData: InsertTutorialProgress): Promise<TutorialProgress> {
    const [progress] = await db
      .insert(tutorialProgress)
      .values(progressData)
      .onConflictDoUpdate({
        target: [tutorialProgress.userId, tutorialProgress.tutorialStep],
        set: {
          completed: progressData.completed,
          completedAt: progressData.completed ? new Date() : null,
        },
      })
      .returning();
    return progress;
  }

  // Daily puzzle operations
  async createDailyPuzzle(puzzleData: InsertDailyPuzzle): Promise<DailyPuzzle> {
    const [puzzle] = await db.insert(dailyPuzzles).values(puzzleData).returning();
    return puzzle;
  }

  async getDailyPuzzle(date: string): Promise<DailyPuzzle | undefined> {
    const [puzzle] = await db.select().from(dailyPuzzles).where(eq(dailyPuzzles.date, date));
    return puzzle;
  }

  async createPuzzleAttempt(attemptData: InsertPuzzleAttempt): Promise<PuzzleAttempt> {
    const [attempt] = await db.insert(puzzleAttempts).values(attemptData).returning();
    return attempt;
  }

  async getPuzzleAttempts(puzzleId: string, userId?: string): Promise<PuzzleAttempt[]> {
    if (userId) {
      return await db
        .select()
        .from(puzzleAttempts)
        .where(and(eq(puzzleAttempts.puzzleId, puzzleId), eq(puzzleAttempts.userId, userId)))
        .orderBy(desc(puzzleAttempts.createdAt));
    }
    return await db
      .select()
      .from(puzzleAttempts)
      .where(eq(puzzleAttempts.puzzleId, puzzleId))
      .orderBy(desc(puzzleAttempts.createdAt));
  }

  async getPuzzleLeaderboard(puzzleId: string, limit = 10): Promise<PuzzleAttempt[]> {
    return await db
      .select()
      .from(puzzleAttempts)
      .where(and(eq(puzzleAttempts.puzzleId, puzzleId), eq(puzzleAttempts.completed, true)))
      .orderBy(puzzleAttempts.timeSeconds)
      .limit(limit);
  }

  // Feature flag operations
  async getFeatureFlags(): Promise<FeatureFlag[]> {
    return await db.select().from(featureFlags).orderBy(featureFlags.name);
  }

  async getFeatureFlag(name: string): Promise<FeatureFlag | undefined> {
    const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.name, name));
    return flag;
  }

  async createFeatureFlag(flagData: InsertFeatureFlag): Promise<FeatureFlag> {
    const [flag] = await db.insert(featureFlags).values(flagData).returning();
    return flag;
  }

  async updateFeatureFlag(id: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const [flag] = await db
      .update(featureFlags)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(featureFlags.id, id))
      .returning();
    return flag;
  }

  // Analytics operations
  async logAnalyticsEvent(eventData: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    const [event] = await db.insert(analyticsEvents).values(eventData).returning();
    return event;
  }

  async getAnalyticsEvents(filters?: any): Promise<AnalyticsEvent[]> {
    return await db
      .select()
      .from(analyticsEvents)
      .orderBy(desc(analyticsEvents.timestamp))
      .limit(filters?.limit || 1000);
  }
}

export const storage = new DatabaseStorage();
