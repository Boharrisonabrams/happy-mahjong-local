import { TileInfo, MeldInfo, GameStateInfo, PlayerStateInfo } from "@shared/schema";

export class GameEngine {
  private static instance: GameEngine;
  
  static getInstance(): GameEngine {
    if (!GameEngine.instance) {
      GameEngine.instance = new GameEngine();
    }
    return GameEngine.instance;
  }

  // Tile generation and shuffling
  generateFullTileset(): TileInfo[] {
    const tiles: TileInfo[] = [];
    let tileId = 0;

    // Dots (1-9, 4 of each)
    for (let value = 1; value <= 9; value++) {
      for (let i = 0; i < 4; i++) {
        tiles.push({
          id: `tile_${tileId++}`,
          suit: 'dots',
          value,
          isJoker: false,
          isFlower: false,
        });
      }
    }

    // Bams (1-9, 4 of each)
    for (let value = 1; value <= 9; value++) {
      for (let i = 0; i < 4; i++) {
        tiles.push({
          id: `tile_${tileId++}`,
          suit: 'bams',
          value,
          isJoker: false,
          isFlower: false,
        });
      }
    }

    // Craks (1-9, 4 of each)
    for (let value = 1; value <= 9; value++) {
      for (let i = 0; i < 4; i++) {
        tiles.push({
          id: `tile_${tileId++}`,
          suit: 'craks',
          value,
          isJoker: false,
          isFlower: false,
        });
      }
    }

    // Winds (N, E, S, W, 4 of each)
    const winds = ['N', 'E', 'S', 'W'];
    for (const wind of winds) {
      for (let i = 0; i < 4; i++) {
        tiles.push({
          id: `tile_${tileId++}`,
          suit: 'winds',
          value: wind,
          isJoker: false,
          isFlower: false,
        });
      }
    }

    // Dragons (Red, Green, White, 4 of each)
    const dragons = ['R', 'G', 'W'];
    for (const dragon of dragons) {
      for (let i = 0; i < 4; i++) {
        tiles.push({
          id: `tile_${tileId++}`,
          suit: 'dragons',
          value: dragon,
          isJoker: false,
          isFlower: false,
        });
      }
    }

    // Flowers (8 unique tiles)
    for (let value = 1; value <= 8; value++) {
      tiles.push({
        id: `tile_${tileId++}`,
        suit: 'flowers',
        value,
        isJoker: false,
        isFlower: true,
      });
    }

    // Jokers (8 tiles)
    for (let i = 0; i < 8; i++) {
      tiles.push({
        id: `tile_${tileId++}`,
        suit: 'joker',
        value: 'J',
        isJoker: true,
        isFlower: false,
      });
    }

    return tiles;
  }

  shuffleTiles(tiles: TileInfo[], seed: string): TileInfo[] {
    // Seeded random number generator
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

  private hashString(str: string | undefined): number {
    // Handle undefined/null seeds
    if (!str) {
      str = `${Date.now()}_${Math.random()}`;
    }
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Deal initial hands
  dealInitialHands(shuffledTiles: TileInfo[]): {
    playerHands: TileInfo[][];
    wall: TileInfo[];
  } {
    const playerHands: TileInfo[][] = [[], [], [], []];
    let tileIndex = 0;

    // Deal 13 tiles to each player (starting hands)
    for (let round = 0; round < 13; round++) {
      for (let player = 0; player < 4; player++) {
        if (tileIndex < shuffledTiles.length) {
          playerHands[player].push(shuffledTiles[tileIndex++]);
        }
      }
    }

    // Remaining tiles form the wall
    const wall = shuffledTiles.slice(tileIndex);
    
    return { playerHands, wall };
  }

  // Charleston phase logic
  getCharlestonPasses(playerHands: TileInfo[][], phase: number): { [seatPosition: number]: TileInfo[] } {
    // In Charleston, players pass 3 tiles
    // Phase 1: Right, Phase 2: Across, Phase 3: Left, Phase 4: Opposite (optional)
    const passes: { [seatPosition: number]: TileInfo[] } = {};
    
    for (let seat = 0; seat < 4; seat++) {
      // For simplicity, pass the first 3 tiles (in real game, player selects)
      passes[seat] = playerHands[seat].slice(0, 3);
    }
    
    return passes;
  }

  executeCharlestonPass(
    playerHands: TileInfo[][], 
    passes: { [seatPosition: number]: TileInfo[] }, 
    phase: number
  ): TileInfo[][] {
    const newHands = playerHands.map(hand => [...hand]);
    
    // Remove passed tiles from each player
    for (let seat = 0; seat < 4; seat++) {
      const passedTiles = passes[seat];
      for (const tile of passedTiles) {
        const index = newHands[seat].findIndex(t => t.id === tile.id);
        if (index !== -1) {
          newHands[seat].splice(index, 1);
        }
      }
    }

    // Add received tiles to each player
    for (let seat = 0; seat < 4; seat++) {
      let receivedFrom: number;
      
      switch (phase) {
        case 1: // Right pass - receive from left
          receivedFrom = (seat + 3) % 4;
          break;
        case 2: // Across pass - receive from across
          receivedFrom = (seat + 2) % 4;
          break;
        case 3: // Left pass - receive from right
          receivedFrom = (seat + 1) % 4;
          break;
        default: // Opposite pass
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
  canDrawTile(gameState: GameStateInfo, playerSeat: number): boolean {
    return gameState.phase === 'playing' && 
           gameState.currentPlayerIndex === playerSeat;
  }

  canDiscardTile(gameState: GameStateInfo, playerSeat: number, tile: TileInfo): boolean {
    return gameState.phase === 'playing' && 
           gameState.currentPlayerIndex === playerSeat;
  }

  canCallTile(
    gameState: GameStateInfo, 
    playerSeat: number, 
    discardedTile: TileInfo, 
    playerState: PlayerStateInfo
  ): { canCall: boolean; possibleCalls: string[] } {
    if (gameState.phase !== 'playing' || gameState.currentPlayerIndex === playerSeat) {
      return { canCall: false, possibleCalls: [] };
    }

    const possibleCalls: string[] = [];
    const rack = playerState.rack;

    // Check for pung (3 of a kind)
    const matchingTiles = rack.filter(tile => 
      this.tilesMatch(tile, discardedTile) || tile.isJoker
    );
    
    if (matchingTiles.length >= 2) {
      possibleCalls.push('pung');
    }

    // Check for kong (4 of a kind)
    if (matchingTiles.length >= 3) {
      possibleCalls.push('kong');
    }

    // Check for quint (5 of a kind, requires jokers)
    if (matchingTiles.length >= 4) {
      possibleCalls.push('quint');
    }

    return {
      canCall: possibleCalls.length > 0,
      possibleCalls
    };
  }

  private tilesMatch(tile1: TileInfo, tile2: TileInfo): boolean {
    if (tile1.isJoker || tile2.isJoker) return true;
    return tile1.suit === tile2.suit && tile1.value === tile2.value;
  }

  // Meld creation
  createMeld(
    tiles: TileInfo[], 
    meldType: 'pung' | 'kong' | 'quint' | 'pair', 
    calledFrom?: number
  ): MeldInfo {
    return {
      type: meldType,
      tiles,
      isConcealed: calledFrom === undefined,
      calledFrom
    };
  }

  // Check for winning hand
  canDeclareWin(playerState: PlayerStateInfo, patterns: any[]): boolean {
    // This would implement pattern matching against available hand patterns
    // For now, return false as a placeholder
    return false;
  }

  // Tile manipulation utilities
  removeTileFromRack(rack: TileInfo[], tileId: string): TileInfo[] {
    return rack.filter(tile => tile.id !== tileId);
  }

  addTileToRack(rack: TileInfo[], tile: TileInfo): TileInfo[] {
    return [...rack, tile];
  }

  sortRack(rack: TileInfo[]): TileInfo[] {
    return rack.sort((a, b) => {
      // Sort by suit first, then by value
      const suitOrder = { dots: 0, bams: 1, craks: 2, winds: 3, dragons: 4, flowers: 5, joker: 6 };
      const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
      if (suitDiff !== 0) return suitDiff;
      
      // Sort by value within suit
      if (typeof a.value === 'number' && typeof b.value === 'number') {
        return a.value - b.value;
      }
      
      return String(a.value).localeCompare(String(b.value));
    });
  }

  // Game state utilities
  getNextPlayer(currentPlayer: number): number {
    return (currentPlayer + 1) % 4;
  }

  isGameComplete(gameState: GameStateInfo): boolean {
    return gameState.phase === 'finished';
  }
}

export const gameEngine = GameEngine.getInstance();
