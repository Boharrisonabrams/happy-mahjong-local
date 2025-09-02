import { TileInfo, MeldInfo, HandPattern } from "@shared/schema";

export interface ValidationResult {
  isValid: boolean;
  matchedPattern?: HandPattern;
  explanation: string;
  missingTiles?: TileInfo[];
}

export interface HandAnalysis {
  suggestedPatterns: Array<{
    pattern: HandPattern;
    likelihood: number;
    explanation: string;
    neededTiles: TileInfo[];
  }>;
  currentScore: number;
}

export class PatternValidator {
  private static instance: PatternValidator;
  
  static getInstance(): PatternValidator {
    if (!PatternValidator.instance) {
      PatternValidator.instance = new PatternValidator();
    }
    return PatternValidator.instance;
  }

  // Validate if a hand matches winning patterns
  validateWinningHand(
    rack: TileInfo[],
    melds: MeldInfo[],
    flowers: TileInfo[],
    patterns: HandPattern[]
  ): ValidationResult {
    // Check each pattern against the current hand
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
  private checkHandAgainstPattern(
    rack: TileInfo[],
    melds: MeldInfo[],
    flowers: TileInfo[],
    pattern: HandPattern
  ): ValidationResult {
    try {
      const patternSets = pattern.patternSets as any[];
      const allTiles = [...rack, ...melds.flatMap(m => m.tiles)];
      
      // Check flower requirements
      if (pattern.flowersUsage === 'required' && flowers.length === 0) {
        return {
          isValid: false,
          explanation: `Pattern "${pattern.name}" requires flowers`
        };
      }

      // Check if hand is concealed when required
      if (pattern.concealedOnly && melds.some(m => !m.isConcealed)) {
        return {
          isValid: false,
          explanation: `Pattern "${pattern.name}" must be entirely concealed`
        };
      }

      // Check joker usage
      const jokerCount = allTiles.filter(t => t.isJoker).length;
      if (!pattern.jokersAllowed && jokerCount > 0) {
        return {
          isValid: false,
          explanation: `Pattern "${pattern.name}" does not allow jokers`
        };
      }

      // Check if we have the right number of tiles (14 total for winning hand)
      if (allTiles.length !== 14) {
        return {
          isValid: false,
          explanation: "Winning hand must contain exactly 14 tiles"
        };
      }

      // Validate each set in the pattern
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
  private validatePatternSets(
    tiles: TileInfo[],
    patternSets: any[],
    jokersAllowed: boolean
  ): { isValid: boolean; explanation?: string } {
    const remainingTiles = [...tiles];
    
    for (const setDef of patternSets) {
      const setResult = this.findMatchingSet(remainingTiles, setDef, jokersAllowed);
      if (!setResult.found) {
        return {
          isValid: false,
          explanation: `Could not find required set: ${setDef.type} of ${setDef.tileSet}`
        };
      }
      
      // Remove used tiles
      for (const tile of setResult.usedTiles) {
        const index = remainingTiles.findIndex(t => t.id === tile.id);
        if (index !== -1) {
          remainingTiles.splice(index, 1);
        }
      }
    }

    // All tiles should be used
    if (remainingTiles.length > 0) {
      return {
        isValid: false,
        explanation: `${remainingTiles.length} tiles do not fit the pattern`
      };
    }

    return { isValid: true };
  }

  // Find a matching set of tiles for a pattern requirement
  private findMatchingSet(
    tiles: TileInfo[],
    setDef: any,
    jokersAllowed: boolean
  ): { found: boolean; usedTiles: TileInfo[] } {
    const setType = setDef.type; // pung, kong, pair, etc.
    const tileSet = setDef.tileSet; // evens_one_suit, dragons_any, etc.
    
    // This is a simplified implementation
    // In a real game, this would handle complex pattern matching
    
    switch (setType) {
      case 'pair':
        return this.findPair(tiles, tileSet, jokersAllowed);
      case 'pung':
        return this.findPung(tiles, tileSet, jokersAllowed);
      case 'kong':
        return this.findKong(tiles, tileSet, jokersAllowed);
      case 'quint':
        return this.findQuint(tiles, tileSet, jokersAllowed);
      default:
        return { found: false, usedTiles: [] };
    }
  }

  private findPair(tiles: TileInfo[], tileSet: string, jokersAllowed: boolean): { found: boolean; usedTiles: TileInfo[] } {
    // Look for 2 matching tiles
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        if (this.tilesMatchForSet(tiles[i], tiles[j], tileSet)) {
          return { found: true, usedTiles: [tiles[i], tiles[j]] };
        }
      }
    }
    
    // If jokers allowed, look for 1 tile + joker
    if (jokersAllowed) {
      const jokers = tiles.filter(t => t.isJoker);
      const nonJokers = tiles.filter(t => !t.isJoker && this.tileMatchesSet(t, tileSet));
      
      if (jokers.length >= 1 && nonJokers.length >= 1) {
        return { found: true, usedTiles: [nonJokers[0], jokers[0]] };
      }
      
      if (jokers.length >= 2) {
        return { found: true, usedTiles: [jokers[0], jokers[1]] };
      }
    }
    
    return { found: false, usedTiles: [] };
  }

  private findPung(tiles: TileInfo[], tileSet: string, jokersAllowed: boolean): { found: boolean; usedTiles: TileInfo[] } {
    // Look for 3 matching tiles
    const tileGroups = this.groupTilesByValue(tiles.filter(t => this.tileMatchesSet(t, tileSet)));
    
    for (const group of tileGroups) {
      if (group.length >= 3) {
        return { found: true, usedTiles: group.slice(0, 3) };
      }
      
      // With jokers
      if (jokersAllowed) {
        const jokersNeeded = 3 - group.length;
        const availableJokers = tiles.filter(t => t.isJoker);
        
        if (jokersNeeded > 0 && availableJokers.length >= jokersNeeded) {
          const usedTiles = [...group, ...availableJokers.slice(0, jokersNeeded)];
          return { found: true, usedTiles };
        }
      }
    }
    
    return { found: false, usedTiles: [] };
  }

  private findKong(tiles: TileInfo[], tileSet: string, jokersAllowed: boolean): { found: boolean; usedTiles: TileInfo[] } {
    // Similar to pung but needs 4 tiles
    const tileGroups = this.groupTilesByValue(tiles.filter(t => this.tileMatchesSet(t, tileSet)));
    
    for (const group of tileGroups) {
      if (group.length >= 4) {
        return { found: true, usedTiles: group.slice(0, 4) };
      }
      
      if (jokersAllowed) {
        const jokersNeeded = 4 - group.length;
        const availableJokers = tiles.filter(t => t.isJoker);
        
        if (jokersNeeded > 0 && availableJokers.length >= jokersNeeded) {
          const usedTiles = [...group, ...availableJokers.slice(0, jokersNeeded)];
          return { found: true, usedTiles };
        }
      }
    }
    
    return { found: false, usedTiles: [] };
  }

  private findQuint(tiles: TileInfo[], tileSet: string, jokersAllowed: boolean): { found: boolean; usedTiles: TileInfo[] } {
    // Needs 5 tiles, typically requires jokers
    const tileGroups = this.groupTilesByValue(tiles.filter(t => this.tileMatchesSet(t, tileSet)));
    
    for (const group of tileGroups) {
      if (group.length >= 5) {
        return { found: true, usedTiles: group.slice(0, 5) };
      }
      
      if (jokersAllowed) {
        const jokersNeeded = 5 - group.length;
        const availableJokers = tiles.filter(t => t.isJoker);
        
        if (jokersNeeded > 0 && availableJokers.length >= jokersNeeded && group.length >= 1) {
          const usedTiles = [...group, ...availableJokers.slice(0, jokersNeeded)];
          return { found: true, usedTiles };
        }
      }
    }
    
    return { found: false, usedTiles: [] };
  }

  private groupTilesByValue(tiles: TileInfo[]): TileInfo[][] {
    const groups: { [key: string]: TileInfo[] } = {};
    
    for (const tile of tiles) {
      const key = `${tile.suit}_${tile.value}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(tile);
    }
    
    return Object.values(groups);
  }

  private tilesMatchForSet(tile1: TileInfo, tile2: TileInfo, tileSet: string): boolean {
    if (tile1.isJoker || tile2.isJoker) return true;
    
    // Simplified matching logic - would be more complex in real implementation
    return tile1.suit === tile2.suit && tile1.value === tile2.value;
  }

  private tileMatchesSet(tile: TileInfo, tileSet: string): boolean {
    if (tile.isJoker) return true;
    
    // Simplified set matching - would parse actual set definitions
    switch (tileSet) {
      case 'dragons_any':
        return tile.suit === 'dragons';
      case 'winds_any':
        return tile.suit === 'winds';
      case 'evens_one_suit':
        return (tile.suit === 'dots' || tile.suit === 'bams' || tile.suit === 'craks') &&
               typeof tile.value === 'number' && tile.value % 2 === 0;
      default:
        return true; // Simplified - accept any tile
    }
  }

  // Analyze hand for suggested patterns
  analyzeHandForSuggestions(
    rack: TileInfo[],
    melds: MeldInfo[],
    flowers: TileInfo[],
    patterns: HandPattern[]
  ): HandAnalysis {
    const suggestions = patterns.map(pattern => {
      const progress = this.calculatePatternProgress(rack, melds, flowers, pattern);
      return {
        pattern,
        likelihood: progress.likelihood,
        explanation: progress.explanation,
        neededTiles: progress.neededTiles
      };
    });

    // Sort by likelihood
    suggestions.sort((a, b) => b.likelihood - a.likelihood);

    return {
      suggestedPatterns: suggestions.slice(0, 3), // Top 3 suggestions
      currentScore: this.calculateCurrentScore(rack, melds, flowers)
    };
  }

  private calculatePatternProgress(
    rack: TileInfo[],
    melds: MeldInfo[],
    flowers: TileInfo[],
    pattern: HandPattern
  ): { likelihood: number; explanation: string; neededTiles: TileInfo[] } {
    // Simplified calculation - would be more sophisticated in real implementation
    const allTiles = [...rack, ...melds.flatMap(m => m.tiles)];
    const completeness = allTiles.length / 14; // Simple completeness measure
    
    return {
      likelihood: completeness * 100,
      explanation: `${Math.round(completeness * 100)}% complete for ${pattern.name}`,
      neededTiles: [] // Would calculate actual needed tiles
    };
  }

  private calculateCurrentScore(rack: TileInfo[], melds: MeldInfo[], flowers: TileInfo[]): number {
    // Basic scoring - would implement full scoring rules
    let score = 0;
    
    // Points for melds
    score += melds.length * 5;
    
    // Points for flowers
    score += flowers.length * 2;
    
    // Points for special tiles
    const specialTiles = rack.filter(t => t.suit === 'dragons' || t.suit === 'winds');
    score += specialTiles.length * 1;
    
    return score;
  }
}

export const patternValidator = PatternValidator.getInstance();
