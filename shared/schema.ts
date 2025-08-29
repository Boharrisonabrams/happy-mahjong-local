import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  uuid,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  username: varchar("username").unique(),
  
  // Game preferences
  preferredTileSkin: varchar("preferred_tile_skin").default("classic"),
  preferredLayout: varchar("preferred_layout").default("standard"),
  soundEnabled: boolean("sound_enabled").default(true),
  hintsEnabled: boolean("hints_enabled").default(true),
  autoArrangeTiles: boolean("auto_arrange_tiles").default(false),
  highContrastMode: boolean("high_contrast_mode").default(false),
  colorblindSupport: boolean("colorblind_support").default(false),
  animationSpeed: integer("animation_speed").default(75),
  
  // Analytics
  analyticsEnabled: boolean("analytics_enabled").default(true),
  
  // Subscription
  subscriptionTier: varchar("subscription_tier").default("free"), // free, pro
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Game tables
export const gameTables = pgTable("game_tables", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  hostUserId: varchar("host_user_id").references(() => users.id).notNull(),
  isPrivate: boolean("is_private").default(false),
  inviteCode: varchar("invite_code").unique(),
  maxPlayers: integer("max_players").default(4),
  gameMode: varchar("game_mode").default("single-player"), // single-player, multiplayer
  botDifficulty: varchar("bot_difficulty"), // easy, standard, strong
  status: varchar("status").default("waiting"), // waiting, playing, finished
  currentGameId: uuid("current_game_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Game sessions
export const games = pgTable("games", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tableId: uuid("table_id").references(() => gameTables.id).notNull(),
  gameNumber: integer("game_number").default(1),
  status: varchar("status").default("setup"), // setup, charleston, playing, finished
  currentRound: integer("current_round").default(1),
  currentPlayerIndex: integer("current_player_index").default(0),
  wallTiles: jsonb("wall_tiles"), // remaining tiles in wall
  gameState: jsonb("game_state"), // complete game state snapshot
  winnerId: varchar("winner_id").references(() => users.id),
  winningPattern: varchar("winning_pattern"),
  seed: varchar("seed").notNull(), // for deterministic tile distribution
  createdAt: timestamp("created_at").defaultNow(),
  finishedAt: timestamp("finished_at"),
});

// Game participants (players and bots)
export const gameParticipants = pgTable("game_participants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: uuid("game_id").references(() => games.id).notNull(),
  userId: varchar("user_id").references(() => users.id), // null for bots
  botId: varchar("bot_id"), // bot identifier if participant is a bot
  seatPosition: integer("seat_position").notNull(), // 0-3
  isBot: boolean("is_bot").default(false),
  rackTiles: jsonb("rack_tiles"), // current hand tiles
  meldedTiles: jsonb("melded_tiles"), // exposed melds
  discardedTiles: jsonb("discarded_tiles"), // tiles discarded by this player
  flowers: jsonb("flowers"), // flower tiles
  score: integer("score").default(0),
  isReady: boolean("is_ready").default(false),
  lastActionAt: timestamp("last_action_at"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Game actions audit log
export const gameActions = pgTable("game_actions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: uuid("game_id").references(() => games.id).notNull(),
  playerId: varchar("player_id"), // user_id or bot_id
  actionType: varchar("action_type").notNull(), // draw, discard, call, expose, charleston, etc.
  actionData: jsonb("action_data"), // action-specific data
  gameStateBefore: jsonb("game_state_before"),
  gameStateAfter: jsonb("game_state_after"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Mahjong hand patterns
export const handPatterns = pgTable("hand_patterns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  category: varchar("category").notNull(), // year, category like "2025", "Consecutive Run", etc.
  description: text("description"),
  concealedOnly: boolean("concealed_only").default(false),
  jokersAllowed: boolean("jokers_allowed").default(true),
  flowersUsage: varchar("flowers_usage").default("optional"), // required, optional, none
  patternSets: jsonb("pattern_sets").notNull(), // array of set definitions
  points: integer("points").default(25),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tableId: uuid("table_id").references(() => gameTables.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  isModerated: boolean("is_moderated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// User reports and moderation
export const userReports = pgTable("user_reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").references(() => users.id).notNull(),
  reportedUserId: varchar("reported_user_id").references(() => users.id).notNull(),
  tableId: uuid("table_id").references(() => gameTables.id),
  reason: varchar("reason").notNull(),
  description: text("description"),
  status: varchar("status").default("pending"), // pending, reviewed, resolved
  moderatorId: varchar("moderator_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Tutorial progress tracking
export const tutorialProgress = pgTable("tutorial_progress", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  tutorialStep: varchar("tutorial_step").notNull(),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Daily puzzles
export const dailyPuzzles = pgTable("daily_puzzles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  date: varchar("date").unique().notNull(), // YYYY-MM-DD format
  seed: varchar("seed").notNull(),
  puzzleData: jsonb("puzzle_data").notNull(), // puzzle state and solution
  difficulty: varchar("difficulty").default("standard"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Daily puzzle attempts
export const puzzleAttempts = pgTable("puzzle_attempts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  puzzleId: uuid("puzzle_id").references(() => dailyPuzzles.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  completed: boolean("completed").default(false),
  timeSeconds: integer("time_seconds"),
  moves: integer("moves"),
  hint_used: boolean("hint_used").default(false),
  score: integer("score"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Feature flags
export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").unique().notNull(),
  enabled: boolean("enabled").default(false),
  description: text("description"),
  rolloutPercentage: real("rollout_percentage").default(0),
  userWhitelist: jsonb("user_whitelist"), // array of user IDs
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Analytics events
export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id"),
  eventType: varchar("event_type").notNull(),
  eventData: jsonb("event_data"),
  tableId: uuid("table_id").references(() => gameTables.id),
  gameId: uuid("game_id").references(() => games.id),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  hostedTables: many(gameTables),
  gameParticipants: many(gameParticipants),
  chatMessages: many(chatMessages),
  reportsCreated: many(userReports, { relationName: "reporter" }),
  reportsReceived: many(userReports, { relationName: "reported" }),
  tutorialProgress: many(tutorialProgress),
  puzzleAttempts: many(puzzleAttempts),
  analyticsEvents: many(analyticsEvents),
}));

export const gameTablesRelations = relations(gameTables, ({ one, many }) => ({
  host: one(users, {
    fields: [gameTables.hostUserId],
    references: [users.id],
  }),
  games: many(games),
  chatMessages: many(chatMessages),
  reports: many(userReports),
  analyticsEvents: many(analyticsEvents),
}));

export const gamesRelations = relations(games, ({ one, many }) => ({
  table: one(gameTables, {
    fields: [games.tableId],
    references: [gameTables.id],
  }),
  participants: many(gameParticipants),
  actions: many(gameActions),
  analyticsEvents: many(analyticsEvents),
}));

export const gameParticipantsRelations = relations(gameParticipants, ({ one }) => ({
  game: one(games, {
    fields: [gameParticipants.gameId],
    references: [games.id],
  }),
  user: one(users, {
    fields: [gameParticipants.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGameTableSchema = createInsertSchema(gameTables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
  finishedAt: true,
});

export const insertGameParticipantSchema = createInsertSchema(gameParticipants).omit({
  id: true,
  joinedAt: true,
});

export const insertGameActionSchema = createInsertSchema(gameActions).omit({
  id: true,
  timestamp: true,
});

export const insertHandPatternSchema = createInsertSchema(handPatterns).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertUserReportSchema = createInsertSchema(userReports).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export const insertTutorialProgressSchema = createInsertSchema(tutorialProgress).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertDailyPuzzleSchema = createInsertSchema(dailyPuzzles).omit({
  id: true,
  createdAt: true,
});

export const insertPuzzleAttemptSchema = createInsertSchema(puzzleAttempts).omit({
  id: true,
  createdAt: true,
});

export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({
  id: true,
  timestamp: true,
});

// Type exports
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertGameTable = z.infer<typeof insertGameTableSchema>;
export type GameTable = typeof gameTables.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;
export type InsertGameParticipant = z.infer<typeof insertGameParticipantSchema>;
export type GameParticipant = typeof gameParticipants.$inferSelect;
export type InsertGameAction = z.infer<typeof insertGameActionSchema>;
export type GameAction = typeof gameActions.$inferSelect;
export type InsertHandPattern = z.infer<typeof insertHandPatternSchema>;
export type HandPattern = typeof handPatterns.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertUserReport = z.infer<typeof insertUserReportSchema>;
export type UserReport = typeof userReports.$inferSelect;
export type InsertTutorialProgress = z.infer<typeof insertTutorialProgressSchema>;
export type TutorialProgress = typeof tutorialProgress.$inferSelect;
export type InsertDailyPuzzle = z.infer<typeof insertDailyPuzzleSchema>;
export type DailyPuzzle = typeof dailyPuzzles.$inferSelect;
export type InsertPuzzleAttempt = z.infer<typeof insertPuzzleAttemptSchema>;
export type PuzzleAttempt = typeof puzzleAttempts.$inferSelect;
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

// Game-specific types
export interface TileInfo {
  id: string;
  suit: 'dots' | 'bams' | 'craks' | 'winds' | 'dragons' | 'flowers' | 'joker';
  value: string | number;
  isJoker: boolean;
  isFlower: boolean;
}

export interface MeldInfo {
  type: 'pung' | 'kong' | 'quint' | 'pair';
  tiles: TileInfo[];
  isConcealed: boolean;
  calledFrom?: number; // seat position of player who discarded the called tile
}

export interface GameStateInfo {
  phase: 'setup' | 'charleston' | 'playing' | 'finished';
  currentPlayerIndex: number;
  lastDiscardedTile?: TileInfo;
  lastDiscardedBySeat?: number;
  wallCount: number;
  charlestonPhase?: number; // 1-7: Round1(Right,Across,Left), Stop, Round2(Left,Across,Right), Courtesy
  charlestonRound?: 1 | 2 | 'courtesy'; // Track which round we're in
  charlestonPasses?: { [seatPosition: number]: TileInfo[] };
  charlestonStopped?: boolean; // Whether any player called "Stop" after Round 1
  charlestonConfirmations?: { [seatPosition: number]: boolean }; // Track player confirmations
  charlestonDirection?: 'right' | 'across' | 'left'; // Current pass direction
  charlestonDecision?: {
    status: 'pending' | 'continue' | 'stop';
    votes?: { [seatPosition: number]: 'continue' | 'stop' };
    requiredVotes?: number;
  };
}

export interface PlayerStateInfo {
  seatPosition: number;
  rack: TileInfo[];
  melds: MeldInfo[];
  discards: TileInfo[];
  flowers: TileInfo[];
  isReady: boolean;
  canCall?: boolean;
  possibleCalls?: string[];
}
