import { useState, useEffect } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TileRack } from "@/components/game/TileRack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Trophy, 
  Clock, 
  Lightbulb, 
  RotateCcw, 
  CheckCircle, 
  Star,
  Calendar,
  Target,
  Users,
  Timer
} from "lucide-react";
import { format } from "date-fns";

export default function Puzzle() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedTiles, setSelectedTiles] = useState<any[]>([]);
  const [moves, setMoves] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Fetch today's puzzle
  const { data: puzzle, isLoading } = useQuery({
    queryKey: ["/api/puzzles/daily"],
    retry: false,
  });

  // Fetch leaderboard
  const { data: leaderboard = [] } = useQuery({
    queryKey: ["/api/puzzles", puzzle?.id, "leaderboard"],
    enabled: !!puzzle?.id,
    retry: false,
  });

  // Submit attempt mutation
  const submitAttemptMutation = useMutation({
    mutationFn: async (attemptData: any) => {
      return await apiRequest('POST', `/api/puzzles/${puzzle.id}/attempts`, attemptData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/puzzles", puzzle?.id, "leaderboard"] });
      toast({
        title: "Puzzle Complete!",
        description: `Your score: ${data.score} points`,
      });
      setIsComplete(true);
    }
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (startTime && !isComplete) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [startTime, isComplete]);

  // Initialize puzzle start
  useEffect(() => {
    if (puzzle && !startTime) {
      setStartTime(Date.now());
    }
  }, [puzzle, startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTileSelect = (tile: any) => {
    const isSelected = selectedTiles.some(t => t.id === tile.id);
    
    if (isSelected) {
      setSelectedTiles(selectedTiles.filter(t => t.id !== tile.id));
    } else if (selectedTiles.length < 3) { // Max 3 selections for most puzzles
      setSelectedTiles([...selectedTiles, tile]);
    }
  };

  const handleMove = (moveType: string) => {
    const move = `${moveType}: ${selectedTiles.length} tiles`;
    setMoves([...moves, move]);
    setSelectedTiles([]);
    
    // In a real implementation, this would update the puzzle state
    toast({
      title: "Move Recorded",
      description: move,
    });
  };

  const handleHint = () => {
    setHintsUsed(true);
    toast({
      title: "Hint",
      description: "Look for tiles that can form pairs or consecutive sequences.",
    });
  };

  const handleReset = () => {
    setSelectedTiles([]);
    setMoves([]);
    setStartTime(Date.now());
    setElapsedTime(0);
    setHintsUsed(false);
    setIsComplete(false);
  };

  const handleSubmit = () => {
    if (!puzzle || !startTime) return;

    const attemptData = {
      timeSeconds: elapsedTime,
      moves: moves.length,
      hintsUsed,
      completed: true
    };

    submitAttemptMutation.mutate(attemptData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-64 mx-auto"></div>
              <div className="h-4 bg-muted rounded w-96 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!puzzle) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">No Puzzle Available</h2>
            <p className="text-muted-foreground">
              Today's puzzle hasn't been generated yet. Please check back later.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const puzzleData = puzzle.puzzleData;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-serif font-bold mb-2">Daily Puzzle</h1>
              <p className="text-muted-foreground flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            <Badge className="text-lg px-4 py-2" variant="secondary">
              {puzzleData?.difficulty || 'Medium'}
            </Badge>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <Timer className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{formatTime(elapsedTime)}</div>
              <div className="text-xs text-muted-foreground">Time</div>
            </Card>
            
            <Card className="p-4 text-center">
              <Target className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{moves.length}</div>
              <div className="text-xs text-muted-foreground">Moves</div>
            </Card>
            
            <Card className="p-4 text-center">
              <Lightbulb className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{hintsUsed ? '1' : '0'}</div>
              <div className="text-xs text-muted-foreground">Hints</div>
            </Card>
            
            <Card className="p-4 text-center">
              <Star className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">--</div>
              <div className="text-xs text-muted-foreground">Score</div>
            </Card>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Puzzle Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Objective */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <Target className="h-5 w-5 mr-2 text-primary" />
                Objective: {puzzleData?.targetPattern || 'Complete the Hand'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {puzzleData?.hint || 'Organize your tiles to create the optimal winning hand.'}
              </p>
              <div className="text-sm text-muted-foreground">
                Maximum moves allowed: <span className="font-semibold">{puzzleData?.allowedMoves || 12}</span>
              </div>
            </Card>

            {/* Tile Rack */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Your Tiles</h3>
              <TileRack
                tiles={puzzleData?.initialRack || []}
                selectedTiles={selectedTiles}
                onTileSelect={handleTileSelect}
                canInteract={!isComplete}
                maxSelection={3}
                className="min-h-32"
              />
            </div>

            {/* Actions */}
            <Card className="p-4">
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => handleMove('Group')}
                  disabled={selectedTiles.length === 0 || isComplete}
                  data-testid="group-tiles-button"
                >
                  Group Selected
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => handleMove('Discard')}
                  disabled={selectedTiles.length === 0 || isComplete}
                  data-testid="discard-tiles-button"
                >
                  Discard Selected
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleHint}
                  disabled={hintsUsed || isComplete}
                  data-testid="get-hint-button"
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Get Hint
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleReset}
                  disabled={isComplete}
                  data-testid="reset-puzzle-button"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>

                {moves.length > 0 && !isComplete && (
                  <Button 
                    className="ml-auto"
                    onClick={handleSubmit}
                    disabled={submitAttemptMutation.isPending}
                    data-testid="submit-solution-button"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Solution
                  </Button>
                )}
              </div>

              {selectedTiles.length > 0 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {selectedTiles.length} tile{selectedTiles.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}
            </Card>

            {/* Move History */}
            {moves.length > 0 && (
              <Card className="p-4">
                <h4 className="font-medium mb-3">Move History</h4>
                <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                  {moves.map((move, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span>{index + 1}. {move}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Completion Status */}
            {isComplete && (
              <Card className="p-6 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                    Puzzle Complete!
                  </h3>
                  <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
                    <p>Time: {formatTime(elapsedTime)}</p>
                    <p>Moves: {moves.length}</p>
                    <p>Hints: {hintsUsed ? '1' : '0'}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Today's Leaderboard */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-accent" />
                Today's Leaders
              </h3>
              
              {leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {leaderboard.slice(0, 5).map((entry: any, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-sm">
                          {entry.user?.firstName || 'Anonymous'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(entry.timeSeconds)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Be the first to solve today's puzzle!</p>
                </div>
              )}
            </Card>

            {/* Tips */}
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
              <h3 className="font-semibold mb-3">Puzzle Tips</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-start">
                  <span className="text-accent mr-2">•</span>
                  Look for matching tiles that can form pairs
                </p>
                <p className="flex items-start">
                  <span className="text-accent mr-2">•</span>
                  Consider consecutive number sequences
                </p>
                <p className="flex items-start">
                  <span className="text-accent mr-2">•</span>
                  Use jokers strategically for difficult patterns
                </p>
                <p className="flex items-start">
                  <span className="text-accent mr-2">•</span>
                  Fewer moves = higher score
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
