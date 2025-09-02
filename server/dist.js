var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/objectAcl.ts
function isPermissionAllowed(requested, granted) {
  if (requested === "read" /* READ */) {
    return ["read" /* READ */, "write" /* WRITE */].includes(granted);
  }
  return granted === "write" /* WRITE */;
}
function createObjectAccessGroup(group) {
  switch (group.type) {
    // Implement the case for each type of access group to instantiate.
    //
    // For example:
    // case "USER_LIST":
    //   return new UserListAccessGroup(group.id);
    // case "EMAIL_DOMAIN":
    //   return new EmailDomainAccessGroup(group.id);
    // case "GROUP_MEMBER":
    //   return new GroupMemberAccessGroup(group.id);
    // case "SUBSCRIBER":
    //   return new SubscriberAccessGroup(group.id);
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}
async function setObjectAclPolicy(objectFile, aclPolicy) {
  const [exists] = await objectFile.exists();
  if (!exists) {
    throw new Error(`Object not found: ${objectFile.name}`);
  }
  await objectFile.setMetadata({
    metadata: {
      [ACL_POLICY_METADATA_KEY]: JSON.stringify(aclPolicy)
    }
  });
}
async function getObjectAclPolicy(objectFile) {
  const [metadata] = await objectFile.getMetadata();
  const aclPolicy = metadata?.metadata?.[ACL_POLICY_METADATA_KEY];
  if (!aclPolicy) {
    return null;
  }
  return JSON.parse(aclPolicy);
}
async function canAccessObject({
  userId,
  objectFile,
  requestedPermission
}) {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy) {
    return false;
  }
  if (aclPolicy.visibility === "public" && requestedPermission === "read" /* READ */) {
    return true;
  }
  if (!userId) {
    return false;
  }
  if (aclPolicy.owner === userId) {
    return true;
  }
  for (const rule of aclPolicy.aclRules || []) {
    const accessGroup = createObjectAccessGroup(rule.group);
    if (await accessGroup.hasMember(userId) && isPermissionAllowed(requestedPermission, rule.permission)) {
      return true;
    }
  }
  return false;
}
var ACL_POLICY_METADATA_KEY;
var init_objectAcl = __esm({
  "server/objectAcl.ts"() {
    "use strict";
    ACL_POLICY_METADATA_KEY = "custom:aclPolicy";
  }
});

// server/localObjectStorage.ts
var localObjectStorage_exports = {};
__export(localObjectStorage_exports, {
  LocalObjectStorageService: () => LocalObjectStorageService,
  ObjectNotFoundError: () => ObjectNotFoundError,
  canUserAccessObject: () => canUserAccessObject,
  localObjectStorageService: () => localObjectStorageService
});
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
async function canUserAccessObject(objectName, userId, permission) {
  try {
    const policy = await localObjectStorageService.getObjectAcl(objectName);
    return canAccessObject(policy, userId, permission);
  } catch {
    return false;
  }
}
var UPLOADS_DIR, PUBLIC_DIR, PRIVATE_DIR, ObjectNotFoundError, LocalObjectStorageService, localObjectStorageService;
var init_localObjectStorage = __esm({
  "server/localObjectStorage.ts"() {
    "use strict";
    init_objectAcl();
    UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
    PUBLIC_DIR = path.join(UPLOADS_DIR, "public");
    PRIVATE_DIR = path.join(UPLOADS_DIR, "private");
    ObjectNotFoundError = class _ObjectNotFoundError extends Error {
      constructor() {
        super("Object not found");
        this.name = "ObjectNotFoundError";
        Object.setPrototypeOf(this, _ObjectNotFoundError.prototype);
      }
    };
    LocalObjectStorageService = class {
      constructor() {
        this.ensureDirectories();
      }
      async ensureDirectories() {
        try {
          await fs.mkdir(UPLOADS_DIR, { recursive: true });
          await fs.mkdir(PUBLIC_DIR, { recursive: true });
          await fs.mkdir(PRIVATE_DIR, { recursive: true });
        } catch (error) {
          console.warn("Could not create upload directories:", error);
        }
      }
      getPublicObjectSearchPaths() {
        const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "/uploads/public";
        return Array.from(new Set(pathsStr.split(",").map((p) => p.trim()).filter(Boolean)));
      }
      getObjectPath(objectName, isPrivate = false) {
        const baseDir = isPrivate ? PRIVATE_DIR : PUBLIC_DIR;
        const sanitized = objectName.replace(/[^a-zA-Z0-9.-_]/g, "_");
        return path.join(baseDir, sanitized);
      }
      async uploadObject(objectName, buffer, metadata = {}, isPrivate = false) {
        const filePath = this.getObjectPath(objectName, isPrivate);
        try {
          await fs.writeFile(filePath, buffer);
          const metadataPath = filePath + ".metadata.json";
          await fs.writeFile(metadataPath, JSON.stringify({
            ...metadata,
            uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
            originalName: objectName,
            size: buffer.length,
            isPrivate
          }, null, 2));
          console.log(`File uploaded: ${objectName} -> ${filePath}`);
        } catch (error) {
          console.error(`Failed to upload ${objectName}:`, error);
          throw new Error(`Upload failed: ${error}`);
        }
      }
      async downloadObject(objectName, isPrivate = false) {
        const filePath = this.getObjectPath(objectName, isPrivate);
        try {
          await fs.access(filePath);
          return await fs.readFile(filePath);
        } catch (error) {
          throw new ObjectNotFoundError();
        }
      }
      async downloadObjectToResponse(objectName, res, isPrivate = false) {
        try {
          const buffer = await this.downloadObject(objectName, isPrivate);
          const metadataPath = this.getObjectPath(objectName, isPrivate) + ".metadata.json";
          let metadata = {};
          try {
            const metadataContent = await fs.readFile(metadataPath, "utf8");
            metadata = JSON.parse(metadataContent);
          } catch {
          }
          if (metadata.contentType) {
            res.setHeader("Content-Type", metadata.contentType);
          }
          res.setHeader("Content-Length", buffer.length);
          res.setHeader("Cache-Control", "public, max-age=3600");
          res.send(buffer);
        } catch (error) {
          if (error instanceof ObjectNotFoundError) {
            res.status(404).json({ error: "Object not found" });
          } else {
            res.status(500).json({ error: "Download failed" });
          }
        }
      }
      async deleteObject(objectName, isPrivate = false) {
        const filePath = this.getObjectPath(objectName, isPrivate);
        const metadataPath = filePath + ".metadata.json";
        try {
          await fs.unlink(filePath);
          try {
            await fs.unlink(metadataPath);
          } catch {
          }
          console.log(`File deleted: ${objectName}`);
        } catch (error) {
          if (error.code === "ENOENT") {
            throw new ObjectNotFoundError();
          }
          throw new Error(`Delete failed: ${error}`);
        }
      }
      async listObjects(prefix = "", isPrivate = false) {
        const baseDir = isPrivate ? PRIVATE_DIR : PUBLIC_DIR;
        try {
          const files = await fs.readdir(baseDir);
          return files.filter((file) => !file.endsWith(".metadata.json")).filter((file) => file.startsWith(prefix)).sort();
        } catch (error) {
          console.warn(`Failed to list objects in ${baseDir}:`, error);
          return [];
        }
      }
      async getObjectMetadata(objectName, isPrivate = false) {
        const metadataPath = this.getObjectPath(objectName, isPrivate) + ".metadata.json";
        try {
          const content = await fs.readFile(metadataPath, "utf8");
          return JSON.parse(content);
        } catch (error) {
          throw new ObjectNotFoundError();
        }
      }
      async objectExists(objectName, isPrivate = false) {
        const filePath = this.getObjectPath(objectName, isPrivate);
        try {
          await fs.access(filePath);
          return true;
        } catch {
          return false;
        }
      }
      // ACL methods (simplified for local development)
      async setObjectAcl(objectName, policy) {
        const metadataPath = this.getObjectPath(objectName) + ".metadata.json";
        try {
          let metadata = {};
          try {
            const content = await fs.readFile(metadataPath, "utf8");
            metadata = JSON.parse(content);
          } catch {
          }
          metadata.acl = policy;
          await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
        } catch (error) {
          console.warn(`Failed to set ACL for ${objectName}:`, error);
        }
      }
      async getObjectAcl(objectName) {
        try {
          const metadata = await this.getObjectMetadata(objectName);
          return metadata.acl || { permissions: [] };
        } catch {
          return { permissions: [] };
        }
      }
      // Generate a unique filename
      generateUniqueFileName(originalName) {
        const ext = path.extname(originalName);
        const name = path.basename(originalName, ext);
        const uuid2 = randomUUID();
        return `${name}_${uuid2}${ext}`;
      }
    };
    localObjectStorageService = new LocalObjectStorageService();
  }
});

// server/objectStorage.ts
var objectStorage_exports = {};
__export(objectStorage_exports, {
  ObjectNotFoundError: () => ObjectNotFoundError2,
  ObjectStorageService: () => ObjectStorageService,
  objectStorageClient: () => objectStorageClient
});
import { Storage } from "@google-cloud/storage";
import { randomUUID as randomUUID2 } from "crypto";
function parseObjectPath(path5) {
  if (!path5.startsWith("/")) {
    path5 = `/${path5}`;
  }
  const pathParts = path5.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return {
    bucketName,
    objectName
  };
}
async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec
}) {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1e3).toISOString()
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, make sure you're running on Replit`
    );
  }
  const { signed_url: signedURL } = await response.json();
  return signedURL;
}
var REPLIT_SIDECAR_ENDPOINT, objectStorageClient, ObjectNotFoundError2, ObjectStorageService;
var init_objectStorage = __esm({
  "server/objectStorage.ts"() {
    "use strict";
    init_objectAcl();
    REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
    objectStorageClient = new Storage({
      credentials: {
        audience: "replit",
        subject_token_type: "access_token",
        token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
        type: "external_account",
        credential_source: {
          url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
          format: {
            type: "json",
            subject_token_field_name: "access_token"
          }
        },
        universe_domain: "googleapis.com"
      },
      projectId: ""
    });
    ObjectNotFoundError2 = class _ObjectNotFoundError extends Error {
      constructor() {
        super("Object not found");
        this.name = "ObjectNotFoundError";
        Object.setPrototypeOf(this, _ObjectNotFoundError.prototype);
      }
    };
    ObjectStorageService = class {
      constructor() {
      }
      // Gets the public object search paths.
      getPublicObjectSearchPaths() {
        const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
        const paths = Array.from(
          new Set(
            pathsStr.split(",").map((path5) => path5.trim()).filter((path5) => path5.length > 0)
          )
        );
        if (paths.length === 0) {
          throw new Error(
            "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
          );
        }
        return paths;
      }
      // Gets the private object directory.
      getPrivateObjectDir() {
        const dir = process.env.PRIVATE_OBJECT_DIR || "";
        if (!dir) {
          throw new Error(
            "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
          );
        }
        return dir;
      }
      // Search for a public object from the search paths.
      async searchPublicObject(filePath) {
        for (const searchPath of this.getPublicObjectSearchPaths()) {
          const fullPath = `${searchPath}/${filePath}`;
          const { bucketName, objectName } = parseObjectPath(fullPath);
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);
          const [exists] = await file.exists();
          if (exists) {
            return file;
          }
        }
        return null;
      }
      // Downloads an object to the response.
      async downloadObject(file, res, cacheTtlSec = 3600) {
        try {
          const [metadata] = await file.getMetadata();
          const aclPolicy = await getObjectAclPolicy(file);
          const isPublic = aclPolicy?.visibility === "public";
          res.set({
            "Content-Type": metadata.contentType || "application/octet-stream",
            "Content-Length": metadata.size,
            "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`
          });
          const stream = file.createReadStream();
          stream.on("error", (err) => {
            console.error("Stream error:", err);
            if (!res.headersSent) {
              res.status(500).json({ error: "Error streaming file" });
            }
          });
          stream.pipe(res);
        } catch (error) {
          console.error("Error downloading file:", error);
          if (!res.headersSent) {
            res.status(500).json({ error: "Error downloading file" });
          }
        }
      }
      // Gets the upload URL for tile theme images.
      async getTileThemeUploadURL(themeId, tileType) {
        const privateObjectDir = this.getPrivateObjectDir();
        if (!privateObjectDir) {
          throw new Error(
            "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
          );
        }
        const imageId = randomUUID2();
        const fullPath = `${privateObjectDir}/tiles/${themeId}/${tileType}-${imageId}`;
        const { bucketName, objectName } = parseObjectPath(fullPath);
        return signObjectURL({
          bucketName,
          objectName,
          method: "PUT",
          ttlSec: 900
        });
      }
      // Gets the upload URL for a generic object entity.
      async getObjectEntityUploadURL() {
        const privateObjectDir = this.getPrivateObjectDir();
        if (!privateObjectDir) {
          throw new Error(
            "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
          );
        }
        const objectId = randomUUID2();
        const fullPath = `${privateObjectDir}/uploads/${objectId}`;
        const { bucketName, objectName } = parseObjectPath(fullPath);
        return signObjectURL({
          bucketName,
          objectName,
          method: "PUT",
          ttlSec: 900
        });
      }
      // Gets the object entity file from the object path.
      async getObjectEntityFile(objectPath) {
        if (!objectPath.startsWith("/objects/")) {
          throw new ObjectNotFoundError2();
        }
        const parts = objectPath.slice(1).split("/");
        if (parts.length < 2) {
          throw new ObjectNotFoundError2();
        }
        const entityId = parts.slice(1).join("/");
        let entityDir = this.getPrivateObjectDir();
        if (!entityDir.endsWith("/")) {
          entityDir = `${entityDir}/`;
        }
        const objectEntityPath = `${entityDir}${entityId}`;
        const { bucketName, objectName } = parseObjectPath(objectEntityPath);
        const bucket = objectStorageClient.bucket(bucketName);
        const objectFile = bucket.file(objectName);
        const [exists] = await objectFile.exists();
        if (!exists) {
          throw new ObjectNotFoundError2();
        }
        return objectFile;
      }
      normalizeObjectEntityPath(rawPath) {
        if (!rawPath.startsWith("https://storage.googleapis.com/")) {
          return rawPath;
        }
        const url = new URL(rawPath);
        const rawObjectPath = url.pathname;
        let objectEntityDir = this.getPrivateObjectDir();
        if (!objectEntityDir.endsWith("/")) {
          objectEntityDir = `${objectEntityDir}/`;
        }
        if (!rawObjectPath.startsWith(objectEntityDir)) {
          return rawObjectPath;
        }
        const entityId = rawObjectPath.slice(objectEntityDir.length);
        return `/objects/${entityId}`;
      }
      // Tries to set the ACL policy for the object entity and return the normalized path.
      async trySetObjectEntityAclPolicy(rawPath, aclPolicy) {
        const normalizedPath = this.normalizeObjectEntityPath(rawPath);
        if (!normalizedPath.startsWith("/")) {
          return normalizedPath;
        }
        const objectFile = await this.getObjectEntityFile(normalizedPath);
        await setObjectAclPolicy(objectFile, aclPolicy);
        return normalizedPath;
      }
      // Checks if the user can access the object entity.
      async canAccessObjectEntity({
        userId,
        objectFile,
        requestedPermission
      }) {
        return canAccessObject({
          userId,
          objectFile,
          requestedPermission: requestedPermission ?? "read" /* READ */
        });
      }
    };
  }
});

// server/index.ts
import "dotenv/config";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  analyticsEvents: () => analyticsEvents,
  chatMessages: () => chatMessages,
  dailyPuzzles: () => dailyPuzzles,
  featureFlags: () => featureFlags,
  gameActions: () => gameActions,
  gameParticipants: () => gameParticipants,
  gameParticipantsRelations: () => gameParticipantsRelations,
  gameTables: () => gameTables,
  gameTablesRelations: () => gameTablesRelations,
  games: () => games,
  gamesRelations: () => gamesRelations,
  handPatterns: () => handPatterns,
  insertAnalyticsEventSchema: () => insertAnalyticsEventSchema,
  insertChatMessageSchema: () => insertChatMessageSchema,
  insertDailyPuzzleSchema: () => insertDailyPuzzleSchema,
  insertFeatureFlagSchema: () => insertFeatureFlagSchema,
  insertGameActionSchema: () => insertGameActionSchema,
  insertGameParticipantSchema: () => insertGameParticipantSchema,
  insertGameSchema: () => insertGameSchema,
  insertGameTableSchema: () => insertGameTableSchema,
  insertHandPatternSchema: () => insertHandPatternSchema,
  insertPuzzleAttemptSchema: () => insertPuzzleAttemptSchema,
  insertTileThemeSchema: () => insertTileThemeSchema,
  insertTutorialProgressSchema: () => insertTutorialProgressSchema,
  insertUserReportSchema: () => insertUserReportSchema,
  insertUserSchema: () => insertUserSchema,
  insertUserThemePreferenceSchema: () => insertUserThemePreferenceSchema,
  puzzleAttempts: () => puzzleAttempts,
  sessions: () => sessions,
  tileThemes: () => tileThemes,
  tileThemesRelations: () => tileThemesRelations,
  tutorialProgress: () => tutorialProgress,
  userReports: () => userReports,
  userThemePreferences: () => userThemePreferences,
  userThemePreferencesRelations: () => userThemePreferencesRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { sql } from "drizzle-orm";
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
  real
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  username: varchar("username").unique(),
  // Game preferences
  preferredTileSkin: varchar("preferred_tile_skin").default("classic"),
  selectedThemeId: varchar("selected_theme_id"),
  // User's chosen tile theme
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
  subscriptionTier: varchar("subscription_tier").default("free"),
  // free, pro
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var gameTables = pgTable("game_tables", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  hostUserId: varchar("host_user_id").references(() => users.id).notNull(),
  isPrivate: boolean("is_private").default(false),
  inviteCode: varchar("invite_code").unique(),
  maxPlayers: integer("max_players").default(4),
  gameMode: varchar("game_mode").default("single-player"),
  // single-player, multiplayer
  botDifficulty: varchar("bot_difficulty"),
  // easy, standard, strong
  status: varchar("status").default("waiting"),
  // waiting, playing, finished
  currentGameId: uuid("current_game_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var games = pgTable("games", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tableId: uuid("table_id").references(() => gameTables.id).notNull(),
  gameNumber: integer("game_number").default(1),
  status: varchar("status").default("setup"),
  // setup, charleston, playing, finished
  currentRound: integer("current_round").default(1),
  currentPlayerIndex: integer("current_player_index").default(0),
  wallTiles: jsonb("wall_tiles"),
  // remaining tiles in wall
  gameState: jsonb("game_state"),
  // complete game state snapshot
  winnerId: varchar("winner_id").references(() => users.id),
  winningPattern: varchar("winning_pattern"),
  seed: varchar("seed").notNull(),
  // for deterministic tile distribution
  createdAt: timestamp("created_at").defaultNow(),
  finishedAt: timestamp("finished_at")
});
var gameParticipants = pgTable("game_participants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: uuid("game_id").references(() => games.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  // null for bots
  botId: varchar("bot_id"),
  // bot identifier if participant is a bot
  seatPosition: integer("seat_position").notNull(),
  // 0-3
  isBot: boolean("is_bot").default(false),
  rackTiles: jsonb("rack_tiles"),
  // current hand tiles
  meldedTiles: jsonb("melded_tiles"),
  // exposed melds
  discardedTiles: jsonb("discarded_tiles"),
  // tiles discarded by this player
  flowers: jsonb("flowers"),
  // flower tiles
  score: integer("score").default(0),
  isReady: boolean("is_ready").default(false),
  lastActionAt: timestamp("last_action_at"),
  joinedAt: timestamp("joined_at").defaultNow()
});
var gameActions = pgTable("game_actions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: uuid("game_id").references(() => games.id).notNull(),
  playerId: varchar("player_id"),
  // user_id or bot_id
  actionType: varchar("action_type").notNull(),
  // draw, discard, call, expose, charleston, etc.
  actionData: jsonb("action_data"),
  // action-specific data
  gameStateBefore: jsonb("game_state_before"),
  gameStateAfter: jsonb("game_state_after"),
  timestamp: timestamp("timestamp").defaultNow()
});
var handPatterns = pgTable("hand_patterns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  category: varchar("category").notNull(),
  // year, category like "2025", "Consecutive Run", etc.
  description: text("description"),
  concealedOnly: boolean("concealed_only").default(false),
  jokersAllowed: boolean("jokers_allowed").default(true),
  flowersUsage: varchar("flowers_usage").default("optional"),
  // required, optional, none
  patternSets: jsonb("pattern_sets").notNull(),
  // array of set definitions
  points: integer("points").default(25),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tableId: uuid("table_id").references(() => gameTables.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  isModerated: boolean("is_moderated").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var userReports = pgTable("user_reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").references(() => users.id).notNull(),
  reportedUserId: varchar("reported_user_id").references(() => users.id).notNull(),
  tableId: uuid("table_id").references(() => gameTables.id),
  reason: varchar("reason").notNull(),
  description: text("description"),
  status: varchar("status").default("pending"),
  // pending, reviewed, resolved
  moderatorId: varchar("moderator_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at")
});
var tutorialProgress = pgTable("tutorial_progress", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  tutorialStep: varchar("tutorial_step").notNull(),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow()
});
var dailyPuzzles = pgTable("daily_puzzles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  date: varchar("date").unique().notNull(),
  // YYYY-MM-DD format
  seed: varchar("seed").notNull(),
  puzzleData: jsonb("puzzle_data").notNull(),
  // puzzle state and solution
  difficulty: varchar("difficulty").default("standard"),
  createdAt: timestamp("created_at").defaultNow()
});
var puzzleAttempts = pgTable("puzzle_attempts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  puzzleId: uuid("puzzle_id").references(() => dailyPuzzles.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  completed: boolean("completed").default(false),
  timeSeconds: integer("time_seconds"),
  moves: integer("moves"),
  hint_used: boolean("hint_used").default(false),
  score: integer("score"),
  createdAt: timestamp("created_at").defaultNow()
});
var featureFlags = pgTable("feature_flags", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").unique().notNull(),
  enabled: boolean("enabled").default(false),
  description: text("description"),
  rolloutPercentage: real("rollout_percentage").default(0),
  userWhitelist: jsonb("user_whitelist"),
  // array of user IDs
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id"),
  eventType: varchar("event_type").notNull(),
  eventData: jsonb("event_data"),
  tableId: uuid("table_id").references(() => gameTables.id),
  gameId: uuid("game_id").references(() => games.id),
  timestamp: timestamp("timestamp").defaultNow()
});
var tileThemes = pgTable("tile_themes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  creatorId: varchar("creator_id").references(() => users.id).notNull(),
  isPublic: boolean("is_public").default(false),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  // Tile image mappings - object with paths to different tile images
  tileImagePaths: jsonb("tile_image_paths").notNull(),
  // { dots: {...}, bams: {...}, craks: {...}, etc. }
  // Preview image for theme selection UI
  previewImagePath: varchar("preview_image_path"),
  // Usage stats
  downloadCount: integer("download_count").default(0),
  likeCount: integer("like_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var userThemePreferences = pgTable("user_theme_preferences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  themeId: uuid("theme_id").references(() => tileThemes.id).notNull(),
  isLiked: boolean("is_liked").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var usersRelations = relations(users, ({ many }) => ({
  hostedTables: many(gameTables),
  gameParticipants: many(gameParticipants),
  chatMessages: many(chatMessages),
  reportsCreated: many(userReports, { relationName: "reporter" }),
  reportsReceived: many(userReports, { relationName: "reported" }),
  tutorialProgress: many(tutorialProgress),
  puzzleAttempts: many(puzzleAttempts),
  analyticsEvents: many(analyticsEvents),
  createdThemes: many(tileThemes),
  themePreferences: many(userThemePreferences)
}));
var gameTablesRelations = relations(gameTables, ({ one, many }) => ({
  host: one(users, {
    fields: [gameTables.hostUserId],
    references: [users.id]
  }),
  games: many(games),
  chatMessages: many(chatMessages),
  reports: many(userReports),
  analyticsEvents: many(analyticsEvents)
}));
var gamesRelations = relations(games, ({ one, many }) => ({
  table: one(gameTables, {
    fields: [games.tableId],
    references: [gameTables.id]
  }),
  participants: many(gameParticipants),
  actions: many(gameActions),
  analyticsEvents: many(analyticsEvents)
}));
var gameParticipantsRelations = relations(gameParticipants, ({ one }) => ({
  game: one(games, {
    fields: [gameParticipants.gameId],
    references: [games.id]
  }),
  user: one(users, {
    fields: [gameParticipants.userId],
    references: [users.id]
  })
}));
var tileThemesRelations = relations(tileThemes, ({ one, many }) => ({
  creator: one(users, {
    fields: [tileThemes.creatorId],
    references: [users.id]
  }),
  userPreferences: many(userThemePreferences)
}));
var userThemePreferencesRelations = relations(userThemePreferences, ({ one }) => ({
  user: one(users, {
    fields: [userThemePreferences.userId],
    references: [users.id]
  }),
  theme: one(tileThemes, {
    fields: [userThemePreferences.themeId],
    references: [tileThemes.id]
  })
}));
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertGameTableSchema = createInsertSchema(gameTables).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
  finishedAt: true
});
var insertGameParticipantSchema = createInsertSchema(gameParticipants).omit({
  id: true,
  joinedAt: true
});
var insertGameActionSchema = createInsertSchema(gameActions).omit({
  id: true,
  timestamp: true
});
var insertHandPatternSchema = createInsertSchema(handPatterns).omit({
  id: true,
  createdAt: true
});
var insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true
});
var insertUserReportSchema = createInsertSchema(userReports).omit({
  id: true,
  createdAt: true,
  resolvedAt: true
});
var insertTutorialProgressSchema = createInsertSchema(tutorialProgress).omit({
  id: true,
  createdAt: true,
  completedAt: true
});
var insertDailyPuzzleSchema = createInsertSchema(dailyPuzzles).omit({
  id: true,
  createdAt: true
});
var insertPuzzleAttemptSchema = createInsertSchema(puzzleAttempts).omit({
  id: true,
  createdAt: true
});
var insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({
  id: true,
  timestamp: true
});
var insertTileThemeSchema = createInsertSchema(tileThemes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertUserThemePreferenceSchema = createInsertSchema(userThemePreferences).omit({
  id: true,
  createdAt: true
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
var pool = null;
var db = null;
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === "postgresql://test:test@localhost:5432/mahjong_test") {
  console.warn("\u26A0\uFE0F  DATABASE_URL not configured or using test URL. Some features may not work.");
  console.warn("   Please update .env with your actual Neon database URL from Replit.");
  pool = null;
  const mockResult = {
    then: (resolve) => resolve([]),
    catch: (reject) => reject,
    orderBy: () => mockResult,
    where: () => mockResult,
    set: () => mockResult,
    values: () => mockResult,
    returning: () => mockResult,
    from: () => mockResult
  };
  db = {
    select: () => mockResult,
    insert: () => mockResult,
    update: () => mockResult,
    delete: () => mockResult,
    // Add transaction support
    transaction: (callback) => callback(db)
  };
} else {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema: schema_exports });
}

// server/storage.ts
import { eq, desc, and } from "drizzle-orm";
var DatabaseStorage = class {
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async upsertUser(userData) {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: {
        ...userData,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return user;
  }
  async updateUserSelectedTheme(userId, themeId) {
    await db.update(users).set({
      selectedThemeId: themeId,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, userId));
  }
  // Game table operations
  async createGameTable(tableData) {
    const [table] = await db.insert(gameTables).values(tableData).returning();
    return table;
  }
  async getGameTable(id) {
    const [table] = await db.select().from(gameTables).where(eq(gameTables.id, id));
    return table;
  }
  async getGameTables(limit = 50) {
    return await db.select().from(gameTables).where(eq(gameTables.status, "waiting")).orderBy(desc(gameTables.createdAt)).limit(limit);
  }
  async updateGameTable(id, updates) {
    const [table] = await db.update(gameTables).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(gameTables.id, id)).returning();
    return table;
  }
  async deleteGameTable(id) {
    const table = await this.getGameTable(id);
    if (table?.currentGameId) {
      await db.delete(gameParticipants).where(eq(gameParticipants.gameId, table.currentGameId));
      await db.delete(gameActions).where(eq(gameActions.gameId, table.currentGameId));
      await db.delete(games).where(eq(games.id, table.currentGameId));
    }
    await db.delete(analyticsEvents).where(eq(analyticsEvents.tableId, id));
    await db.delete(chatMessages).where(eq(chatMessages.tableId, id));
    await db.delete(gameTables).where(eq(gameTables.id, id));
  }
  // Game operations
  async createGame(gameData) {
    const [game] = await db.insert(games).values(gameData).returning();
    return game;
  }
  async getGame(id) {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game;
  }
  async updateGame(id, updates) {
    const [game] = await db.update(games).set(updates).where(eq(games.id, id)).returning();
    return game;
  }
  async getGamesByTable(tableId) {
    return await db.select().from(games).where(eq(games.tableId, tableId)).orderBy(desc(games.createdAt));
  }
  // Game participant operations
  async addGameParticipant(participantData) {
    const [participant] = await db.insert(gameParticipants).values(participantData).returning();
    return participant;
  }
  async getGameParticipants(gameId) {
    return await db.select().from(gameParticipants).where(eq(gameParticipants.gameId, gameId)).orderBy(gameParticipants.seatPosition);
  }
  async updateGameParticipant(id, updates) {
    const [participant] = await db.update(gameParticipants).set(updates).where(eq(gameParticipants.id, id)).returning();
    return participant;
  }
  async removeGameParticipant(id) {
    await db.delete(gameParticipants).where(eq(gameParticipants.id, id));
  }
  // Game action operations
  async logGameAction(actionData) {
    const [action] = await db.insert(gameActions).values(actionData).returning();
    return action;
  }
  async getGameActions(gameId, limit = 1e3) {
    return await db.select().from(gameActions).where(eq(gameActions.gameId, gameId)).orderBy(gameActions.timestamp).limit(limit);
  }
  // Hand pattern operations
  async createHandPattern(patternData) {
    const [pattern] = await db.insert(handPatterns).values(patternData).returning();
    return pattern;
  }
  async getHandPatterns(category) {
    const query = db.select().from(handPatterns);
    if (category) {
      return await query.where(eq(handPatterns.category, category));
    }
    return await query.orderBy(handPatterns.category, handPatterns.name);
  }
  async getActiveHandPatterns() {
    return await db.select().from(handPatterns).where(eq(handPatterns.isActive, true)).orderBy(handPatterns.category, handPatterns.name);
  }
  async updateHandPattern(id, updates) {
    const [pattern] = await db.update(handPatterns).set(updates).where(eq(handPatterns.id, id)).returning();
    return pattern;
  }
  // Chat operations
  async createChatMessage(messageData) {
    const [message] = await db.insert(chatMessages).values(messageData).returning();
    return message;
  }
  async getChatMessages(tableId, limit = 100) {
    return await db.select().from(chatMessages).where(eq(chatMessages.tableId, tableId)).orderBy(desc(chatMessages.createdAt)).limit(limit);
  }
  // User report operations
  async createUserReport(reportData) {
    const [report] = await db.insert(userReports).values(reportData).returning();
    return report;
  }
  async getUserReports(status) {
    const query = db.select().from(userReports);
    if (status) {
      return await query.where(eq(userReports.status, status));
    }
    return await query.orderBy(desc(userReports.createdAt));
  }
  async updateUserReport(id, updates) {
    const [report] = await db.update(userReports).set(updates).where(eq(userReports.id, id)).returning();
    return report;
  }
  // Tutorial operations
  async getTutorialProgress(userId) {
    return await db.select().from(tutorialProgress).where(eq(tutorialProgress.userId, userId)).orderBy(tutorialProgress.tutorialStep);
  }
  async updateTutorialProgress(progressData) {
    const [progress] = await db.insert(tutorialProgress).values(progressData).onConflictDoUpdate({
      target: [tutorialProgress.userId, tutorialProgress.tutorialStep],
      set: {
        completed: progressData.completed,
        completedAt: progressData.completed ? /* @__PURE__ */ new Date() : null
      }
    }).returning();
    return progress;
  }
  // Daily puzzle operations
  async createDailyPuzzle(puzzleData) {
    const [puzzle] = await db.insert(dailyPuzzles).values(puzzleData).returning();
    return puzzle;
  }
  async getDailyPuzzle(date) {
    const [puzzle] = await db.select().from(dailyPuzzles).where(eq(dailyPuzzles.date, date));
    return puzzle;
  }
  async createPuzzleAttempt(attemptData) {
    const [attempt] = await db.insert(puzzleAttempts).values(attemptData).returning();
    return attempt;
  }
  async getPuzzleAttempts(puzzleId, userId) {
    if (userId) {
      return await db.select().from(puzzleAttempts).where(and(eq(puzzleAttempts.puzzleId, puzzleId), eq(puzzleAttempts.userId, userId))).orderBy(desc(puzzleAttempts.createdAt));
    }
    return await db.select().from(puzzleAttempts).where(eq(puzzleAttempts.puzzleId, puzzleId)).orderBy(desc(puzzleAttempts.createdAt));
  }
  async getPuzzleLeaderboard(puzzleId, limit = 10) {
    return await db.select().from(puzzleAttempts).where(and(eq(puzzleAttempts.puzzleId, puzzleId), eq(puzzleAttempts.completed, true))).orderBy(puzzleAttempts.timeSeconds).limit(limit);
  }
  // Feature flag operations
  async getFeatureFlags() {
    return await db.select().from(featureFlags).orderBy(featureFlags.name);
  }
  async getFeatureFlag(name) {
    const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.name, name));
    return flag;
  }
  async createFeatureFlag(flagData) {
    const [flag] = await db.insert(featureFlags).values(flagData).returning();
    return flag;
  }
  async updateFeatureFlag(id, updates) {
    const [flag] = await db.update(featureFlags).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(featureFlags.id, id)).returning();
    return flag;
  }
  // Analytics operations
  async logAnalyticsEvent(eventData) {
    const [event] = await db.insert(analyticsEvents).values(eventData).returning();
    return event;
  }
  async getAnalyticsEvents(filters) {
    return await db.select().from(analyticsEvents).orderBy(desc(analyticsEvents.timestamp)).limit(filters?.limit || 1e3);
  }
  // Tile theme operations
  async createTileTheme(themeData) {
    const [theme] = await db.insert(tileThemes).values(themeData).returning();
    return theme;
  }
  async getTileThemes(creatorId) {
    if (creatorId) {
      return await db.select().from(tileThemes).where(and(eq(tileThemes.creatorId, creatorId), eq(tileThemes.isActive, true))).orderBy(desc(tileThemes.createdAt));
    }
    return await db.select().from(tileThemes).where(eq(tileThemes.isActive, true)).orderBy(desc(tileThemes.createdAt));
  }
  async getPublicTileThemes() {
    return await db.select().from(tileThemes).where(and(eq(tileThemes.isPublic, true), eq(tileThemes.isActive, true))).orderBy(desc(tileThemes.downloadCount));
  }
  async getTileTheme(id) {
    const [theme] = await db.select().from(tileThemes).where(eq(tileThemes.id, id));
    return theme;
  }
  async updateTileTheme(id, updates) {
    const [theme] = await db.update(tileThemes).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(tileThemes.id, id)).returning();
    return theme;
  }
  async deleteTileTheme(id) {
    await db.update(tileThemes).set({ isActive: false }).where(eq(tileThemes.id, id));
  }
  // User theme preference operations
  async setUserThemePreference(preferenceData) {
    const [preference] = await db.insert(userThemePreferences).values(preferenceData).onConflictDoUpdate({
      target: [userThemePreferences.userId, userThemePreferences.themeId],
      set: { isLiked: preferenceData.isLiked }
    }).returning();
    return preference;
  }
  async getUserThemePreferences(userId) {
    return await db.select().from(userThemePreferences).where(eq(userThemePreferences.userId, userId)).orderBy(desc(userThemePreferences.createdAt));
  }
  async removeUserThemePreference(userId, themeId) {
    await db.delete(userThemePreferences).where(
      and(
        eq(userThemePreferences.userId, userId),
        eq(userThemePreferences.themeId, themeId)
      )
    );
  }
};
var storage = new DatabaseStorage();

// server/websocket.ts
import { WebSocketServer, WebSocket } from "ws";

// server/services/gameEngine.ts
var GameEngine = class _GameEngine {
  static instance;
  static getInstance() {
    if (!_GameEngine.instance) {
      _GameEngine.instance = new _GameEngine();
    }
    return _GameEngine.instance;
  }
  // Tile generation and shuffling
  generateFullTileset() {
    const tiles = [];
    let tileId = 0;
    for (let value = 1; value <= 9; value++) {
      for (let i = 0; i < 4; i++) {
        tiles.push({
          id: `tile_${tileId++}`,
          suit: "dots",
          value,
          isJoker: false,
          isFlower: false
        });
      }
    }
    for (let value = 1; value <= 9; value++) {
      for (let i = 0; i < 4; i++) {
        tiles.push({
          id: `tile_${tileId++}`,
          suit: "bams",
          value,
          isJoker: false,
          isFlower: false
        });
      }
    }
    for (let value = 1; value <= 9; value++) {
      for (let i = 0; i < 4; i++) {
        tiles.push({
          id: `tile_${tileId++}`,
          suit: "craks",
          value,
          isJoker: false,
          isFlower: false
        });
      }
    }
    const winds = ["N", "E", "S", "W"];
    for (const wind of winds) {
      for (let i = 0; i < 4; i++) {
        tiles.push({
          id: `tile_${tileId++}`,
          suit: "winds",
          value: wind,
          isJoker: false,
          isFlower: false
        });
      }
    }
    const dragons = ["R", "G", "W"];
    for (const dragon of dragons) {
      for (let i = 0; i < 4; i++) {
        tiles.push({
          id: `tile_${tileId++}`,
          suit: "dragons",
          value: dragon,
          isJoker: false,
          isFlower: false
        });
      }
    }
    for (let value = 1; value <= 8; value++) {
      tiles.push({
        id: `tile_${tileId++}`,
        suit: "flowers",
        value,
        isJoker: false,
        isFlower: true
      });
    }
    for (let i = 0; i < 8; i++) {
      tiles.push({
        id: `tile_${tileId++}`,
        suit: "joker",
        value: "J",
        isJoker: true,
        isFlower: false
      });
    }
    return tiles;
  }
  shuffleTiles(tiles, seed) {
    let seedNum = this.hashString(seed);
    const random = () => {
      seedNum = (seedNum * 9301 + 49297) % 233280;
      return seedNum / 233280;
    };
    const shuffled = [...tiles];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  hashString(str) {
    if (!str) {
      str = `${Date.now()}_${Math.random()}`;
    }
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  // Deal initial hands
  dealInitialHands(shuffledTiles) {
    const playerHands = [[], [], [], []];
    let tileIndex = 0;
    for (let round = 0; round < 13; round++) {
      for (let player = 0; player < 4; player++) {
        if (tileIndex < shuffledTiles.length) {
          playerHands[player].push(shuffledTiles[tileIndex++]);
        }
      }
    }
    const wall = shuffledTiles.slice(tileIndex);
    return { playerHands, wall };
  }
  // Charleston phase logic
  getCharlestonPasses(playerHands, phase) {
    const passes = {};
    for (let seat = 0; seat < 4; seat++) {
      const nonJokerTiles = playerHands[seat].filter((tile) => !tile.isJoker);
      passes[seat] = nonJokerTiles.slice(0, Math.min(3, nonJokerTiles.length));
    }
    return passes;
  }
  executeCharlestonPass(playerHands, passes, phase) {
    const newHands = playerHands.map((hand) => [...hand]);
    for (let seat = 0; seat < 4; seat++) {
      const passedTiles = passes[seat];
      for (const tile of passedTiles) {
        const index2 = newHands[seat].findIndex((t) => t.id === tile.id);
        if (index2 !== -1) {
          newHands[seat].splice(index2, 1);
        }
      }
    }
    for (let seat = 0; seat < 4; seat++) {
      let receivedFrom;
      switch (phase) {
        case 1:
          receivedFrom = (seat + 3) % 4;
          break;
        case 2:
          receivedFrom = (seat + 2) % 4;
          break;
        case 3:
          receivedFrom = (seat + 1) % 4;
          break;
        case 4:
          receivedFrom = (seat + 1) % 4;
          break;
        case 5:
          receivedFrom = (seat + 2) % 4;
          break;
        case 6:
          receivedFrom = (seat + 3) % 4;
          break;
        case 7:
          receivedFrom = (seat + 2) % 4;
          break;
        default:
          receivedFrom = (seat + 2) % 4;
          break;
      }
      if (passes[receivedFrom]) {
        newHands[seat].push(...passes[receivedFrom]);
      }
    }
    return newHands;
  }
  // Validate moves
  canDrawTile(gameState, playerSeat) {
    return gameState.phase === "playing" && gameState.currentPlayerIndex === playerSeat;
  }
  canDiscardTile(gameState, playerSeat, tile) {
    return gameState.phase === "playing" && gameState.currentPlayerIndex === playerSeat;
  }
  canCallTile(gameState, playerSeat, discardedTile, playerState) {
    if (gameState.phase !== "playing" || gameState.currentPlayerIndex === playerSeat) {
      return { canCall: false, possibleCalls: [] };
    }
    const possibleCalls = [];
    const rack = playerState.rack;
    const matchingTiles = rack.filter(
      (tile) => this.tilesMatch(tile, discardedTile) || tile.isJoker
    );
    if (matchingTiles.length >= 2) {
      possibleCalls.push("pung");
    }
    if (matchingTiles.length >= 3) {
      possibleCalls.push("kong");
    }
    if (matchingTiles.length >= 4) {
      possibleCalls.push("quint");
    }
    return {
      canCall: possibleCalls.length > 0,
      possibleCalls
    };
  }
  tilesMatch(tile1, tile2) {
    if (tile1.isJoker || tile2.isJoker) return true;
    return tile1.suit === tile2.suit && tile1.value === tile2.value;
  }
  // Meld creation
  createMeld(tiles, meldType, calledFrom) {
    return {
      type: meldType,
      tiles,
      isConcealed: calledFrom === void 0,
      calledFrom
    };
  }
  // Check for winning hand
  canDeclareWin(playerState, patterns) {
    return false;
  }
  // Tile manipulation utilities
  removeTileFromRack(rack, tileId) {
    return rack.filter((tile) => tile.id !== tileId);
  }
  addTileToRack(rack, tile) {
    return [...rack, tile];
  }
  sortRack(rack) {
    return rack.sort((a, b) => {
      const suitOrder = { dots: 0, bams: 1, craks: 2, winds: 3, dragons: 4, flowers: 5, joker: 6 };
      const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
      if (suitDiff !== 0) return suitDiff;
      if (typeof a.value === "number" && typeof b.value === "number") {
        return a.value - b.value;
      }
      return String(a.value).localeCompare(String(b.value));
    });
  }
  // Game state utilities
  getNextPlayer(currentPlayer) {
    return (currentPlayer + 1) % 4;
  }
  isGameComplete(gameState) {
    return gameState.phase === "finished";
  }
};
var gameEngine = GameEngine.getInstance();

// server/services/botService.ts
var BotService = class _BotService {
  static instance;
  static getInstance() {
    if (!_BotService.instance) {
      _BotService.instance = new _BotService();
    }
    return _BotService.instance;
  }
  // Main bot decision making
  decideBotAction(botState, gameState, difficulty, availableActions) {
    switch (difficulty) {
      case "easy":
        return this.makeEasyBotDecision(botState, gameState, availableActions);
      case "standard":
        return this.makeStandardBotDecision(botState, gameState, availableActions);
      case "strong":
        return this.makeStrongBotDecision(botState, gameState, availableActions);
      default:
        return this.makeEasyBotDecision(botState, gameState, availableActions);
    }
  }
  // Easy bot: makes simple, sometimes suboptimal decisions
  makeEasyBotDecision(botState, gameState, availableActions) {
    if (availableActions.includes("discard")) {
      const nonJokerTiles = botState.rack.filter((tile) => !tile.isJoker && !tile.isFlower);
      if (nonJokerTiles.length > 0) {
        return {
          type: "discard",
          data: { tileId: nonJokerTiles[0].id }
        };
      }
      return {
        type: "discard",
        data: { tileId: botState.rack[0].id }
      };
    }
    if (availableActions.includes("call") && Math.random() < 0.3) {
      return {
        type: "call",
        data: { meldType: "pung" }
        // Default to pung
      };
    }
    return { type: "pass" };
  }
  // Standard bot: makes reasonable decisions most of the time
  makeStandardBotDecision(botState, gameState, availableActions) {
    if (availableActions.includes("discard")) {
      const discardChoice = this.analyzeDiscardChoice(botState, "standard");
      return {
        type: "discard",
        data: { tileId: discardChoice.id }
      };
    }
    if (availableActions.includes("call")) {
      const shouldCall = this.evaluateCallDecision(botState, gameState, "standard");
      if (shouldCall.decision) {
        return {
          type: "call",
          data: { meldType: shouldCall.meldType }
        };
      }
    }
    return { type: "pass" };
  }
  // Strong bot: makes optimal decisions based on advanced strategy
  makeStrongBotDecision(botState, gameState, availableActions) {
    if (availableActions.includes("discard")) {
      const discardChoice = this.analyzeDiscardChoice(botState, "strong");
      return {
        type: "discard",
        data: { tileId: discardChoice.id }
      };
    }
    if (availableActions.includes("call")) {
      const shouldCall = this.evaluateCallDecision(botState, gameState, "strong");
      if (shouldCall.decision) {
        return {
          type: "call",
          data: { meldType: shouldCall.meldType }
        };
      }
    }
    return { type: "pass" };
  }
  // Analyze which tile to discard
  analyzeDiscardChoice(botState, difficulty) {
    const rack = botState.rack;
    if (difficulty === "easy") {
      const nonJokers = rack.filter((tile) => !tile.isJoker && !tile.isFlower);
      return nonJokers.length > 0 ? nonJokers[0] : rack[0];
    }
    const tileScores = rack.map((tile) => ({
      tile,
      score: this.evaluateTileUsefulness(tile, rack, difficulty)
    }));
    tileScores.sort((a, b) => a.score - b.score);
    return tileScores[0].tile;
  }
  // Evaluate how useful a tile is for the current hand
  evaluateTileUsefulness(tile, rack, difficulty) {
    let score = 0;
    if (tile.isJoker) return 1e3;
    if (tile.isFlower) return 900;
    const matchingTiles = rack.filter(
      (t) => t.suit === tile.suit && t.value === tile.value && t.id !== tile.id
    );
    score += matchingTiles.length * 50;
    if (tile.suit === "dots" || tile.suit === "bams" || tile.suit === "craks") {
      const value = Number(tile.value);
      if (!isNaN(value)) {
        const hasAdjacent = rack.some(
          (t) => t.suit === tile.suit && (Number(t.value) === value - 1 || Number(t.value) === value + 1)
        );
        if (hasAdjacent) score += 20;
      }
    }
    if (difficulty === "strong") {
      if (tile.suit === "dragons" || tile.suit === "winds") {
        score += 10;
      }
    }
    return score;
  }
  // Evaluate whether to call a discarded tile
  evaluateCallDecision(botState, gameState, difficulty) {
    if (difficulty === "easy") {
      return { decision: Math.random() < 0.3, meldType: "pung" };
    }
    const lastDiscarded = gameState.lastDiscardedTile;
    if (!lastDiscarded) {
      return { decision: false };
    }
    const matchingTiles = botState.rack.filter(
      (tile) => this.tilesMatch(tile, lastDiscarded)
    );
    if (matchingTiles.length >= 3) {
      return { decision: true, meldType: "kong" };
    } else if (matchingTiles.length >= 2) {
      const callProbability = difficulty === "strong" ? 0.7 : 0.5;
      return {
        decision: Math.random() < callProbability,
        meldType: "pung"
      };
    }
    return { decision: false };
  }
  tilesMatch(tile1, tile2) {
    if (tile1.isJoker || tile2.isJoker) return true;
    return tile1.suit === tile2.suit && tile1.value === tile2.value;
  }
  // Charleston decision making
  decideBotCharlestonPass(botState, charlestonPhase, difficulty) {
    const rack = botState.rack;
    if (difficulty === "easy") {
      const nonJokers = rack.filter((tile) => !tile.isJoker && !tile.isFlower);
      return nonJokers.slice(0, 3);
    }
    const tileScores = rack.filter((tile) => !tile.isJoker && !tile.isFlower).map((tile) => ({
      tile,
      score: this.evaluateTileUsefulness(tile, rack, difficulty)
    }));
    tileScores.sort((a, b) => a.score - b.score);
    return tileScores.slice(0, 3).map((item) => item.tile);
  }
  // Generate bot response timing (for realism)
  getBotResponseDelay(difficulty) {
    switch (difficulty) {
      case "easy":
        return 1e3 + Math.random() * 2e3;
      // 1-3 seconds
      case "standard":
        return 2e3 + Math.random() * 3e3;
      // 2-5 seconds
      case "strong":
        return 3e3 + Math.random() * 4e3;
      // 3-7 seconds
      default:
        return 2e3;
    }
  }
};
var botService = BotService.getInstance();

// server/services/featureFlags.ts
var FeatureFlagService = class _FeatureFlagService {
  static instance;
  flagCache = /* @__PURE__ */ new Map();
  lastCacheUpdate = 0;
  cacheTimeout = 5 * 60 * 1e3;
  // 5 minutes
  static getInstance() {
    if (!_FeatureFlagService.instance) {
      _FeatureFlagService.instance = new _FeatureFlagService();
    }
    return _FeatureFlagService.instance;
  }
  // Initialize default feature flags
  async initializeDefaultFlags() {
    const defaultFlags = [
      {
        name: "billing_enabled",
        enabled: false,
        description: "Enable subscription billing and premium features",
        rolloutPercentage: 0,
        userWhitelist: []
      },
      {
        name: "ai_hints_enabled",
        enabled: true,
        description: "Enable AI-powered game hints and suggestions",
        rolloutPercentage: 100,
        userWhitelist: []
      },
      {
        name: "chat_enabled",
        enabled: true,
        description: "Enable table chat functionality",
        rolloutPercentage: 100,
        userWhitelist: []
      },
      {
        name: "bot_opponents_enabled",
        enabled: true,
        description: "Enable AI bot opponents in games",
        rolloutPercentage: 100,
        userWhitelist: []
      },
      {
        name: "daily_puzzles_enabled",
        enabled: true,
        description: "Enable daily puzzle challenges",
        rolloutPercentage: 100,
        userWhitelist: []
      },
      {
        name: "private_tables_enabled",
        enabled: true,
        description: "Enable private table creation with invite codes",
        rolloutPercentage: 100,
        userWhitelist: []
      },
      {
        name: "analytics_enabled",
        enabled: true,
        description: "Enable analytics event collection",
        rolloutPercentage: 100,
        userWhitelist: []
      },
      {
        name: "custom_tile_skins_enabled",
        enabled: false,
        description: "Enable custom tile skin selection (premium feature)",
        rolloutPercentage: 0,
        userWhitelist: []
      },
      {
        name: "tournament_mode_enabled",
        enabled: false,
        description: "Enable tournament and competitive play modes",
        rolloutPercentage: 0,
        userWhitelist: []
      },
      {
        name: "spectator_mode_enabled",
        enabled: true,
        description: "Allow users to spectate ongoing games",
        rolloutPercentage: 50,
        userWhitelist: []
      }
    ];
    for (const flagData of defaultFlags) {
      const existing = await storage.getFeatureFlag(flagData.name);
      if (!existing) {
        await storage.createFeatureFlag(flagData);
      }
    }
    await this.refreshCache();
  }
  // Check if a feature is enabled for a user
  async isFeatureEnabled(flagName, userId) {
    await this.ensureFreshCache();
    const flag = this.flagCache.get(flagName);
    if (!flag) {
      return false;
    }
    if (!flag.enabled) {
      return false;
    }
    if (userId && flag.userWhitelist) {
      const whitelist = flag.userWhitelist;
      if (whitelist.includes(userId)) {
        return true;
      }
    }
    if (flag.rolloutPercentage >= 100) {
      return true;
    }
    if (flag.rolloutPercentage <= 0) {
      return false;
    }
    if (userId) {
      const userHash = this.hashString(userId + flagName);
      const userPercentile = userHash % 100;
      return userPercentile < flag.rolloutPercentage;
    }
    return Math.random() * 100 < flag.rolloutPercentage;
  }
  // Get all feature flags (for admin interface)
  async getAllFlags() {
    return await storage.getFeatureFlags();
  }
  // Update a feature flag
  async updateFlag(flagId, updates) {
    const updated = await storage.updateFeatureFlag(flagId, updates);
    await this.refreshCache();
    return updated;
  }
  // Get feature flags for client (filtered)
  async getClientFlags(userId) {
    const clientFlags = {};
    const clientExposedFlags = [
      "billing_enabled",
      "ai_hints_enabled",
      "chat_enabled",
      "daily_puzzles_enabled",
      "custom_tile_skins_enabled",
      "spectator_mode_enabled"
    ];
    for (const flagName of clientExposedFlags) {
      clientFlags[flagName] = await this.isFeatureEnabled(flagName, userId);
    }
    return clientFlags;
  }
  // Check multiple features at once
  async checkMultipleFeatures(flagNames, userId) {
    const results = {};
    for (const flagName of flagNames) {
      results[flagName] = await this.isFeatureEnabled(flagName, userId);
    }
    return results;
  }
  // Enable feature for specific users (whitelist)
  async addUserToWhitelist(flagName, userId) {
    const flag = await storage.getFeatureFlag(flagName);
    if (!flag) {
      throw new Error(`Feature flag ${flagName} not found`);
    }
    const whitelist = flag.userWhitelist || [];
    if (!whitelist.includes(userId)) {
      whitelist.push(userId);
      await storage.updateFeatureFlag(flag.id, { userWhitelist: whitelist });
      await this.refreshCache();
    }
  }
  // Remove user from whitelist
  async removeUserFromWhitelist(flagName, userId) {
    const flag = await storage.getFeatureFlag(flagName);
    if (!flag) {
      throw new Error(`Feature flag ${flagName} not found`);
    }
    const whitelist = flag.userWhitelist || [];
    const filtered = whitelist.filter((id) => id !== userId);
    await storage.updateFeatureFlag(flag.id, { userWhitelist: filtered });
    await this.refreshCache();
  }
  // Gradually roll out a feature
  async setRolloutPercentage(flagName, percentage) {
    const flag = await storage.getFeatureFlag(flagName);
    if (!flag) {
      throw new Error(`Feature flag ${flagName} not found`);
    }
    await storage.updateFeatureFlag(flag.id, { rolloutPercentage: percentage });
    await this.refreshCache();
  }
  // Cache management
  async ensureFreshCache() {
    const now = Date.now();
    if (now - this.lastCacheUpdate > this.cacheTimeout) {
      await this.refreshCache();
    }
  }
  async refreshCache() {
    const flags = await storage.getFeatureFlags();
    this.flagCache.clear();
    for (const flag of flags) {
      this.flagCache.set(flag.name, flag);
    }
    this.lastCacheUpdate = Date.now();
  }
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  // Middleware for protecting routes based on feature flags
  createFeatureMiddleware(flagName, redirectUrl) {
    return async (req, res, next) => {
      const userId = req.user?.claims?.sub;
      const isEnabled = await this.isFeatureEnabled(flagName, userId);
      if (!isEnabled) {
        if (redirectUrl) {
          return res.redirect(redirectUrl);
        }
        return res.status(403).json({
          message: `Feature ${flagName} is not available`,
          featureFlag: flagName
        });
      }
      next();
    };
  }
};
var featureFlagService = FeatureFlagService.getInstance();

// server/services/analytics.ts
var AnalyticsService = class _AnalyticsService {
  static instance;
  eventQueue = [];
  processingQueue = false;
  static getInstance() {
    if (!_AnalyticsService.instance) {
      _AnalyticsService.instance = new _AnalyticsService();
    }
    return _AnalyticsService.instance;
  }
  // Track an analytics event
  async trackEvent(eventType, eventData, userId, sessionId, tableId, gameId) {
    const analyticsEnabled = await featureFlagService.isFeatureEnabled("analytics_enabled");
    if (!analyticsEnabled) {
      return;
    }
    if (userId) {
      const user = await storage.getUser(userId);
      if (user && !user.analyticsEnabled) {
        return;
      }
    }
    const event = {
      userId,
      sessionId,
      eventType,
      eventData,
      tableId,
      gameId
    };
    this.eventQueue.push(event);
    if (!this.processingQueue) {
      this.processEventQueue();
    }
  }
  // Process events in batches
  async processEventQueue() {
    if (this.processingQueue || this.eventQueue.length === 0) {
      return;
    }
    this.processingQueue = true;
    try {
      while (this.eventQueue.length > 0) {
        const batch = this.eventQueue.splice(0, 50);
        for (const event of batch) {
          try {
            await storage.logAnalyticsEvent(event);
          } catch (error) {
            console.error("Failed to log analytics event:", error);
          }
        }
        if (this.eventQueue.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    } finally {
      this.processingQueue = false;
    }
  }
  // Helper methods for common events
  async trackTableJoined(userId, tableId, sessionId, isPrivate, playerCount) {
    await this.trackEvent(
      "table_joined",
      { tableId, isPrivate, playerCount },
      userId,
      sessionId,
      tableId
    );
  }
  async trackTableLeft(userId, tableId, sessionId, sessionDuration) {
    await this.trackEvent(
      "table_left",
      { tableId, sessionDuration },
      userId,
      sessionId,
      tableId
    );
  }
  async trackHandWon(winnerId, gameId, tableId, sessionId, pattern, points) {
    await this.trackEvent(
      "hand_won",
      { gameId, winnerId, pattern, points },
      winnerId,
      sessionId,
      tableId,
      gameId
    );
  }
  async trackExposureMade(playerId, gameId, tableId, sessionId, meldType, tilesUsed) {
    await this.trackEvent(
      "exposure_made",
      { gameId, playerId, meldType, tilesUsed },
      playerId,
      sessionId,
      tableId,
      gameId
    );
  }
  async trackTutorialProgress(userId, sessionId, tutorialStep, timeSpent) {
    const eventType = timeSpent ? "tutorial_completed" : "tutorial_started";
    const eventData = timeSpent ? { tutorialStep, timeSpent } : { tutorialStep };
    await this.trackEvent(
      eventType,
      eventData,
      userId,
      sessionId
    );
  }
  async trackPuzzleCompletion(userId, sessionId, puzzleDate, timeSeconds, moves, hintsUsed, score) {
    await this.trackEvent(
      "puzzle_completed",
      { puzzleDate, timeSeconds, moves, hintsUsed, score },
      userId,
      sessionId
    );
  }
  async trackGameError(errorType, errorMessage, userId, sessionId, gameId, tableId) {
    await this.trackEvent(
      "game_error",
      { errorType, errorMessage, gameId },
      userId,
      sessionId,
      tableId,
      gameId
    );
  }
  // Analytics reporting methods
  async getUserEvents(userId, limit = 100) {
    return await storage.getAnalyticsEvents({ userId, limit });
  }
  async getTableEvents(tableId, limit = 100) {
    return await storage.getAnalyticsEvents({ tableId, limit });
  }
  async getGameEvents(gameId, limit = 100) {
    return await storage.getAnalyticsEvents({ gameId, limit });
  }
  // Generate basic reports
  async generateDailyReport(date) {
    const events = await storage.getAnalyticsEvents({
      dateFilter: date,
      limit: 1e4
    });
    const report = {
      date,
      totalEvents: events.length,
      uniqueUsers: new Set(events.map((e) => e.userId).filter(Boolean)).size,
      eventBreakdown: {},
      tablesCreated: 0,
      gamesCompleted: 0,
      tutorialsCompleted: 0,
      puzzlesCompleted: 0
    };
    for (const event of events) {
      report.eventBreakdown[event.eventType] = (report.eventBreakdown[event.eventType] || 0) + 1;
      switch (event.eventType) {
        case "table_created":
          report.tablesCreated++;
          break;
        case "hand_won":
          report.gamesCompleted++;
          break;
        case "tutorial_completed":
          report.tutorialsCompleted++;
          break;
        case "puzzle_completed":
          report.puzzlesCompleted++;
          break;
      }
    }
    return report;
  }
  // User engagement metrics
  async getUserEngagementMetrics(userId) {
    const events = await this.getUserEvents(userId, 1e3);
    const metrics = {
      totalSessions: new Set(events.map((e) => e.sessionId).filter(Boolean)).size,
      totalTablesJoined: events.filter((e) => e.eventType === "table_joined").length,
      totalGamesWon: events.filter((e) => e.eventType === "hand_won").length,
      tutorialProgress: events.filter((e) => e.eventType === "tutorial_completed").length,
      puzzlesCompleted: events.filter((e) => e.eventType === "puzzle_completed").length,
      lastActivity: events.length > 0 ? events[0].timestamp : null,
      favoriteGameMode: this.calculateFavoriteGameMode(events)
    };
    return metrics;
  }
  calculateFavoriteGameMode(events) {
    const gameModes = {};
    for (const event of events) {
      if (event.eventType === "table_joined" && event.eventData) {
        const data = event.eventData;
        const mode = data.isPrivate ? "private" : "public";
        gameModes[mode] = (gameModes[mode] || 0) + 1;
      }
    }
    return Object.keys(gameModes).reduce(
      (a, b) => gameModes[a] > gameModes[b] ? a : b,
      "public"
    );
  }
  // Clean up old events (for privacy/storage management)
  async cleanupOldEvents(daysToKeep = 90) {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    return 0;
  }
};
var analyticsService = AnalyticsService.getInstance();

// server/websocket.ts
var WebSocketManager = class {
  wss;
  clients = /* @__PURE__ */ new Map();
  tableClients = /* @__PURE__ */ new Map();
  constructor(server) {
    this.wss = new WebSocketServer({
      server,
      path: "/ws",
      clientTracking: false
    });
    this.setupWebSocket();
    this.startHeartbeat();
  }
  setupWebSocket() {
    console.log("=== WEBSOCKET SERVER STARTING ===");
    console.log("WebSocket server listening on port...");
    this.wss.on("connection", (ws2, req) => {
      console.log("=== NEW WEBSOCKET CONNECTION ===");
      console.log("Connection from:", req.socket.remoteAddress);
      const sessionId = this.generateSessionId();
      const clientId = sessionId;
      console.log("Assigned client ID:", clientId);
      const client = {
        ws: ws2,
        sessionId,
        isAlive: true,
        lastPing: Date.now()
      };
      this.clients.set(clientId, client);
      ws2.on("message", async (message) => {
        console.log("=== WEBSOCKET MESSAGE RECEIVED ===");
        console.log("Raw message:", message.toString());
        try {
          const data = JSON.parse(message.toString());
          console.log("Parsed message:", data);
          console.log("Message type:", data.type);
          await this.handleMessage(clientId, data);
        } catch (error) {
          console.error("WebSocket message error:", error);
          this.sendToClient(clientId, {
            type: "error",
            data: { message: "Invalid message format" }
          });
        }
      });
      ws2.on("close", () => {
        this.handleClientDisconnect(clientId);
      });
      ws2.on("pong", () => {
        const client2 = this.clients.get(clientId);
        if (client2) {
          client2.isAlive = true;
          client2.lastPing = Date.now();
        }
      });
      this.sendToClient(clientId, {
        type: "connected",
        data: { sessionId }
      });
    });
  }
  async handleMessage(clientId, message) {
    console.log("=== HANDLE MESSAGE ===");
    console.log("Client ID:", clientId);
    console.log("Message:", message);
    const client = this.clients.get(clientId);
    if (!client) {
      console.log("No client found for ID:", clientId);
      return;
    }
    console.log("Processing message type:", message.type);
    switch (message.type) {
      case "authenticate":
        try {
          await this.handleAuthentication(clientId, message.data);
        } catch (error) {
          console.error("Authentication handler error:", error);
        }
        break;
      case "join_table":
        console.log("SWITCH CASE: join_table received");
        await this.handleJoinTable(clientId, message.data);
        break;
      case "leave_table":
        await this.handleLeaveTable(clientId, message.data);
        break;
      case "game_action":
        await this.handleGameAction(clientId, message);
        break;
      case "chat_message":
        await this.handleChatMessage(clientId, message.data);
        break;
      case "ready_check":
        await this.handleReadyCheck(clientId, message.data);
        break;
      case "charleston_pass":
        await this.handleCharlestonPass(clientId, message.data);
        break;
      case "charleston_decision":
        await this.handleCharlestonDecision(clientId, message.data);
        break;
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }
  async handleAuthentication(clientId, data) {
    console.log("=== HANDLE AUTHENTICATION ===");
    console.log("Client ID:", clientId);
    console.log("Data:", data);
    const client = this.clients.get(clientId);
    if (!client) {
      console.log("No client found during auth");
      return;
    }
    client.userId = data.userId;
    console.log("Set client.userId to:", client.userId);
    this.sendToClient(clientId, {
      type: "authenticated",
      data: { userId: data.userId }
    });
    console.log("Sent authenticated response");
  }
  async handleJoinTable(clientId, data) {
    console.log("=== HANDLE JOIN TABLE ===");
    console.log("Client ID:", clientId);
    console.log("Data:", data);
    const client = this.clients.get(clientId);
    if (!client) {
      console.log("No client found for join_table:", clientId);
      return;
    }
    if (!client.userId) {
      console.log("No userId set for client:", clientId, "client exists:", !!client);
      return;
    }
    console.log("Auth check passed - client.userId:", client.userId);
    const { tableId } = data;
    console.log("User", client.userId, "joining table", tableId);
    try {
      console.log("Getting table from storage...");
      console.log("Storage object:", !!storage);
      console.log("Storage.getGameTable:", !!storage?.getGameTable);
      const table = await storage.getGameTable(tableId);
      if (!table) {
        console.log("Table not found:", tableId);
        this.sendToClient(clientId, {
          type: "error",
          data: { message: "Table not found" }
        });
        return;
      }
      console.log("Table found:", table.id, "gameMode:", table.gameMode);
      client.tableId = tableId;
      if (!this.tableClients.has(tableId)) {
        this.tableClients.set(tableId, /* @__PURE__ */ new Set());
      }
      this.tableClients.get(tableId).add(clientId);
      console.log("Getting current game state...");
      console.log("table.currentGameId:", table.currentGameId);
      const currentGame = table.currentGameId ? await storage.getGame(table.currentGameId) : null;
      console.log("Current game:", currentGame?.id || "none");
      const participants = currentGame ? await storage.getGameParticipants(currentGame.id) : [];
      console.log("Current participants:", participants.length);
      this.sendToClient(clientId, {
        type: "table_joined",
        data: {
          table,
          currentGame,
          participants
        }
      });
      this.broadcastToTable(tableId, {
        type: "player_joined",
        data: { userId: client.userId }
      }, clientId);
      console.log("Tracking analytics...");
      try {
        await analyticsService.trackTableJoined(
          client.userId,
          tableId,
          client.sessionId,
          table.isPrivate || false,
          participants.length + 1
        );
        console.log("Analytics tracked successfully");
      } catch (analyticsError) {
        console.error("Analytics error (non-fatal):", analyticsError);
      }
      console.log("Checking bot addition conditions:");
      console.log("- table.gameMode:", table.gameMode);
      console.log("- table.botDifficulty:", table.botDifficulty);
      if (table.gameMode === "single-player" && table.botDifficulty) {
        console.log("Calling autoAddBotsToTable...");
        await this.autoAddBotsToTable(table, currentGame, client.userId);
      } else {
        console.log("Not adding bots, adding player only");
        await this.ensurePlayerParticipant(client.userId, table, currentGame);
      }
    } catch (error) {
      console.error("Error joining table:", error);
      this.sendToClient(clientId, {
        type: "error",
        data: { message: "Failed to join table" }
      });
    }
  }
  async handleLeaveTable(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client || !client.tableId) return;
    const tableId = client.tableId;
    this.tableClients.get(tableId)?.delete(clientId);
    client.tableId = void 0;
    this.broadcastToTable(tableId, {
      type: "player_left",
      data: { userId: client.userId }
    }, clientId);
    if (client.userId) {
      await analyticsService.trackTableLeft(
        client.userId,
        tableId,
        client.sessionId,
        0
        // Would calculate actual session duration
      );
    }
  }
  async handleGameAction(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || !client.userId || !client.tableId) return;
    const { action, data } = message.data;
    try {
      const table = await storage.getGameTable(client.tableId);
      if (!table || !table.currentGameId) return;
      const game = await storage.getGame(table.currentGameId);
      if (!game) return;
      const participants = await storage.getGameParticipants(game.id);
      const currentPlayer = participants.find((p) => p.userId === client.userId);
      if (!currentPlayer) return;
      let actionResult;
      switch (action) {
        case "draw_tile":
          actionResult = await this.processDrawTile(game, currentPlayer, data);
          break;
        case "discard_tile":
          actionResult = await this.processDiscardTile(game, currentPlayer, data);
          break;
        case "call_tile":
          actionResult = await this.processCallTile(game, currentPlayer, data);
          break;
        case "expose_meld":
          actionResult = await this.processExposeMeld(game, currentPlayer, data);
          break;
        default:
          console.warn(`Unknown game action: ${action}`);
          return;
      }
      if (actionResult) {
        await storage.logGameAction({
          gameId: game.id,
          playerId: client.userId,
          actionType: action,
          actionData: data,
          gameStateBefore: JSON.stringify(game.gameState),
          gameStateAfter: JSON.stringify(actionResult.newGameState)
        });
        await storage.updateGame(game.id, {
          gameState: actionResult.newGameState,
          currentPlayerIndex: actionResult.nextPlayerIndex
        });
        this.broadcastToTable(client.tableId, {
          type: "game_action",
          data: {
            action,
            playerId: client.userId,
            result: actionResult,
            gameState: actionResult.newGameState
          }
        });
        const nextParticipant = participants[actionResult.nextPlayerIndex];
        if (nextParticipant?.isBot) {
          setTimeout(() => {
            this.processBotTurn(game.id, nextParticipant);
          }, botService.getBotResponseDelay("standard"));
        }
      }
    } catch (error) {
      console.error("Error processing game action:", error);
      this.sendToClient(clientId, {
        type: "error",
        data: { message: "Failed to process game action" }
      });
    }
  }
  async handleChatMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client || !client.userId || !client.tableId) return;
    const chatEnabled = await featureFlagService.isFeatureEnabled("chat_enabled", client.userId);
    if (!chatEnabled) {
      this.sendToClient(clientId, {
        type: "error",
        data: { message: "Chat is currently disabled" }
      });
      return;
    }
    try {
      const message = await storage.createChatMessage({
        tableId: client.tableId,
        userId: client.userId,
        message: data.message
      });
      this.broadcastToTable(client.tableId, {
        type: "chat_message",
        data: message
      });
    } catch (error) {
      console.error("Error handling chat message:", error);
    }
  }
  async handleReadyCheck(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client || !client.userId || !client.tableId) return;
    try {
      this.broadcastToTable(client.tableId, {
        type: "player_ready",
        data: { userId: client.userId, ready: data.ready }
      });
    } catch (error) {
      console.error("Error handling ready check:", error);
    }
  }
  async processBotCharlestonPasses(participants, gameState, passDirection, phase = 1) {
    console.log("=== PROCESSING BOT CHARLESTON PASSES ===");
    const directionMap = { "right": 1, "across": 2, "left": 3 };
    const receivedTilesInfo = {};
    for (const participant of participants) {
      if (!participant.isBot) continue;
      console.log(`Processing Charleston pass for bot ${participant.seatPosition}`);
      const botHand = gameState.players[participant.seatPosition].hand;
      if (botHand.length < 3) {
        console.log(`Bot ${participant.seatPosition} doesn't have enough tiles`);
        continue;
      }
      const botState = {
        rack: botHand,
        melds: gameState.players[participant.seatPosition].melded || [],
        discarded: gameState.players[participant.seatPosition].discarded || [],
        flowers: gameState.players[participant.seatPosition].flowers || []
      };
      const difficulty = "standard";
      let tilesToPass = botService.decideBotCharlestonPass(botState, 0, difficulty);
      if (phase === 7) {
        const courtesyCount = Math.floor(Math.random() * 4);
        tilesToPass = tilesToPass.slice(0, courtesyCount);
        console.log(`Bot ${participant.seatPosition} courtesy passing ${courtesyCount} tiles`);
      } else {
        if (tilesToPass.length !== 3) {
          console.log(`Bot ${participant.seatPosition} didn't select 3 tiles, selecting first 3`);
          const safeTiles = botHand.filter((t) => !t.isJoker && !t.isFlower).slice(0, 3);
          tilesToPass.splice(0, tilesToPass.length, ...safeTiles);
        }
      }
      console.log(`Bot ${participant.seatPosition} passing tiles:`, tilesToPass.map((t) => `${t.suit}-${t.value}`));
      const receiverIndex = (participant.seatPosition + (directionMap[passDirection] || 1)) % 4;
      const receivingHand = gameState.players[receiverIndex].hand;
      if (!receivedTilesInfo[receiverIndex]) {
        receivedTilesInfo[receiverIndex] = [];
      }
      receivedTilesInfo[receiverIndex].push(...tilesToPass);
      tilesToPass.forEach((tile) => {
        const index2 = botHand.findIndex((h) => h.id === tile.id);
        if (index2 !== -1) {
          botHand.splice(index2, 1);
        }
      });
      receivingHand.push(...tilesToPass);
      console.log(`Bot Charleston: ${participant.seatPosition} \u2192 ${receiverIndex} (${passDirection})`);
    }
    return receivedTilesInfo;
  }
  getCharlestonSender(receiverSeat, direction) {
    switch (direction) {
      case "right":
        return (receiverSeat + 3) % 4;
      case "left":
        return (receiverSeat + 1) % 4;
      case "across":
        return (receiverSeat + 2) % 4;
      default:
        return (receiverSeat + 2) % 4;
    }
  }
  getCharlestonDirectionForPhase(phase) {
    switch (phase) {
      case 1:
        return "right";
      // Round 1: Right
      case 2:
        return "across";
      // Round 1: Across  
      case 3:
        return "left";
      // Round 1: Left
      case 4:
        return "left";
      // Round 2: Left
      case 5:
        return "across";
      // Round 2: Across
      case 6:
        return "right";
      // Round 2: Right
      case 7:
        return "across";
      // Courtesy: Across
      default:
        return "right";
    }
  }
  getCharlestonPhaseName(phase) {
    switch (phase) {
      case 1:
        return "Round 1 Phase 1: Pass to East (Right)";
      case 2:
        return "Round 1 Phase 2: Pass to North (Across)";
      case 3:
        return "Round 1 Phase 3: Pass to West (Left)";
      case 4:
        return "Round 2 Phase 1: Pass to West (Left)";
      case 5:
        return "Round 2 Phase 2: Pass to North (Across)";
      case 6:
        return "Round 2 Phase 3: Pass to East (Right)";
      case 7:
        return "Courtesy Pass: Pass to North (0-3 tiles)";
      default:
        return "Charleston Phase";
    }
  }
  async handleCharlestonPass(clientId, data) {
    console.log("=== HANDLE CHARLESTON PASS ===");
    console.log("Client ID:", clientId);
    console.log("Data:", data);
    const client = this.clients.get(clientId);
    if (!client || !client.userId || !client.tableId) {
      console.log("Charleston pass: No client, userId, or tableId");
      return;
    }
    try {
      console.log("Processing Charleston pass for user", client.userId, "with tiles:", data.tiles);
      const table = await storage.getGameTable(client.tableId);
      if (!table || !table.currentGameId) {
        console.log("No active game for Charleston pass");
        return;
      }
      const game = await storage.getGame(table.currentGameId);
      if (!game) {
        console.log("Game not found");
        return;
      }
      const participants = await storage.getGameParticipants(game.id);
      const currentPlayer = participants.find((p) => p.userId === client.userId);
      if (!currentPlayer) {
        console.log("Player not in game");
        return;
      }
      const gameState = typeof game.gameState === "string" ? JSON.parse(game.gameState) : game.gameState;
      const currentPhase = gameState.charlestonPhase || 1;
      if (currentPhase === 7) {
        if (data.tiles.length > 3) {
          console.log("Courtesy pass: Too many tiles");
          return;
        }
      } else {
        if (data.tiles.length !== 3) {
          console.log("Regular Charleston: Must pass exactly 3 tiles");
          return;
        }
      }
      const getCharlestonDirection = (phase) => {
        switch (phase) {
          case 1:
            return "right";
          // Round 1: Right
          case 2:
            return "across";
          // Round 1: Across  
          case 3:
            return "left";
          // Round 1: Left
          case 4:
            return "left";
          // Round 2: Left
          case 5:
            return "across";
          // Round 2: Across
          case 6:
            return "right";
          // Round 2: Right
          case 7:
            return "across";
          // Courtesy: Across
          default:
            return "right";
        }
      };
      const passDirection = getCharlestonDirection(gameState.charlestonPhase || 1);
      const directionMap = { "right": 1, "across": 2, "left": 3 };
      const receiverIndex = (currentPlayer.seatPosition + (directionMap[passDirection] || 1)) % 4;
      const receivingPlayer = participants.find((p) => p.seatPosition === receiverIndex);
      if (!receivingPlayer) {
        console.log("No receiving player found");
        return;
      }
      console.log(`Charleston: ${currentPlayer.seatPosition} \u2192 ${receivingPlayer.seatPosition} (${passDirection})`);
      const currentHand = gameState.players[currentPlayer.seatPosition].hand;
      const receivingHand = gameState.players[receivingPlayer.seatPosition].hand;
      data.tiles.forEach((tile) => {
        const index2 = currentHand.findIndex((h) => h.id === tile.id);
        if (index2 !== -1) {
          currentHand.splice(index2, 1);
        }
      });
      receivingHand.push(...data.tiles);
      console.log(`Transferred ${data.tiles.length} tiles from player ${currentPlayer.seatPosition} to ${receivingPlayer.seatPosition}`);
      const receivedTilesInfo = await this.processBotCharlestonPasses(participants, gameState, passDirection, currentPhase);
      await storage.updateGame(game.id, {
        gameState: JSON.stringify(gameState)
      });
      console.log("Charleston received tiles info:", receivedTilesInfo);
      console.log("=== SENDING CHARLESTON RECEIVED TILES ===");
      console.log("All participants:", participants.map((p) => ({ seat: p.seatPosition, userId: p.userId, isBot: p.isBot })));
      console.log("Available clients:", Array.from(this.clients.keys()));
      for (const participant of participants) {
        if (participant.isBot) continue;
        let foundClient = null;
        for (const [clientId2, client2] of this.clients.entries()) {
          if (client2.userId === participant.userId) {
            foundClient = client2;
            console.log(`\u2705 Found client for user ${participant.userId}: ${clientId2}`);
            break;
          }
        }
        console.log(`Checking participant ${participant.seatPosition}: userId=${participant.userId}, foundClient=${!!foundClient}, hasReceivedTiles=${!!receivedTilesInfo[participant.seatPosition]}`);
        if (foundClient && receivedTilesInfo[participant.seatPosition]) {
          console.log(`\u2705 SENDING received tiles to player ${participant.seatPosition}:`, receivedTilesInfo[participant.seatPosition]);
          const message = {
            type: "charleston_received_tiles",
            data: {
              receivedTiles: receivedTilesInfo[participant.seatPosition],
              fromSeat: this.getCharlestonSender(participant.seatPosition, passDirection),
              phase: gameState.charlestonPhase,
              direction: passDirection
            }
          };
          console.log(`\u{1F4E4} Sending charleston_received_tiles message:`, message);
          foundClient.ws.send(JSON.stringify(message));
        } else {
          console.log(`\u274C Cannot send to participant ${participant.seatPosition}: foundClient=${!!foundClient}, hasReceivedTiles=${!!receivedTilesInfo[participant.seatPosition]}`);
        }
      }
      this.broadcastToTable(client.tableId, {
        type: "game_state_updated",
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
      const nextPhase = currentPhase + 1;
      console.log(`Charleston phase incremented from ${currentPhase} to ${nextPhase}`);
      if (currentPhase === 3) {
        console.log("\u{1F6D1} Round 1 complete. Waiting for Stop/Continue decision from all players...");
        gameState.charlestonPhase = 3.5;
        gameState.charlestonDecision = {
          status: "pending",
          votes: {},
          // Will collect votes from each player
          requiredVotes: 4
          // All 4 players must vote
        };
        this.broadcastToTable(client.tableId, {
          type: "charleston_decision_required",
          data: {
            message: "Round 1 complete! Do you want to continue to Round 2?",
            phase: "stop_or_continue"
          }
        });
        await storage.updateGame(game.id, {
          gameState: JSON.stringify(gameState)
        });
        const gameTable = await storage.getGameTable(client.tableId);
        const isPrivateTable = gameTable && gameTable.isPrivate;
        if (isPrivateTable) {
          console.log("\u{1F916} Single-player mode: Auto-voting for bots to continue to Round 2");
          for (const player of gameState.players) {
            if (player.seatPosition !== 0) {
              gameState.charlestonDecision.votes[player.seatPosition] = "continue";
              console.log(`\u{1F916} Bot at seat ${player.seatPosition} auto-voted: continue`);
            }
          }
          await storage.updateGame(game.id, {
            gameState: JSON.stringify(gameState)
          });
          const currentVotes = Object.keys(gameState.charlestonDecision.votes).length;
          console.log(`\u{1F5F3}\uFE0F Current votes: ${currentVotes}/4 required votes`);
        }
        return;
      } else if (currentPhase === 6) {
        console.log("\u{1F3AD} Round 2 complete. Moving to Courtesy pass...");
        gameState.charlestonPhase = 7;
        const newDirection = this.getCharlestonDirectionForPhase(7);
        const newPhaseName = this.getCharlestonPhaseName(7);
        console.log(`\u{1F504} Broadcasting Courtesy phase (${newPhaseName} - ${newDirection}) to all players`);
        this.broadcastToTable(client.tableId, {
          type: "charleston_phase_started",
          data: {
            phase: 7,
            phaseName: newPhaseName,
            direction: newDirection,
            requiredTiles: 0,
            // Courtesy allows 0-3 tiles
            gameState
          }
        });
      } else if (currentPhase === 7) {
        console.log("\u{1F3C1} Courtesy pass complete. Charleston ending...");
        gameState.charlestonPhase = 8;
      } else {
        gameState.charlestonPhase = nextPhase;
        const newDirection = this.getCharlestonDirectionForPhase(nextPhase);
        const newPhaseName = this.getCharlestonPhaseName(nextPhase);
        console.log(`\u{1F504} Broadcasting new Charleston phase ${nextPhase} (${newPhaseName} - ${newDirection}) to all players`);
        this.broadcastToTable(client.tableId, {
          type: "charleston_phase_started",
          data: {
            phase: nextPhase,
            phaseName: newPhaseName,
            direction: newDirection,
            requiredTiles: nextPhase === 7 ? 0 : 3,
            // Courtesy allows 0-3 tiles
            gameState
          }
        });
      }
      await storage.updateGame(game.id, {
        gameState: JSON.stringify(gameState)
      });
      if (gameState.charlestonPhase >= 8) {
        console.log("\u{1F3C1} Charleston sequence completed! Transitioning to normal play...");
        gameState.phase = "playing";
        delete gameState.charlestonPhase;
        const eastPlayer = gameState.players.find((p) => p.seatPosition === 0);
        if (eastPlayer && gameState.wall.length > 0) {
          const extraTile = gameState.wall.shift();
          eastPlayer.hand.push(extraTile);
          console.log(`\u{1F3AF} East (seat 0) drew the 14th tile: ${extraTile.suit} ${extraTile.value}`);
          console.log(`\u{1F3AF} East now has ${eastPlayer.hand.length} tiles, ready to discard first`);
        }
        gameState.currentPlayerIndex = 0;
        console.log("\u2705 Game transitioned from Charleston to Playing phase - East ready to discard");
        this.broadcastToTable(client.tableId, {
          type: "charleston_ended",
          data: {
            gameState,
            message: "Charleston completed! Game begins now."
          }
        });
        await storage.updateGame(game.id, {
          gameState: JSON.stringify(gameState)
        });
      }
      console.log("Charleston pass completed successfully");
    } catch (error) {
      console.error("Error handling Charleston pass:", error);
    }
  }
  // Charleston decision handler
  async handleCharlestonDecision(clientId, data) {
    console.log("=== HANDLE CHARLESTON DECISION ===");
    console.log("Client ID:", clientId, "Decision:", data.decision);
    const client = this.clients.get(clientId);
    if (!client || !client.userId || !client.tableId) {
      console.log("Decision: No client, userId, or tableId");
      return;
    }
    try {
      const table = await storage.getGameTable(client.tableId);
      if (!table || !table.currentGameId) {
        console.log("No active game for Charleston decision");
        return;
      }
      const game = await storage.getGame(table.currentGameId);
      if (!game) {
        console.log("Game not found");
        return;
      }
      const participants = await storage.getGameParticipants(game.id);
      const currentPlayer = participants.find((p) => p.userId === client.userId);
      if (!currentPlayer) {
        console.log("Player not in game");
        return;
      }
      const gameState = typeof game.gameState === "string" ? JSON.parse(game.gameState) : game.gameState;
      if (!gameState.charlestonDecision || gameState.charlestonDecision.status !== "pending") {
        console.log("No pending Charleston decision");
        return;
      }
      gameState.charlestonDecision.votes[currentPlayer.seatPosition] = data.decision;
      console.log(`Player ${currentPlayer.seatPosition} voted: ${data.decision}`);
      const gameTable = await storage.getGameTable(client.tableId);
      const isPrivateTable = gameTable && gameTable.isPrivate;
      for (const participant of participants) {
        if (participant.isBot && !gameState.charlestonDecision.votes.hasOwnProperty(participant.seatPosition)) {
          const botDecision = isPrivateTable ? "continue" : Math.random() > 0.3 ? "continue" : "stop";
          gameState.charlestonDecision.votes[participant.seatPosition] = botDecision;
          console.log(`Bot ${participant.seatPosition} voted: ${botDecision} ${isPrivateTable ? "(auto-continue in single-player)" : "(random)"}`);
        }
      }
      const voteCount = Object.keys(gameState.charlestonDecision.votes).length;
      console.log(`Votes collected: ${voteCount}/${gameState.charlestonDecision.requiredVotes}`);
      if (voteCount >= gameState.charlestonDecision.requiredVotes) {
        const votes = Object.values(gameState.charlestonDecision.votes);
        const continueVotes = votes.filter((v) => v === "continue").length;
        const stopVotes = votes.filter((v) => v === "stop").length;
        console.log(`Final vote tally: Continue=${continueVotes}, Stop=${stopVotes}`);
        if (continueVotes > stopVotes) {
          console.log("\u{1F504} Majority Continue! Proceeding to Round 2...");
          gameState.charlestonPhase = 4;
          gameState.charlestonDecision = { status: "continue" };
          const newDirection = this.getCharlestonDirectionForPhase(4);
          const newPhaseName = this.getCharlestonPhaseName(4);
          this.broadcastToTable(client.tableId, {
            type: "charleston_phase_started",
            data: {
              phase: 4,
              phaseName: newPhaseName,
              direction: newDirection,
              requiredTiles: 3,
              gameState
            }
          });
        } else {
          console.log("\u{1F6D1} Majority voted Stop. Skipping to Courtesy pass...");
          gameState.charlestonPhase = 7;
          gameState.charlestonDecision = { status: "stop" };
          const newDirection = this.getCharlestonDirectionForPhase(7);
          const newPhaseName = this.getCharlestonPhaseName(7);
          this.broadcastToTable(client.tableId, {
            type: "charleston_phase_started",
            data: {
              phase: 7,
              phaseName: newPhaseName,
              direction: newDirection,
              requiredTiles: 0,
              // Courtesy allows 0-3 tiles
              gameState
            }
          });
        }
        await storage.updateGame(game.id, {
          gameState: JSON.stringify(gameState)
        });
      } else {
        console.log(`Waiting for ${gameState.charlestonDecision.requiredVotes - voteCount} more votes...`);
        await storage.updateGame(game.id, {
          gameState: JSON.stringify(gameState)
        });
        this.broadcastToTable(client.tableId, {
          type: "charleston_votes_updated",
          data: {
            votesReceived: voteCount,
            votesRequired: gameState.charlestonDecision.requiredVotes
          }
        });
      }
    } catch (error) {
      console.error("Error handling Charleston decision:", error);
    }
  }
  // Game action processors
  async processDrawTile(game, player, data) {
    return {
      newGameState: game.gameState,
      nextPlayerIndex: game.currentPlayerIndex
    };
  }
  async processDiscardTile(game, player, data) {
    return {
      newGameState: game.gameState,
      nextPlayerIndex: (game.currentPlayerIndex + 1) % 4
    };
  }
  async processCallTile(game, player, data) {
    return {
      newGameState: game.gameState,
      nextPlayerIndex: player.seatPosition
    };
  }
  async processExposeMeld(game, player, data) {
    return {
      newGameState: game.gameState,
      nextPlayerIndex: (game.currentPlayerIndex + 1) % 4
    };
  }
  // Bot turn processing
  async processBotTurn(gameId, botParticipant) {
    try {
      const game = await storage.getGame(gameId);
      if (!game) return;
      const gameState = typeof game.gameState === "string" ? JSON.parse(game.gameState) : game.gameState;
      const botAction = botService.decideBotAction(
        botParticipant,
        gameState,
        "standard",
        // Would get from table settings
        ["draw", "discard"]
        // Would determine available actions
      );
    } catch (error) {
      console.error("Error processing bot turn:", error);
    }
  }
  // Utility methods
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }
  broadcastToTable(tableId, message, excludeClientId) {
    const tableClientIds = this.tableClients.get(tableId);
    if (!tableClientIds) return;
    for (const clientId of Array.from(tableClientIds)) {
      if (clientId !== excludeClientId) {
        this.sendToClient(clientId, message);
      }
    }
  }
  handleClientDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (client && client.tableId) {
      this.tableClients.get(client.tableId)?.delete(clientId);
      this.broadcastToTable(client.tableId, {
        type: "player_disconnected",
        data: { userId: client.userId }
      });
    }
    this.clients.delete(clientId);
  }
  // Heartbeat to detect dead connections
  startHeartbeat() {
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
    }, 3e4);
  }
  async ensurePlayerParticipant(userId, table, currentGame) {
    try {
      if (!currentGame) return;
      const participants = await storage.getGameParticipants(currentGame.id);
      const existingParticipant = participants.find((p) => p.userId === userId);
      if (!existingParticipant) {
        const seatPosition = this.findEmptySeat(participants, table.maxPlayers || 4);
        if (seatPosition !== -1) {
          await storage.addGameParticipant({
            gameId: currentGame.id,
            userId,
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
      console.error("Error ensuring player participant:", error);
    }
  }
  async autoAddBotsToTable(table, currentGame, humanUserId) {
    console.log("=== AUTO ADD BOTS TO TABLE ===");
    console.log("Table:", table.id, "Game:", currentGame?.id, "User:", humanUserId);
    try {
      if (!currentGame) {
        console.log("Creating new game...");
        const gameData = {
          tableId: table.id,
          seed: `${Date.now()}_${Math.random()}`,
          gameState: {
            phase: "charleston",
            currentPlayerIndex: 0,
            wallCount: 144,
            players: [
              { hand: [], discarded: [], melded: [], flowers: [] },
              { hand: [], discarded: [], melded: [], flowers: [] },
              { hand: [], discarded: [], melded: [], flowers: [] },
              { hand: [], discarded: [], melded: [], flowers: [] }
            ],
            charleston: {
              currentPass: "right",
              passesCompleted: 0,
              phase: "passing"
            }
          }
        };
        console.log("Calling storage.createGame...");
        currentGame = await storage.createGame(gameData);
        console.log("Game created:", currentGame.id);
        console.log("Updating table with currentGameId...");
        await storage.updateGameTable(table.id, {
          currentGameId: currentGame.id,
          status: "playing"
        });
        console.log("Table updated successfully");
      }
      if (humanUserId) {
        console.log("Adding human player...");
        await this.ensurePlayerParticipant(humanUserId, table, currentGame);
        console.log("Human player added");
      }
      console.log("Getting current participants...");
      const participants = await storage.getGameParticipants(currentGame.id);
      console.log("Current participants:", participants.length);
      participants.forEach((p, i) => {
        console.log(`Participant ${i}:`, {
          seatPosition: p.seatPosition,
          userId: p.userId,
          botId: p.botId,
          isBot: p.isBot,
          hasRackTiles: !!p.rackTiles?.length
        });
      });
      const humanPlayers = participants.filter((p) => !p.isBot);
      const botPlayers = participants.filter((p) => p.isBot);
      console.log("Human players filtered:", humanPlayers.length);
      console.log("Bot players filtered:", botPlayers.length);
      const maxPlayers = table.maxPlayers || 4;
      let botsNeeded = 0;
      if (table.gameMode === "single-player") {
        botsNeeded = Math.max(0, maxPlayers - humanPlayers.length);
      } else if (table.gameMode === "multiplayer" && table.settings?.botCount) {
        const targetBotCount = table.settings.botCount;
        const currentBots = participants.filter((p) => p.isBot).length;
        botsNeeded = Math.max(0, targetBotCount - currentBots);
      }
      console.log("Bots needed:", botsNeeded, "Human players:", humanPlayers.length);
      try {
        console.log("Starting bot addition loop for", botsNeeded, "bots");
        for (let i = 0; i < botsNeeded; i++) {
          console.log(`Adding bot ${i + 1} of ${botsNeeded}`);
          console.log("Finding empty seat...");
          const seatPosition = this.findEmptySeat(participants, maxPlayers);
          console.log("Empty seat found:", seatPosition);
          if (seatPosition !== -1) {
            const seatBotSettings = table.settings?.seatBotSettings;
            const botDifficulty = seatBotSettings?.[seatPosition] || table.botDifficulty || "standard";
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
              isReady: true
              // Bots are always ready
            });
            console.log("Bot participant created:", botParticipant.isBot ? `Bot seat ${seatPosition}` : "ERROR");
            participants.push(botParticipant);
            this.broadcastToTable(table.id, {
              type: "player_joined",
              data: {
                participant: botParticipant,
                isBot: true
              }
            });
          }
        }
        const updatedParticipants = await storage.getGameParticipants(currentGame.id);
        if (updatedParticipants.length >= maxPlayers) {
          await this.startGame(table, currentGame);
        }
      } catch (botError) {
        console.error("CRITICAL: Bot addition loop failed:", botError);
        console.error("Bot error stack:", botError.stack);
      }
    } catch (error) {
      console.error("Error auto-adding bots:", error);
    }
  }
  findEmptySeat(participants, maxPlayers) {
    const occupiedSeats = new Set(participants.map((p) => p.seatPosition));
    for (let i = 0; i < maxPlayers; i++) {
      if (!occupiedSeats.has(i)) {
        return i;
      }
    }
    return -1;
  }
  async startGame(table, game) {
    try {
      const fullTileset = gameEngine.generateFullTileset();
      const shuffledTiles = gameEngine.shuffleTiles(fullTileset, game.seed);
      const { playerHands, wall } = gameEngine.dealInitialHands(shuffledTiles);
      const participants = await storage.getGameParticipants(game.id);
      for (let i = 0; i < participants.length; i++) {
        const participant = participants[i];
        const hand = playerHands[i] || [];
        await storage.updateGameParticipant(participant.id, {
          rackTiles: hand
        });
      }
      const gameState = {
        phase: "charleston",
        currentPlayerIndex: 0,
        wallCount: wall.length,
        players: [
          { hand: playerHands[0] || [], discarded: [], melded: [], flowers: [] },
          { hand: playerHands[1] || [], discarded: [], melded: [], flowers: [] },
          { hand: playerHands[2] || [], discarded: [], melded: [], flowers: [] },
          { hand: playerHands[3] || [], discarded: [], melded: [], flowers: [] }
        ],
        charleston: {
          currentPass: "right",
          passesCompleted: 0,
          phase: "passing"
        }
      };
      await storage.updateGame(game.id, {
        gameState: JSON.stringify(gameState),
        wallTiles: wall,
        status: "charleston"
      });
      await storage.updateGameTable(table.id, {
        status: "playing"
      });
      const updatedParticipants = await storage.getGameParticipants(game.id);
      const playerStates = {};
      updatedParticipants.forEach((p) => {
        playerStates[p.seatPosition] = {
          rack: p.rackTiles || [],
          melds: p.meldedTiles || [],
          discards: p.discardedTiles || [],
          flowers: p.flowers || []
        };
      });
      this.broadcastToTable(table.id, {
        type: "game_started",
        data: {
          table,
          game: { ...game, gameState },
          participants: updatedParticipants,
          playerStates,
          gameState
        }
      });
    } catch (error) {
      console.error("Error starting game:", error);
    }
  }
  generateSessionId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
};
function setupWebSocket(server) {
  return new WebSocketManager(server);
}

// server/services/patternValidator.ts
var PatternValidator = class _PatternValidator {
  static instance;
  static getInstance() {
    if (!_PatternValidator.instance) {
      _PatternValidator.instance = new _PatternValidator();
    }
    return _PatternValidator.instance;
  }
  // Validate if a hand matches winning patterns
  validateWinningHand(rack, melds, flowers, patterns) {
    for (const pattern of patterns) {
      const result = this.checkHandAgainstPattern(rack, melds, flowers, pattern);
      if (result.isValid) {
        return result;
      }
    }
    return {
      isValid: false,
      explanation: "No valid winning pattern found for current hand"
    };
  }
  // Check a specific pattern against the hand
  checkHandAgainstPattern(rack, melds, flowers, pattern) {
    try {
      const patternSets = pattern.patternSets;
      const allTiles = [...rack, ...melds.flatMap((m) => m.tiles)];
      if (pattern.flowersUsage === "required" && flowers.length === 0) {
        return {
          isValid: false,
          explanation: `Pattern "${pattern.name}" requires flowers`
        };
      }
      if (pattern.concealedOnly && melds.some((m) => !m.isConcealed)) {
        return {
          isValid: false,
          explanation: `Pattern "${pattern.name}" must be entirely concealed`
        };
      }
      const jokerCount = allTiles.filter((t) => t.isJoker).length;
      if (!pattern.jokersAllowed && jokerCount > 0) {
        return {
          isValid: false,
          explanation: `Pattern "${pattern.name}" does not allow jokers`
        };
      }
      if (allTiles.length !== 14) {
        return {
          isValid: false,
          explanation: "Winning hand must contain exactly 14 tiles"
        };
      }
      const validation = this.validatePatternSets(allTiles, patternSets, pattern.jokersAllowed);
      if (validation.isValid) {
        return {
          isValid: true,
          matchedPattern: pattern,
          explanation: `Valid winning hand: ${pattern.name}`
        };
      } else {
        return {
          isValid: false,
          explanation: validation.explanation || `Does not match pattern "${pattern.name}"`
        };
      }
    } catch (error) {
      return {
        isValid: false,
        explanation: `Error validating pattern: ${error}`
      };
    }
  }
  // Validate that tiles match the required pattern sets
  validatePatternSets(tiles, patternSets, jokersAllowed) {
    const remainingTiles = [...tiles];
    for (const setDef of patternSets) {
      const setResult = this.findMatchingSet(remainingTiles, setDef, jokersAllowed);
      if (!setResult.found) {
        return {
          isValid: false,
          explanation: `Could not find required set: ${setDef.type} of ${setDef.tileSet}`
        };
      }
      for (const tile of setResult.usedTiles) {
        const index2 = remainingTiles.findIndex((t) => t.id === tile.id);
        if (index2 !== -1) {
          remainingTiles.splice(index2, 1);
        }
      }
    }
    if (remainingTiles.length > 0) {
      return {
        isValid: false,
        explanation: `${remainingTiles.length} tiles do not fit the pattern`
      };
    }
    return { isValid: true };
  }
  // Find a matching set of tiles for a pattern requirement
  findMatchingSet(tiles, setDef, jokersAllowed) {
    const setType = setDef.type;
    const tileSet = setDef.tileSet;
    switch (setType) {
      case "pair":
        return this.findPair(tiles, tileSet, jokersAllowed);
      case "pung":
        return this.findPung(tiles, tileSet, jokersAllowed);
      case "kong":
        return this.findKong(tiles, tileSet, jokersAllowed);
      case "quint":
        return this.findQuint(tiles, tileSet, jokersAllowed);
      default:
        return { found: false, usedTiles: [] };
    }
  }
  findPair(tiles, tileSet, jokersAllowed) {
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        if (this.tilesMatchForSet(tiles[i], tiles[j], tileSet)) {
          return { found: true, usedTiles: [tiles[i], tiles[j]] };
        }
      }
    }
    if (jokersAllowed) {
      const jokers = tiles.filter((t) => t.isJoker);
      const nonJokers = tiles.filter((t) => !t.isJoker && this.tileMatchesSet(t, tileSet));
      if (jokers.length >= 1 && nonJokers.length >= 1) {
        return { found: true, usedTiles: [nonJokers[0], jokers[0]] };
      }
      if (jokers.length >= 2) {
        return { found: true, usedTiles: [jokers[0], jokers[1]] };
      }
    }
    return { found: false, usedTiles: [] };
  }
  findPung(tiles, tileSet, jokersAllowed) {
    const tileGroups = this.groupTilesByValue(tiles.filter((t) => this.tileMatchesSet(t, tileSet)));
    for (const group of tileGroups) {
      if (group.length >= 3) {
        return { found: true, usedTiles: group.slice(0, 3) };
      }
      if (jokersAllowed) {
        const jokersNeeded = 3 - group.length;
        const availableJokers = tiles.filter((t) => t.isJoker);
        if (jokersNeeded > 0 && availableJokers.length >= jokersNeeded) {
          const usedTiles = [...group, ...availableJokers.slice(0, jokersNeeded)];
          return { found: true, usedTiles };
        }
      }
    }
    return { found: false, usedTiles: [] };
  }
  findKong(tiles, tileSet, jokersAllowed) {
    const tileGroups = this.groupTilesByValue(tiles.filter((t) => this.tileMatchesSet(t, tileSet)));
    for (const group of tileGroups) {
      if (group.length >= 4) {
        return { found: true, usedTiles: group.slice(0, 4) };
      }
      if (jokersAllowed) {
        const jokersNeeded = 4 - group.length;
        const availableJokers = tiles.filter((t) => t.isJoker);
        if (jokersNeeded > 0 && availableJokers.length >= jokersNeeded) {
          const usedTiles = [...group, ...availableJokers.slice(0, jokersNeeded)];
          return { found: true, usedTiles };
        }
      }
    }
    return { found: false, usedTiles: [] };
  }
  findQuint(tiles, tileSet, jokersAllowed) {
    const tileGroups = this.groupTilesByValue(tiles.filter((t) => this.tileMatchesSet(t, tileSet)));
    for (const group of tileGroups) {
      if (group.length >= 5) {
        return { found: true, usedTiles: group.slice(0, 5) };
      }
      if (jokersAllowed) {
        const jokersNeeded = 5 - group.length;
        const availableJokers = tiles.filter((t) => t.isJoker);
        if (jokersNeeded > 0 && availableJokers.length >= jokersNeeded && group.length >= 1) {
          const usedTiles = [...group, ...availableJokers.slice(0, jokersNeeded)];
          return { found: true, usedTiles };
        }
      }
    }
    return { found: false, usedTiles: [] };
  }
  groupTilesByValue(tiles) {
    const groups = {};
    for (const tile of tiles) {
      const key = `${tile.suit}_${tile.value}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(tile);
    }
    return Object.values(groups);
  }
  tilesMatchForSet(tile1, tile2, tileSet) {
    if (tile1.isJoker || tile2.isJoker) return true;
    return tile1.suit === tile2.suit && tile1.value === tile2.value;
  }
  tileMatchesSet(tile, tileSet) {
    if (tile.isJoker) return true;
    switch (tileSet) {
      case "dragons_any":
        return tile.suit === "dragons";
      case "winds_any":
        return tile.suit === "winds";
      case "evens_one_suit":
        return (tile.suit === "dots" || tile.suit === "bams" || tile.suit === "craks") && typeof tile.value === "number" && tile.value % 2 === 0;
      default:
        return true;
    }
  }
  // Analyze hand for suggested patterns
  analyzeHandForSuggestions(rack, melds, flowers, patterns) {
    const suggestions = patterns.map((pattern) => {
      const progress = this.calculatePatternProgress(rack, melds, flowers, pattern);
      return {
        pattern,
        likelihood: progress.likelihood,
        explanation: progress.explanation,
        neededTiles: progress.neededTiles
      };
    });
    suggestions.sort((a, b) => b.likelihood - a.likelihood);
    return {
      suggestedPatterns: suggestions.slice(0, 3),
      // Top 3 suggestions
      currentScore: this.calculateCurrentScore(rack, melds, flowers)
    };
  }
  calculatePatternProgress(rack, melds, flowers, pattern) {
    const allTiles = [...rack, ...melds.flatMap((m) => m.tiles)];
    const completeness = allTiles.length / 14;
    return {
      likelihood: completeness * 100,
      explanation: `${Math.round(completeness * 100)}% complete for ${pattern.name}`,
      neededTiles: []
      // Would calculate actual needed tiles
    };
  }
  calculateCurrentScore(rack, melds, flowers) {
    let score = 0;
    score += melds.length * 5;
    score += flowers.length * 2;
    const specialTiles = rack.filter((t) => t.suit === "dragons" || t.suit === "winds");
    score += specialTiles.length * 1;
    return score;
  }
};
var patternValidator = PatternValidator.getInstance();

// server/services/puzzleGenerator.ts
var PuzzleGenerator = class _PuzzleGenerator {
  static instance;
  static getInstance() {
    if (!_PuzzleGenerator.instance) {
      _PuzzleGenerator.instance = new _PuzzleGenerator();
    }
    return _PuzzleGenerator.instance;
  }
  // Generate a daily puzzle from date and salt
  generateDailyPuzzle(date, salt = "mahjong_puzzle") {
    const seed = `${date}_${salt}`;
    const difficulty = this.getDifficultyForDate(date);
    switch (difficulty) {
      case "easy":
        return this.generateEasyPuzzle(seed);
      case "medium":
        return this.generateMediumPuzzle(seed);
      case "hard":
        return this.generateHardPuzzle(seed);
      default:
        return this.generateEasyPuzzle(seed);
    }
  }
  getDifficultyForDate(date) {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    if (dayOfWeek <= 2) return "easy";
    if (dayOfWeek <= 5) return "medium";
    return "hard";
  }
  // Generate an easy puzzle (simple tile swapping)
  generateEasyPuzzle(seed) {
    const random = this.createSeededRandom(seed);
    const rack = [];
    let tileId = 0;
    const suits = ["dots", "bams", "craks"];
    const selectedSuit = suits[Math.floor(random() * suits.length)];
    for (let i = 1; i <= 3; i++) {
      rack.push(
        { id: `tile_${tileId++}`, suit: selectedSuit, value: i * 2, isJoker: false, isFlower: false },
        { id: `tile_${tileId++}`, suit: selectedSuit, value: i * 2, isJoker: false, isFlower: false }
      );
    }
    for (let i = 0; i < 7; i++) {
      const suit = suits[Math.floor(random() * suits.length)];
      const value = Math.floor(random() * 9) + 1;
      rack.push({
        id: `tile_${tileId++}`,
        suit,
        value,
        isJoker: false,
        isFlower: false
      });
    }
    rack.push({
      id: `tile_${tileId++}`,
      suit: "joker",
      value: "J",
      isJoker: true,
      isFlower: false
    });
    return {
      initialRack: rack,
      targetPattern: "Three Pairs",
      allowedMoves: 5,
      solution: ["Discard tile 1", "Discard tile 2", "Form pair with joker"],
      hint: "Look for matching tiles and use the joker wisely",
      difficulty: "easy"
    };
  }
  // Generate a medium puzzle (Charleston simulation)
  generateMediumPuzzle(seed) {
    const random = this.createSeededRandom(seed);
    const rack = [];
    let tileId = 0;
    const allSuits = ["dots", "bams", "craks", "winds", "dragons"];
    for (let i = 0; i < 13; i++) {
      const suit = allSuits[Math.floor(random() * allSuits.length)];
      let value;
      if (suit === "winds") {
        value = ["N", "E", "S", "W"][Math.floor(random() * 4)];
      } else if (suit === "dragons") {
        value = ["R", "G", "W"][Math.floor(random() * 3)];
      } else {
        value = Math.floor(random() * 9) + 1;
      }
      rack.push({
        id: `tile_${tileId++}`,
        suit,
        value,
        isJoker: false,
        isFlower: false
      });
    }
    return {
      initialRack: rack,
      targetPattern: "Organize for Charleston",
      allowedMoves: 8,
      solution: ["Group similar tiles", "Identify passing candidates", "Plan exchanges"],
      hint: "Group tiles by suit and value. Consider which tiles to pass for better combinations.",
      difficulty: "medium"
    };
  }
  // Generate a hard puzzle (complex pattern recognition)
  generateHardPuzzle(seed) {
    const random = this.createSeededRandom(seed);
    const rack = [];
    let tileId = 0;
    const complexSuits = ["dots", "bams", "craks"];
    const baseSuit = complexSuits[Math.floor(random() * complexSuits.length)];
    for (let i = 1; i <= 6; i++) {
      rack.push({
        id: `tile_${tileId++}`,
        suit: baseSuit,
        value: i,
        isJoker: false,
        isFlower: false
      });
    }
    for (let i = 0; i < 4; i++) {
      rack.push({
        id: `tile_${tileId++}`,
        suit: "dragons",
        value: ["R", "G", "W"][Math.floor(random() * 3)],
        isJoker: false,
        isFlower: false
      });
    }
    for (let i = 0; i < 3; i++) {
      rack.push({
        id: `tile_${tileId++}`,
        suit: "joker",
        value: "J",
        isJoker: true,
        isFlower: false
      });
    }
    return {
      initialRack: rack,
      targetPattern: "Consecutive Run with Dragons",
      allowedMoves: 12,
      solution: [
        "Identify consecutive sequence",
        "Group dragons",
        "Use jokers strategically",
        "Form optimal melds"
      ],
      hint: "This hand can form multiple patterns. Consider both consecutive runs and grouped honors.",
      difficulty: "hard"
    };
  }
  // Create a seeded random number generator
  createSeededRandom(seed) {
    let seedNum = this.hashString(seed);
    return () => {
      seedNum = (seedNum * 9301 + 49297) % 233280;
      return seedNum / 233280;
    };
  }
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  // Validate puzzle solution
  validatePuzzleSolution(initialRack, moves, targetPattern) {
    const moveCount = moves.length;
    const efficiency = Math.max(0, 100 - moveCount * 5);
    return {
      isCorrect: true,
      // Simplified - would check actual solution
      score: efficiency,
      explanation: `Solution completed in ${moveCount} moves. Efficiency: ${efficiency}%`
    };
  }
  // Generate hint for current puzzle state
  generateHint(currentRack, targetPattern, difficulty) {
    switch (difficulty) {
      case "easy":
        return "Look for pairs of matching tiles. Jokers can substitute for any tile.";
      case "medium":
        return "Group tiles by suit and consider which combinations would be most useful.";
      case "hard":
        return "Analyze multiple pattern possibilities and choose the path requiring fewer discards.";
      default:
        return "Study your tiles carefully and plan your moves.";
    }
  }
  // Calculate puzzle score based on completion time and moves
  calculatePuzzleScore(timeSeconds, moves, hintsUsed, difficulty) {
    const baseScore = { easy: 100, medium: 200, hard: 300 }[difficulty];
    const timeBonus = Math.max(0, baseScore - timeSeconds);
    const movesPenalty = moves * 5;
    const hintPenalty = hintsUsed ? 50 : 0;
    return Math.max(10, baseScore + timeBonus - movesPenalty - hintPenalty);
  }
};
var puzzleGenerator = PuzzleGenerator.getInstance();

// server/routes.ts
import fs2 from "fs";
import path2 from "path";
var useLocalAuth = process.env.LOCAL_DEV_MODE === "true";
var authModule = useLocalAuth ? "./localAuth" : "./replitAuth";
var { setupAuth, isAuthenticated } = await import(authModule);
var ObjectStorageService2;
var objectStorageServiceInstance;
if (useLocalAuth) {
  const localModule = await Promise.resolve().then(() => (init_localObjectStorage(), localObjectStorage_exports));
  ObjectStorageService2 = localModule.LocalObjectStorageService;
  objectStorageServiceInstance = localModule.localObjectStorageService;
} else {
  const cloudModule = await Promise.resolve().then(() => (init_objectStorage(), objectStorage_exports));
  ObjectStorageService2 = cloudModule.ObjectStorageService;
  objectStorageServiceInstance = new ObjectStorageService2();
}
function getUserId(user) {
  return useLocalAuth ? user.id : user.claims.sub;
}
async function registerRoutes(app2) {
  await setupAuth(app2);
  await featureFlagService.initializeDefaultFlags();
  await loadInitialPatterns();
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req.user);
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.get("/api/feature-flags", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const flags = await featureFlagService.getClientFlags(userId);
      res.json(flags);
    } catch (error) {
      console.error("Error fetching feature flags:", error);
      res.status(500).json({ message: "Failed to fetch feature flags" });
    }
  });
  app2.get("/api/tables", async (req, res) => {
    try {
      const tables = await storage.getGameTables(20);
      res.json(tables);
    } catch (error) {
      console.error("Error fetching tables:", error);
      res.status(500).json({ message: "Failed to fetch tables" });
    }
  });
  app2.post("/api/tables", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req.user);
      const { seatBotSettings, botCount, ...bodyData } = req.body;
      let settings = null;
      if (bodyData.gameMode === "single-player" && seatBotSettings) {
        settings = { seatBotSettings };
      } else if (bodyData.gameMode === "multiplayer" && botCount > 0) {
        settings = { botCount };
      }
      const tableData = insertGameTableSchema.parse({
        ...bodyData,
        hostUserId: userId,
        settings
      });
      if (tableData.isPrivate) {
        tableData.inviteCode = generateInviteCode();
      }
      const table = await storage.createGameTable(tableData);
      res.json(table);
      await analyticsService.trackEvent(
        "table_created",
        {
          tableId: table.id,
          isPrivate: !!tableData.isPrivate,
          gameMode: tableData.gameMode,
          botDifficulty: tableData.botDifficulty || "",
          botCount: bodyData.gameMode === "multiplayer" ? botCount : null
        },
        userId,
        req.sessionID
      );
    } catch (error) {
      console.error("Error creating table:", error);
      res.status(500).json({ message: "Failed to create table" });
    }
  });
  app2.get("/api/tables/:id", async (req, res) => {
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
  app2.delete("/api/tables/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req.user);
      const table = await storage.getGameTable(req.params.id);
      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }
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
  app2.post("/api/tables/:tableId/games", isAuthenticated, async (req, res) => {
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
      const seed = `${Date.now()}_${Math.random()}`;
      const game = await storage.createGame({
        tableId,
        seed,
        gameState: { phase: "setup", currentPlayerIndex: 0, wallCount: 0 }
      });
      await storage.updateGameTable(tableId, { currentGameId: game.id, status: "playing" });
      res.json(game);
      await analyticsService.trackEvent(
        "hand_started",
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
  app2.get("/api/tables/:tableId/chat", async (req, res) => {
    try {
      const messages = await storage.getChatMessages(req.params.tableId, 50);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });
  app2.post("/api/tables/:tableId/chat", isAuthenticated, featureFlagService.createFeatureMiddleware("chat_enabled"), async (req, res) => {
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
  app2.get("/api/patterns", async (req, res) => {
    try {
      const category = req.query.category;
      const patterns = await storage.getHandPatterns(category);
      res.json(patterns);
    } catch (error) {
      console.error("Error fetching patterns:", error);
      res.status(500).json({ message: "Failed to fetch patterns" });
    }
  });
  app2.get("/api/patterns/active", async (req, res) => {
    try {
      const patterns = await storage.getActiveHandPatterns();
      res.json(patterns);
    } catch (error) {
      console.error("Error fetching active patterns:", error);
      res.status(500).json({ message: "Failed to fetch active patterns" });
    }
  });
  app2.post("/api/analyze-hand", isAuthenticated, featureFlagService.createFeatureMiddleware("ai_hints_enabled"), async (req, res) => {
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
  app2.post("/api/validate-win", isAuthenticated, async (req, res) => {
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
  app2.get("/api/puzzles/daily", async (req, res) => {
    try {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      let puzzle = await storage.getDailyPuzzle(today);
      if (!puzzle) {
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
  app2.post("/api/puzzles/:puzzleId/attempts", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req.user);
      const { puzzleId } = req.params;
      const { timeSeconds, moves, hintsUsed, completed } = req.body;
      const score = completed ? puzzleGenerator.calculatePuzzleScore(timeSeconds, moves, hintsUsed, "medium") : 0;
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
      if (completed) {
        const puzzle = await storage.getDailyPuzzle("");
        await analyticsService.trackPuzzleCompletion(
          userId,
          req.sessionID,
          puzzle?.date || "",
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
  app2.get("/api/puzzles/:puzzleId/leaderboard", async (req, res) => {
    try {
      const leaderboard = await storage.getPuzzleLeaderboard(req.params.puzzleId, 10);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });
  app2.get("/api/tutorial/progress", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req.user);
      const progress = await storage.getTutorialProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching tutorial progress:", error);
      res.status(500).json({ message: "Failed to fetch tutorial progress" });
    }
  });
  app2.post("/api/tutorial/progress", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req.user);
      const { tutorialStep, completed } = req.body;
      const progress = await storage.updateTutorialProgress({
        userId,
        tutorialStep,
        completed
      });
      res.json(progress);
      await analyticsService.trackTutorialProgress(
        userId,
        req.sessionID,
        tutorialStep,
        completed ? 1 : void 0
      );
    } catch (error) {
      console.error("Error updating tutorial progress:", error);
      res.status(500).json({ message: "Failed to update tutorial progress" });
    }
  });
  app2.post("/api/reports", isAuthenticated, async (req, res) => {
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
  app2.get("/api/admin/reports", isAuthenticated, async (req, res) => {
    try {
      const reports = await storage.getUserReports("pending");
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });
  app2.post("/api/admin/patterns", isAuthenticated, async (req, res) => {
    try {
      const patternData = insertHandPatternSchema.parse(req.body);
      const pattern = await storage.createHandPattern(patternData);
      res.json(pattern);
    } catch (error) {
      console.error("Error creating pattern:", error);
      res.status(500).json({ message: "Failed to create pattern" });
    }
  });
  app2.get("/api/admin/feature-flags", isAuthenticated, async (req, res) => {
    try {
      const flags = await featureFlagService.getAllFlags();
      res.json(flags);
    } catch (error) {
      console.error("Error fetching feature flags:", error);
      res.status(500).json({ message: "Failed to fetch feature flags" });
    }
  });
  app2.patch("/api/admin/feature-flags/:id", isAuthenticated, async (req, res) => {
    try {
      const updated = await featureFlagService.updateFlag(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating feature flag:", error);
      res.status(500).json({ message: "Failed to update feature flag" });
    }
  });
  app2.get("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req.user);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
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
  app2.patch("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req.user);
      const updates = req.body;
      const user = await storage.upsertUser({ id: userId, ...updates });
      res.json(user);
      for (const [key, value] of Object.entries(updates)) {
        await analyticsService.trackEvent(
          "settings_changed",
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
  app2.post("/api/analytics/event", async (req, res) => {
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
  const objectStorageService = objectStorageServiceInstance;
  app2.get("/api/themes/public", async (req, res) => {
    try {
      const themes = await storage.getPublicTileThemes();
      res.json(themes);
    } catch (error) {
      console.error("Error fetching public themes:", error);
      res.status(500).json({ message: "Failed to fetch public themes" });
    }
  });
  app2.put("/api/user/theme", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req.user);
      const { themeId } = req.body;
      if (!themeId) {
        return res.status(400).json({ message: "Theme ID is required" });
      }
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
  app2.get("/api/themes", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req.user);
      const { public_only } = req.query;
      let themes;
      if (public_only === "true") {
        themes = await storage.getPublicTileThemes();
      } else {
        const userThemes = await storage.getTileThemes(userId);
        const publicThemes = await storage.getPublicTileThemes();
        themes = [...userThemes, ...publicThemes.filter((pt) => pt.creatorId !== userId)];
      }
      res.json(themes);
    } catch (error) {
      console.error("Error fetching tile themes:", error);
      res.status(500).json({ message: "Failed to fetch tile themes" });
    }
  });
  app2.get("/api/themes/:id", isAuthenticated, async (req, res) => {
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
  app2.post("/api/themes", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req.user);
      const themeData = insertTileThemeSchema.parse({
        ...req.body,
        creatorId: userId
      });
      const theme = await storage.createTileTheme(themeData);
      res.json(theme);
      await analyticsService.trackEvent(
        "theme_created",
        { themeId: theme.id, themeName: theme.name },
        userId,
        req.sessionID
      );
    } catch (error) {
      console.error("Error creating tile theme:", error);
      res.status(500).json({ message: "Failed to create tile theme" });
    }
  });
  app2.post("/api/themes/upload", isAuthenticated, async (req, res) => {
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
  app2.post("/api/themes/:id/images", isAuthenticated, async (req, res) => {
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
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(imageUrl);
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
  const httpServer = createServer(app2);
  setupWebSocket(httpServer);
  return httpServer;
}
function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
async function loadInitialPatterns() {
  try {
    const patternsFile = path2.join(import.meta.dirname, "data", "patterns.json");
    const patterns = JSON.parse(fs2.readFileSync(patternsFile, "utf8"));
    for (const patternData of patterns) {
      const existing = await storage.getHandPatterns(patternData.category);
      const found = existing.find((p) => p.name === patternData.name);
      if (!found) {
        await storage.createHandPattern(patternData);
      }
    }
  } catch (error) {
    console.warn("Could not load initial patterns:", error);
  }
}

// server/vite.ts
import express from "express";
import fs3 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path3 from "path";
var vite_config_default = defineConfig({
  plugins: [
    react()
    // Replit plugins removed for local development
    // runtimeErrorOverlay() - replaced with standard Vite error overlay
    // cartographer() - not needed in local development
  ],
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path3.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "..", "dist", "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
