import { TileInfo, DailyPuzzle } from "@shared/schema";
import { gameEngine } from "./gameEngine";

export interface PuzzleData {
  initialRack: TileInfo[];
  targetPattern: string;
  allowedMoves: number;
  solution: string[];
  hint: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export class PuzzleGenerator {
  private static instance: PuzzleGenerator;
  
  static getInstance(): PuzzleGenerator {
    if (!PuzzleGenerator.instance) {
      PuzzleGenerator.instance = new PuzzleGenerator();
    }
    return PuzzleGenerator.instance;
  }

  // Generate a daily puzzle from date and salt
  generateDailyPuzzle(date: string, salt: string = "mahjong_puzzle"): PuzzleData {
    const seed = `${date}_${salt}`;
    const difficulty = this.getDifficultyForDate(date);
    
    switch (difficulty) {
      case 'easy':
        return this.generateEasyPuzzle(seed);
      case 'medium':
        return this.generateMediumPuzzle(seed);
      case 'hard':
        return this.generateHardPuzzle(seed);
      default:
        return this.generateEasyPuzzle(seed);
    }
  }

  private getDifficultyForDate(date: string): 'easy' | 'medium' | 'hard' {
    // Cycle through difficulties based on day of week
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    
    if (dayOfWeek <= 2) return 'easy';
    if (dayOfWeek <= 5) return 'medium';
    return 'hard';
  }

  // Generate an easy puzzle (simple tile swapping)
  private generateEasyPuzzle(seed: string): PuzzleData {
    const random = this.createSeededRandom(seed);
    
    // Create a hand that's almost complete
    const rack: TileInfo[] = [];
    let tileId = 0;
    
    // Add some matching pairs
    const suits = ['dots', 'bams', 'craks'] as const;
    const selectedSuit = suits[Math.floor(random() * suits.length)];
    
    // Add 3 pairs and some extra tiles
    for (let i = 1; i <= 3; i++) {
      rack.push(
        { id: `tile_${tileId++}`, suit: selectedSuit, value: i * 2, isJoker: false, isFlower: false },
        { id: `tile_${tileId++}`, suit: selectedSuit, value: i * 2, isJoker: false, isFlower: false }
      );
    }
    
    // Add some random tiles
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
    
    // Add a joker
    rack.push({
      id: `tile_${tileId++}`,
      suit: 'joker',
      value: 'J',
      isJoker: true,
      isFlower: false
    });

    return {
      initialRack: rack,
      targetPattern: "Three Pairs",
      allowedMoves: 5,
      solution: ["Discard tile 1", "Discard tile 2", "Form pair with joker"],
      hint: "Look for matching tiles and use the joker wisely",
      difficulty: 'easy'
    };
  }

  // Generate a medium puzzle (Charleston simulation)
  private generateMediumPuzzle(seed: string): PuzzleData {
    const random = this.createSeededRandom(seed);
    
    // Create a Charleston scenario
    const rack: TileInfo[] = [];
    let tileId = 0;
    
    // Mixed tiles that could benefit from Charleston exchanges
    const allSuits = ['dots', 'bams', 'craks', 'winds', 'dragons'] as const;
    
    for (let i = 0; i < 13; i++) {
      const suit = allSuits[Math.floor(random() * allSuits.length)];
      let value: string | number;
      
      if (suit === 'winds') {
        value = ['N', 'E', 'S', 'W'][Math.floor(random() * 4)];
      } else if (suit === 'dragons') {
        value = ['R', 'G', 'W'][Math.floor(random() * 3)];
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
      difficulty: 'medium'
    };
  }

  // Generate a hard puzzle (complex pattern recognition)
  private generateHardPuzzle(seed: string): PuzzleData {
    const random = this.createSeededRandom(seed);
    
    // Create a complex hand with multiple possible patterns
    const rack: TileInfo[] = [];
    let tileId = 0;
    
    // Add tiles that could form multiple different patterns
    const complexSuits = ['dots', 'bams', 'craks'] as const;
    
    // Add some consecutive numbers
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
    
    // Add some honor tiles
    for (let i = 0; i < 4; i++) {
      rack.push({
        id: `tile_${tileId++}`,
        suit: 'dragons',
        value: ['R', 'G', 'W'][Math.floor(random() * 3)],
        isJoker: false,
        isFlower: false
      });
    }
    
    // Add jokers
    for (let i = 0; i < 3; i++) {
      rack.push({
        id: `tile_${tileId++}`,
        suit: 'joker',
        value: 'J',
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
      difficulty: 'hard'
    };
  }

  // Create a seeded random number generator
  private createSeededRandom(seed: string): () => number {
    let seedNum = this.hashString(seed);
    return () => {
      seedNum = (seedNum * 9301 + 49297) % 233280;
      return seedNum / 233280;
    };
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

  // Validate puzzle solution
  validatePuzzleSolution(
    initialRack: TileInfo[],
    moves: string[],
    targetPattern: string
  ): { isCorrect: boolean; score: number; explanation: string } {
    // Simplified validation - would implement full solution checking
    const moveCount = moves.length;
    const efficiency = Math.max(0, 100 - moveCount * 5); // Fewer moves = higher score
    
    return {
      isCorrect: true, // Simplified - would check actual solution
      score: efficiency,
      explanation: `Solution completed in ${moveCount} moves. Efficiency: ${efficiency}%`
    };
  }

  // Generate hint for current puzzle state
  generateHint(
    currentRack: TileInfo[],
    targetPattern: string,
    difficulty: 'easy' | 'medium' | 'hard'
  ): string {
    switch (difficulty) {
      case 'easy':
        return "Look for pairs of matching tiles. Jokers can substitute for any tile.";
      case 'medium':
        return "Group tiles by suit and consider which combinations would be most useful.";
      case 'hard':
        return "Analyze multiple pattern possibilities and choose the path requiring fewer discards.";
      default:
        return "Study your tiles carefully and plan your moves.";
    }
  }

  // Calculate puzzle score based on completion time and moves
  calculatePuzzleScore(
    timeSeconds: number,
    moves: number,
    hintsUsed: boolean,
    difficulty: 'easy' | 'medium' | 'hard'
  ): number {
    const baseScore = { easy: 100, medium: 200, hard: 300 }[difficulty];
    const timeBonus = Math.max(0, baseScore - timeSeconds);
    const movesPenalty = moves * 5;
    const hintPenalty = hintsUsed ? 50 : 0;
    
    return Math.max(10, baseScore + timeBonus - movesPenalty - hintPenalty);
  }
}

export const puzzleGenerator = PuzzleGenerator.getInstance();
