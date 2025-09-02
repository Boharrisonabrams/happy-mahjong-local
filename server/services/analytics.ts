import { AnalyticsEvent, InsertAnalyticsEvent } from "@shared/schema";
import { storage } from "../storage";
import { featureFlagService } from "./featureFlags";

export interface EventData {
  // Table events
  table_joined?: {
    tableId: string;
    isPrivate: boolean;
    playerCount: number;
  };
  table_left?: {
    tableId: string;
    sessionDuration: number;
  };
  table_created?: {
    tableId: string;
    isPrivate: boolean;
    botDifficulty?: string;
  };

  // Game events
  hand_started?: {
    gameId: string;
    handNumber: number;
  };
  hand_won?: {
    gameId: string;
    winnerId: string;
    pattern: string;
    points: number;
  };
  exposure_made?: {
    gameId: string;
    playerId: string;
    meldType: string;
    tilesUsed: number;
  };
  call_declined?: {
    gameId: string;
    playerId: string;
    callType: string;
  };
  charleston_completed?: {
    gameId: string;
    phase: number;
  };

  // Tutorial events
  tutorial_started?: {
    tutorialStep: string;
  };
  tutorial_completed?: {
    tutorialStep: string;
    timeSpent: number;
  };

  // Puzzle events
  puzzle_started?: {
    puzzleDate: string;
    difficulty: string;
  };
  puzzle_completed?: {
    puzzleDate: string;
    timeSeconds: number;
    moves: number;
    hintsUsed: boolean;
    score: number;
  };

  // User preference events
  settings_changed?: {
    settingName: string;
    oldValue: any;
    newValue: any;
  };
  theme_changed?: {
    oldTheme: string;
    newTheme: string;
  };

  // Error events
  game_error?: {
    errorType: string;
    errorMessage: string;
    gameId?: string;
  };
  connection_lost?: {
    tableId?: string;
    gameId?: string;
  };
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private eventQueue: InsertAnalyticsEvent[] = [];
  private processingQueue = false;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  // Track an analytics event
  async trackEvent(
    eventType: keyof EventData,
    eventData: EventData[keyof EventData],
    userId?: string,
    sessionId?: string,
    tableId?: string,
    gameId?: string
  ): Promise<void> {
    // Check if analytics is enabled
    const analyticsEnabled = await featureFlagService.isFeatureEnabled('analytics_enabled');
    if (!analyticsEnabled) {
      return;
    }

    // Check user preference (if userId provided)
    if (userId) {
      const user = await storage.getUser(userId);
      if (user && !user.analyticsEnabled) {
        return;
      }
    }

    const event: InsertAnalyticsEvent = {
      userId,
      sessionId,
      eventType,
      eventData: eventData as any,
      tableId,
      gameId,
    };

    // Add to queue for batch processing
    this.eventQueue.push(event);
    
    // Process queue if not already processing
    if (!this.processingQueue) {
      this.processEventQueue();
    }
  }

  // Process events in batches
  private async processEventQueue(): Promise<void> {
    if (this.processingQueue || this.eventQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      // Process events in batches of 50
      while (this.eventQueue.length > 0) {
        const batch = this.eventQueue.splice(0, 50);
        
        for (const event of batch) {
          try {
            await storage.logAnalyticsEvent(event);
          } catch (error) {
            console.error('Failed to log analytics event:', error);
            // Could implement retry logic here
          }
        }

        // Small delay between batches
        if (this.eventQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } finally {
      this.processingQueue = false;
    }
  }

  // Helper methods for common events
  async trackTableJoined(
    userId: string,
    tableId: string,
    sessionId: string,
    isPrivate: boolean,
    playerCount: number
  ): Promise<void> {
    await this.trackEvent(
      'table_joined',
      { tableId, isPrivate, playerCount },
      userId,
      sessionId,
      tableId
    );
  }

  async trackTableLeft(
    userId: string,
    tableId: string,
    sessionId: string,
    sessionDuration: number
  ): Promise<void> {
    await this.trackEvent(
      'table_left',
      { tableId, sessionDuration },
      userId,
      sessionId,
      tableId
    );
  }

  async trackHandWon(
    winnerId: string,
    gameId: string,
    tableId: string,
    sessionId: string,
    pattern: string,
    points: number
  ): Promise<void> {
    await this.trackEvent(
      'hand_won',
      { gameId, winnerId, pattern, points },
      winnerId,
      sessionId,
      tableId,
      gameId
    );
  }

  async trackExposureMade(
    playerId: string,
    gameId: string,
    tableId: string,
    sessionId: string,
    meldType: string,
    tilesUsed: number
  ): Promise<void> {
    await this.trackEvent(
      'exposure_made',
      { gameId, playerId, meldType, tilesUsed },
      playerId,
      sessionId,
      tableId,
      gameId
    );
  }

  async trackTutorialProgress(
    userId: string,
    sessionId: string,
    tutorialStep: string,
    timeSpent?: number
  ): Promise<void> {
    const eventType = timeSpent ? 'tutorial_completed' : 'tutorial_started';
    const eventData = timeSpent 
      ? { tutorialStep, timeSpent }
      : { tutorialStep };

    await this.trackEvent(
      eventType as any,
      eventData,
      userId,
      sessionId
    );
  }

  async trackPuzzleCompletion(
    userId: string,
    sessionId: string,
    puzzleDate: string,
    timeSeconds: number,
    moves: number,
    hintsUsed: boolean,
    score: number
  ): Promise<void> {
    await this.trackEvent(
      'puzzle_completed',
      { puzzleDate, timeSeconds, moves, hintsUsed, score },
      userId,
      sessionId
    );
  }

  async trackGameError(
    errorType: string,
    errorMessage: string,
    userId?: string,
    sessionId?: string,
    gameId?: string,
    tableId?: string
  ): Promise<void> {
    await this.trackEvent(
      'game_error',
      { errorType, errorMessage, gameId },
      userId,
      sessionId,
      tableId,
      gameId
    );
  }

  // Analytics reporting methods
  async getUserEvents(
    userId: string,
    limit: number = 100
  ): Promise<AnalyticsEvent[]> {
    return await storage.getAnalyticsEvents({ userId, limit });
  }

  async getTableEvents(
    tableId: string,
    limit: number = 100
  ): Promise<AnalyticsEvent[]> {
    return await storage.getAnalyticsEvents({ tableId, limit });
  }

  async getGameEvents(
    gameId: string,
    limit: number = 100
  ): Promise<AnalyticsEvent[]> {
    return await storage.getAnalyticsEvents({ gameId, limit });
  }

  // Generate basic reports
  async generateDailyReport(date: string): Promise<any> {
    const events = await storage.getAnalyticsEvents({
      dateFilter: date,
      limit: 10000
    });

    const report = {
      date,
      totalEvents: events.length,
      uniqueUsers: new Set(events.map(e => e.userId).filter(Boolean)).size,
      eventBreakdown: {} as { [key: string]: number },
      tablesCreated: 0,
      gamesCompleted: 0,
      tutorialsCompleted: 0,
      puzzlesCompleted: 0,
    };

    for (const event of events) {
      // Count events by type
      report.eventBreakdown[event.eventType] = 
        (report.eventBreakdown[event.eventType] || 0) + 1;

      // Specific metrics
      switch (event.eventType) {
        case 'table_created':
          report.tablesCreated++;
          break;
        case 'hand_won':
          report.gamesCompleted++;
          break;
        case 'tutorial_completed':
          report.tutorialsCompleted++;
          break;
        case 'puzzle_completed':
          report.puzzlesCompleted++;
          break;
      }
    }

    return report;
  }

  // User engagement metrics
  async getUserEngagementMetrics(userId: string): Promise<any> {
    const events = await this.getUserEvents(userId, 1000);
    
    const metrics = {
      totalSessions: new Set(events.map(e => e.sessionId).filter(Boolean)).size,
      totalTablesJoined: events.filter(e => e.eventType === 'table_joined').length,
      totalGamesWon: events.filter(e => e.eventType === 'hand_won').length,
      tutorialProgress: events.filter(e => e.eventType === 'tutorial_completed').length,
      puzzlesCompleted: events.filter(e => e.eventType === 'puzzle_completed').length,
      lastActivity: events.length > 0 ? events[0].timestamp : null,
      favoriteGameMode: this.calculateFavoriteGameMode(events),
    };

    return metrics;
  }

  private calculateFavoriteGameMode(events: AnalyticsEvent[]): string {
    const gameModes: { [key: string]: number } = {};
    
    for (const event of events) {
      if (event.eventType === 'table_joined' && event.eventData) {
        const data = event.eventData as any;
        const mode = data.isPrivate ? 'private' : 'public';
        gameModes[mode] = (gameModes[mode] || 0) + 1;
      }
    }

    return Object.keys(gameModes).reduce((a, b) => 
      gameModes[a] > gameModes[b] ? a : b, 'public'
    );
  }

  // Clean up old events (for privacy/storage management)
  async cleanupOldEvents(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // This would need to be implemented in storage layer
    // For now, return 0 as placeholder
    return 0;
  }
}

export const analyticsService = AnalyticsService.getInstance();
