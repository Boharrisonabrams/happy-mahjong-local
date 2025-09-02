import { TileInfo, PlayerStateInfo, GameStateInfo, MeldInfo } from "@shared/schema";
import { gameEngine } from "./gameEngine";

export type BotDifficulty = 'easy' | 'standard' | 'strong';

export interface BotAction {
  type: 'draw' | 'discard' | 'call' | 'pass';
  data?: any;
}

export class BotService {
  private static instance: BotService;
  
  static getInstance(): BotService {
    if (!BotService.instance) {
      BotService.instance = new BotService();
    }
    return BotService.instance;
  }

  // Main bot decision making
  decideBotAction(
    botState: PlayerStateInfo,
    gameState: GameStateInfo,
    difficulty: BotDifficulty,
    availableActions: string[]
  ): BotAction {
    switch (difficulty) {
      case 'easy':
        return this.makeEasyBotDecision(botState, gameState, availableActions);
      case 'standard':
        return this.makeStandardBotDecision(botState, gameState, availableActions);
      case 'strong':
        return this.makeStrongBotDecision(botState, gameState, availableActions);
      default:
        return this.makeEasyBotDecision(botState, gameState, availableActions);
    }
  }

  // Easy bot: makes simple, sometimes suboptimal decisions
  private makeEasyBotDecision(
    botState: PlayerStateInfo,
    gameState: GameStateInfo,
    availableActions: string[]
  ): BotAction {
    // If it's bot's turn to play
    if (availableActions.includes('discard')) {
      // Simple strategy: discard the first non-joker tile
      const nonJokerTiles = botState.rack.filter(tile => !tile.isJoker && !tile.isFlower);
      if (nonJokerTiles.length > 0) {
        return {
          type: 'discard',
          data: { tileId: nonJokerTiles[0].id }
        };
      }
      // If only jokers/flowers, discard first tile
      return {
        type: 'discard',
        data: { tileId: botState.rack[0].id }
      };
    }

    // If can call a tile, sometimes do it (30% chance)
    if (availableActions.includes('call') && Math.random() < 0.3) {
      return {
        type: 'call',
        data: { meldType: 'pung' } // Default to pung
      };
    }

    // Default to pass
    return { type: 'pass' };
  }

  // Standard bot: makes reasonable decisions most of the time
  private makeStandardBotDecision(
    botState: PlayerStateInfo,
    gameState: GameStateInfo,
    availableActions: string[]
  ): BotAction {
    if (availableActions.includes('discard')) {
      // Analyze hand and discard least useful tile
      const discardChoice = this.analyzeDiscardChoice(botState, 'standard');
      return {
        type: 'discard',
        data: { tileId: discardChoice.id }
      };
    }

    // If can call a tile, evaluate if it's beneficial
    if (availableActions.includes('call')) {
      const shouldCall = this.evaluateCallDecision(botState, gameState, 'standard');
      if (shouldCall.decision) {
        return {
          type: 'call',
          data: { meldType: shouldCall.meldType }
        };
      }
    }

    return { type: 'pass' };
  }

  // Strong bot: makes optimal decisions based on advanced strategy
  private makeStrongBotDecision(
    botState: PlayerStateInfo,
    gameState: GameStateInfo,
    availableActions: string[]
  ): BotAction {
    if (availableActions.includes('discard')) {
      // Advanced hand analysis with pattern consideration
      const discardChoice = this.analyzeDiscardChoice(botState, 'strong');
      return {
        type: 'discard',
        data: { tileId: discardChoice.id }
      };
    }

    if (availableActions.includes('call')) {
      const shouldCall = this.evaluateCallDecision(botState, gameState, 'strong');
      if (shouldCall.decision) {
        return {
          type: 'call',
          data: { meldType: shouldCall.meldType }
        };
      }
    }

    return { type: 'pass' };
  }

  // Analyze which tile to discard
  private analyzeDiscardChoice(botState: PlayerStateInfo, difficulty: BotDifficulty): TileInfo {
    const rack = botState.rack;
    
    if (difficulty === 'easy') {
      // Just discard first non-joker
      const nonJokers = rack.filter(tile => !tile.isJoker && !tile.isFlower);
      return nonJokers.length > 0 ? nonJokers[0] : rack[0];
    }

    // For standard and strong, evaluate tile usefulness
    const tileScores = rack.map(tile => ({
      tile,
      score: this.evaluateTileUsefulness(tile, rack, difficulty)
    }));

    // Sort by score (lowest first) and discard least useful
    tileScores.sort((a, b) => a.score - b.score);
    return tileScores[0].tile;
  }

  // Evaluate how useful a tile is for the current hand
  private evaluateTileUsefulness(tile: TileInfo, rack: TileInfo[], difficulty: BotDifficulty): number {
    let score = 0;

    // Never discard jokers or flowers
    if (tile.isJoker) return 1000;
    if (tile.isFlower) return 900;

    // Count matching tiles in hand
    const matchingTiles = rack.filter(t => 
      t.suit === tile.suit && t.value === tile.value && t.id !== tile.id
    );
    score += matchingTiles.length * 50;

    // Consider potential sequences (for numbered suits)
    if (tile.suit === 'dots' || tile.suit === 'bams' || tile.suit === 'craks') {
      const value = Number(tile.value);
      if (!isNaN(value)) {
        // Check for adjacent tiles
        const hasAdjacent = rack.some(t => 
          t.suit === tile.suit && 
          (Number(t.value) === value - 1 || Number(t.value) === value + 1)
        );
        if (hasAdjacent) score += 20;
      }
    }

    // Strong bots consider more advanced factors
    if (difficulty === 'strong') {
      // Prefer keeping tiles that appear in common patterns
      if (tile.suit === 'dragons' || tile.suit === 'winds') {
        score += 10; // Honor tiles are often useful
      }
    }

    return score;
  }

  // Evaluate whether to call a discarded tile
  private evaluateCallDecision(
    botState: PlayerStateInfo,
    gameState: GameStateInfo,
    difficulty: BotDifficulty
  ): { decision: boolean; meldType?: string } {
    if (difficulty === 'easy') {
      // Easy bots call randomly
      return { decision: Math.random() < 0.3, meldType: 'pung' };
    }

    const lastDiscarded = gameState.lastDiscardedTile;
    if (!lastDiscarded) {
      return { decision: false };
    }

    // Count matching tiles
    const matchingTiles = botState.rack.filter(tile => 
      this.tilesMatch(tile, lastDiscarded)
    );

    // Decide based on number of matching tiles
    if (matchingTiles.length >= 3) {
      return { decision: true, meldType: 'kong' };
    } else if (matchingTiles.length >= 2) {
      // For standard and strong, be more selective
      const callProbability = difficulty === 'strong' ? 0.7 : 0.5;
      return { 
        decision: Math.random() < callProbability, 
        meldType: 'pung' 
      };
    }

    return { decision: false };
  }

  private tilesMatch(tile1: TileInfo, tile2: TileInfo): boolean {
    if (tile1.isJoker || tile2.isJoker) return true;
    return tile1.suit === tile2.suit && tile1.value === tile2.value;
  }

  // Charleston decision making
  decideBotCharlestonPass(
    botState: PlayerStateInfo,
    charlestonPhase: number,
    difficulty: BotDifficulty
  ): TileInfo[] {
    const rack = botState.rack;
    
    if (difficulty === 'easy') {
      // Just pass first 3 tiles (excluding jokers)
      const nonJokers = rack.filter(tile => !tile.isJoker && !tile.isFlower);
      return nonJokers.slice(0, 3);
    }

    // For standard and strong, analyze which tiles to pass
    const tileScores = rack
      .filter(tile => !tile.isJoker && !tile.isFlower) // Never pass jokers/flowers
      .map(tile => ({
        tile,
        score: this.evaluateTileUsefulness(tile, rack, difficulty)
      }));

    // Sort by score and pass the least useful tiles
    tileScores.sort((a, b) => a.score - b.score);
    return tileScores.slice(0, 3).map(item => item.tile);
  }

  // Generate bot response timing (for realism)
  getBotResponseDelay(difficulty: BotDifficulty): number {
    switch (difficulty) {
      case 'easy':
        return 1000 + Math.random() * 2000; // 1-3 seconds
      case 'standard':
        return 2000 + Math.random() * 3000; // 2-5 seconds
      case 'strong':
        return 3000 + Math.random() * 4000; // 3-7 seconds
      default:
        return 2000;
    }
  }
}

export const botService = BotService.getInstance();
