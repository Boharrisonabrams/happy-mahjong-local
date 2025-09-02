import { FeatureFlag } from "@shared/schema";
import { storage } from "../storage";

export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private flagCache: Map<string, FeatureFlag> = new Map();
  private lastCacheUpdate = 0;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  // Initialize default feature flags
  async initializeDefaultFlags(): Promise<void> {
    const defaultFlags = [
      {
        name: 'billing_enabled',
        enabled: false,
        description: 'Enable subscription billing and premium features',
        rolloutPercentage: 0,
        userWhitelist: [],
      },
      {
        name: 'ai_hints_enabled',
        enabled: true,
        description: 'Enable AI-powered game hints and suggestions',
        rolloutPercentage: 100,
        userWhitelist: [],
      },
      {
        name: 'chat_enabled',
        enabled: true,
        description: 'Enable table chat functionality',
        rolloutPercentage: 100,
        userWhitelist: [],
      },
      {
        name: 'bot_opponents_enabled',
        enabled: true,
        description: 'Enable AI bot opponents in games',
        rolloutPercentage: 100,
        userWhitelist: [],
      },
      {
        name: 'daily_puzzles_enabled',
        enabled: true,
        description: 'Enable daily puzzle challenges',
        rolloutPercentage: 100,
        userWhitelist: [],
      },
      {
        name: 'private_tables_enabled',
        enabled: true,
        description: 'Enable private table creation with invite codes',
        rolloutPercentage: 100,
        userWhitelist: [],
      },
      {
        name: 'analytics_enabled',
        enabled: true,
        description: 'Enable analytics event collection',
        rolloutPercentage: 100,
        userWhitelist: [],
      },
      {
        name: 'custom_tile_skins_enabled',
        enabled: false,
        description: 'Enable custom tile skin selection (premium feature)',
        rolloutPercentage: 0,
        userWhitelist: [],
      },
      {
        name: 'tournament_mode_enabled',
        enabled: false,
        description: 'Enable tournament and competitive play modes',
        rolloutPercentage: 0,
        userWhitelist: [],
      },
      {
        name: 'spectator_mode_enabled',
        enabled: true,
        description: 'Allow users to spectate ongoing games',
        rolloutPercentage: 50,
        userWhitelist: [],
      }
    ];

    for (const flagData of defaultFlags) {
      const existing = await storage.getFeatureFlag(flagData.name);
      if (!existing) {
        await storage.createFeatureFlag(flagData as any);
      }
    }

    // Refresh cache
    await this.refreshCache();
  }

  // Check if a feature is enabled for a user
  async isFeatureEnabled(flagName: string, userId?: string): Promise<boolean> {
    await this.ensureFreshCache();
    
    const flag = this.flagCache.get(flagName);
    if (!flag) {
      return false;
    }

    // Check if globally disabled
    if (!flag.enabled) {
      return false;
    }

    // Check user whitelist
    if (userId && flag.userWhitelist) {
      const whitelist = flag.userWhitelist as string[];
      if (whitelist.includes(userId)) {
        return true;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage >= 100) {
      return true;
    }

    if (flag.rolloutPercentage <= 0) {
      return false;
    }

    // Use user ID for consistent rollout
    if (userId) {
      const userHash = this.hashString(userId + flagName);
      const userPercentile = userHash % 100;
      return userPercentile < flag.rolloutPercentage;
    }

    // For anonymous users, use random
    return Math.random() * 100 < flag.rolloutPercentage;
  }

  // Get all feature flags (for admin interface)
  async getAllFlags(): Promise<FeatureFlag[]> {
    return await storage.getFeatureFlags();
  }

  // Update a feature flag
  async updateFlag(
    flagId: string, 
    updates: Partial<FeatureFlag>
  ): Promise<FeatureFlag> {
    const updated = await storage.updateFeatureFlag(flagId, updates);
    await this.refreshCache();
    return updated;
  }

  // Get feature flags for client (filtered)
  async getClientFlags(userId?: string): Promise<{ [key: string]: boolean }> {
    const clientFlags: { [key: string]: boolean } = {};
    
    // Only expose certain flags to the client
    const clientExposedFlags = [
      'billing_enabled',
      'ai_hints_enabled',
      'chat_enabled',
      'daily_puzzles_enabled',
      'custom_tile_skins_enabled',
      'spectator_mode_enabled'
    ];

    for (const flagName of clientExposedFlags) {
      clientFlags[flagName] = await this.isFeatureEnabled(flagName, userId);
    }

    return clientFlags;
  }

  // Check multiple features at once
  async checkMultipleFeatures(
    flagNames: string[], 
    userId?: string
  ): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};
    
    for (const flagName of flagNames) {
      results[flagName] = await this.isFeatureEnabled(flagName, userId);
    }

    return results;
  }

  // Enable feature for specific users (whitelist)
  async addUserToWhitelist(flagName: string, userId: string): Promise<void> {
    const flag = await storage.getFeatureFlag(flagName);
    if (!flag) {
      throw new Error(`Feature flag ${flagName} not found`);
    }

    const whitelist = (flag.userWhitelist as string[]) || [];
    if (!whitelist.includes(userId)) {
      whitelist.push(userId);
      await storage.updateFeatureFlag(flag.id, { userWhitelist: whitelist });
      await this.refreshCache();
    }
  }

  // Remove user from whitelist
  async removeUserFromWhitelist(flagName: string, userId: string): Promise<void> {
    const flag = await storage.getFeatureFlag(flagName);
    if (!flag) {
      throw new Error(`Feature flag ${flagName} not found`);
    }

    const whitelist = (flag.userWhitelist as string[]) || [];
    const filtered = whitelist.filter(id => id !== userId);
    
    await storage.updateFeatureFlag(flag.id, { userWhitelist: filtered });
    await this.refreshCache();
  }

  // Gradually roll out a feature
  async setRolloutPercentage(flagName: string, percentage: number): Promise<void> {
    const flag = await storage.getFeatureFlag(flagName);
    if (!flag) {
      throw new Error(`Feature flag ${flagName} not found`);
    }

    await storage.updateFeatureFlag(flag.id, { rolloutPercentage: percentage });
    await this.refreshCache();
  }

  // Cache management
  private async ensureFreshCache(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate > this.cacheTimeout) {
      await this.refreshCache();
    }
  }

  private async refreshCache(): Promise<void> {
    const flags = await storage.getFeatureFlags();
    this.flagCache.clear();
    
    for (const flag of flags) {
      this.flagCache.set(flag.name, flag);
    }
    
    this.lastCacheUpdate = Date.now();
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // Middleware for protecting routes based on feature flags
  createFeatureMiddleware(flagName: string, redirectUrl?: string) {
    return async (req: any, res: any, next: any) => {
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
}

export const featureFlagService = FeatureFlagService.getInstance();
