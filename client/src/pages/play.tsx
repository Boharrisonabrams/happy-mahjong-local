import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Plus, Users, Lock, Globe, Dices, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

type GameTable = {
  id: string;
  name: string;
  hostUserId: string;
  isPrivate: boolean;
  inviteCode?: string;
  maxPlayers: number;
  gameMode: string;
  botDifficulty?: string;
  status: string;
  currentGameId?: string;
  settings?: any;
  createdAt: string;
  updatedAt: string;
  host?: {
    id: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
  participants?: Array<{
    id: string;
    seatPosition: number;
    isBot: boolean;
    userId?: string;
    user?: {
      id: string;
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string;
    };
  }>;
};

export default function PlayPage() {
  const [, setLocation] = useLocation();
  const [createTableOpen, setCreateTableOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [selectedGameMode, setSelectedGameMode] = useState('single-player');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['/api/tables'],
  });

  const createTableMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      isPrivate: boolean;
      gameMode: string;
      botDifficulty?: string | null;
      seatBotSettings?: any;
    }) => {
      console.log('Table creation data:', data);
      const response = await apiRequest('POST', '/api/tables', data);
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create table: ${error}`);
      }
      
      const result = await response.json();
      console.log('Table created successfully:', result);
      
      if (!result.id) {
        console.error('Table creation response missing ID:', result);
        throw new Error('Table creation failed - no ID returned');
      }
      
      return result;
    },
    onSuccess: (table) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      setCreateTableOpen(false);
      toast({
        title: "Table Created",
        description: `Table "${table.name}" has been created successfully.`,
      });
      // Navigate to the table
      setLocation(`/table/${table.id}`);
    },
    onError: (error) => {
      console.error('Table creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create table. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleCreateTable = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const gameMode = formData.get('gameMode') as string;
    
    let seatBotSettings = null;
    let botCount = 0;
    let botDifficulty = null;
    
    if (gameMode === 'single-player') {
      seatBotSettings = {
        1: formData.get('eastBot') as string,   // East position
        2: formData.get('northBot') as string,  // North position  
        3: formData.get('westBot') as string,   // West position
      };
      botDifficulty = 'standard'; // Default for single player
    } else if (gameMode === 'multiplayer') {
      botCount = parseInt(formData.get('botCount') as string) || 0;
      botDifficulty = botCount > 0 ? formData.get('multiplayerBotDifficulty') as string : null;
    }
    
    const data = {
      name: formData.get('name') as string,
      isPrivate: formData.get('isPrivate') === 'on',
      gameMode: gameMode,
      botDifficulty: botDifficulty,
      botCount: botCount,
      seatBotSettings: seatBotSettings,
    };
    createTableMutation.mutate(data);
  };

  const handleJoinByCode = () => {
    if (!joinCodeInput.trim()) return;
    
    setLocation(`/table/join/${joinCodeInput.trim()}`);
  };

  const handleJoinTable = (tableId: string) => {
    setLocation(`/table/${tableId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading tables...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-4">American Mahjong</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join a table or create your own to start playing with friends or practice against AI opponents
          </p>
        </div>

        {/* Quick Actions */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="bg-primary/10 rounded-t-lg">
              <CardTitle className="flex items-center">
                <Dices className="w-6 h-6 mr-2" />
                Quick Start
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Quick Join */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Join with Code</h3>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter invite code"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value)}
                      className="w-32"
                      data-testid="join-code-input"
                    />
                    <Button 
                      onClick={handleJoinByCode}
                      disabled={!joinCodeInput.trim()}
                      data-testid="join-by-code-button"
                    >
                      Join
                    </Button>
                  </div>
                </div>

                {/* Create Table */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Start New Game</h3>
                  <Dialog open={createTableOpen} onOpenChange={setCreateTableOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-primary text-primary-foreground" data-testid="create-table-button">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Table
                      </Button>
                    </DialogTrigger>
                    
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Table</DialogTitle>
                      </DialogHeader>
                      
                      <form onSubmit={handleCreateTable} className="space-y-4">
                        <div>
                          <Label htmlFor="name">Table Name</Label>
                          <Input
                            id="name"
                            name="name"
                            placeholder="Enter table name"
                            required
                            data-testid="table-name-input"
                          />
                        </div>

                        <div>
                          <Label htmlFor="gameMode">Game Mode</Label>
                          <Select 
                            name="gameMode" 
                            defaultValue="single-player"
                            onValueChange={setSelectedGameMode}
                          >
                            <SelectTrigger data-testid="game-mode-select">
                              <SelectValue placeholder="Select game mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="single-player">Single Player (vs Bots)</SelectItem>
                              <SelectItem value="multiplayer">Multiplayer (vs Humans)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch id="isPrivate" name="isPrivate" />
                          <Label htmlFor="isPrivate">Private Table</Label>
                        </div>

                        {selectedGameMode === 'single-player' && (
                          <div id="bot-config" className="conditional-form-field">
                            <Label>Bot Configuration (Single Player)</Label>
                            <div className="space-y-3 mt-2">
                              <div className="grid grid-cols-3 gap-3">
                                {/* East (Right) */}
                                <div className="text-center">
                                  <Label htmlFor="eastBot" className="text-xs">East (Right)</Label>
                                  <Select name="eastBot" defaultValue="standard">
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="easy">Easy</SelectItem>
                                      <SelectItem value="standard">Standard</SelectItem>
                                      <SelectItem value="strong">Strong</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {/* North (Top) */}
                                <div className="text-center">
                                  <Label htmlFor="northBot" className="text-xs">North (Top)</Label>
                                  <Select name="northBot" defaultValue="standard">
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="easy">Easy</SelectItem>
                                      <SelectItem value="standard">Standard</SelectItem>
                                      <SelectItem value="strong">Strong</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {/* West (Left) */}
                                <div className="text-center">
                                  <Label htmlFor="westBot" className="text-xs">West (Left)</Label>
                                  <Select name="westBot" defaultValue="standard">
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="easy">Easy</SelectItem>
                                      <SelectItem value="standard">Standard</SelectItem>
                                      <SelectItem value="strong">Strong</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              <div className="text-center">
                                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                  You (South)
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedGameMode === 'multiplayer' && (
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor="botCount">Number of Bots</Label>
                              <Select name="botCount" defaultValue="0">
                                <SelectTrigger data-testid="bot-count-select">
                                  <SelectValue placeholder="Select number of bots" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">No Bots (4 human players)</SelectItem>
                                  <SelectItem value="1">1 Bot (3 humans + 1 bot)</SelectItem>
                                  <SelectItem value="2">2 Bots (2 humans + 2 bots)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label htmlFor="multiplayerBotDifficulty">Bot Difficulty</Label>
                              <Select name="multiplayerBotDifficulty" defaultValue="standard">
                                <SelectTrigger>
                                  <SelectValue placeholder="Select bot difficulty" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="easy">Easy</SelectItem>
                                  <SelectItem value="standard">Standard</SelectItem>
                                  <SelectItem value="strong">Strong</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setCreateTableOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createTableMutation.isPending}
                            data-testid="create-table-submit"
                          >
                            {createTableMutation.isPending && (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Create Table
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tables List */}
        <Card className="shadow-xl overflow-hidden">
          <div className="bg-muted px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="font-semibold">Active Tables</h3>
              <Badge variant="outline" className="bg-background">
                {tables.length} table{tables.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>

          <CardContent className="p-0">
            {tables.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Active Tables</h3>
                <p className="text-muted-foreground mb-6">Be the first to create a table and start playing!</p>
                <Button 
                  onClick={() => setCreateTableOpen(true)}
                  data-testid="create-first-table-button"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Table
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {tables.map((table: GameTable) => (
                  <div key={table.id} className="p-6 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-lg">{table.name}</h4>
                          <div className="flex space-x-2">
                            <Badge variant={table.status === 'playing' ? 'default' : 'secondary'}>
                              {table.status}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {table.gameMode?.replace('-', ' ') || 'Standard'}
                            </Badge>
                            {table.isPrivate && (
                              <Badge variant="secondary" className="flex items-center">
                                <Lock className="w-3 h-3 mr-1" />
                                Private
                              </Badge>
                            )}
                            {!table.isPrivate && (
                              <Badge variant="outline" className="flex items-center">
                                <Globe className="w-3 h-3 mr-1" />
                                Public
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {table.participants?.length || 0}/{table.maxPlayers} players
                          </span>
                          <span>Host: {table.host?.firstName || 'Unknown'}</span>
                          {table.botDifficulty && (
                            <span>Bot Level: {table.botDifficulty}</span>
                          )}
                        </div>

                        {/* Players preview */}
                        {table.participants && table.participants.length > 0 && (
                          <div className="flex -space-x-2 mt-3">
                            {table.participants.slice(0, 4).map((participant, index) => (
                              <Avatar key={participant.id} className="w-8 h-8 border-2 border-background">
                                <AvatarImage src={participant.user?.profileImageUrl || ''} />
                                <AvatarFallback className="text-xs">
                                  {participant.isBot ? 'AI' : participant.user?.firstName?.[0] || 'P'}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-3">
                        {table.inviteCode && (
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Invite Code</p>
                            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                              {table.inviteCode}
                            </code>
                          </div>
                        )}
                        
                        <Button 
                          onClick={() => handleJoinTable(table.id)}
                          disabled={table.status === 'finished' || (table.participants?.length || 0) >= table.maxPlayers}
                          data-testid={`join-table-${table.id}`}
                        >
                          {table.status === 'playing' ? 'Watch' : 'Join'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}