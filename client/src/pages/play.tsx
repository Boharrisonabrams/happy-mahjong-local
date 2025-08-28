import { useState } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Eye, Bot, Lock, Globe, Loader2, Clock } from "lucide-react";
import { Link } from "wouter";

export default function Play() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createTableOpen, setCreateTableOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");

  // Fetch active tables
  const { data: tables = [], isLoading } = useQuery({
    queryKey: ["/api/tables"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Create table mutation
  const createTableMutation = useMutation({
    mutationFn: async (tableData: any) => {
      return await apiRequest('POST', '/api/tables', tableData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      setCreateTableOpen(false);
      toast({
        title: "Table Created",
        description: "Your table has been created successfully!",
      });
      // Redirect to the new table
      console.log('Table created successfully:', data);
      if (data && data.id) {
        window.location.href = `/table/${data.id}`;
      } else {
        console.error('Table creation response missing ID:', data);
        toast({
          title: "Error",
          description: "Table was created but navigation failed. Please refresh the page.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create table. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleCreateTable = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      isPrivate: formData.get('isPrivate') === 'on',
      botDifficulty: formData.get('botDifficulty') === 'none' ? null : formData.get('botDifficulty') as string,
    };
    createTableMutation.mutate(data);
  };

  const handleJoinByCode = () => {
    if (!joinCodeInput.trim()) return;
    
    // Find table by invite code
    const table = tables.find((t: any) => t.inviteCode === joinCodeInput.toUpperCase());
    if (table) {
      window.location.href = `/table/${table.id}`;
    } else {
      toast({
        title: "Invalid Code",
        description: "No table found with that invite code.",
        variant: "destructive",
      });
    }
  };

  const getTableStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'playing':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'finished':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const renderPlayerSlots = (table: any) => {
    const players = table.participants || [];
    const slots = Array.from({ length: 4 }, (_, i) => players[i] || null);

    return (
      <div className="flex -space-x-2">
        {slots.map((player, index) => (
          <div key={index}>
            {player ? (
              <Avatar className="w-10 h-10 border-2 border-background">
                <AvatarImage src={player.user?.profileImageUrl || ''} />
                <AvatarFallback className={player.isBot ? 'bg-gray-500' : 'bg-primary'}>
                  {player.isBot ? <Bot className="w-4 h-4" /> : player.user?.firstName?.[0] || 'P'}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-10 h-10 bg-muted border-2 border-dashed border-border rounded-full flex items-center justify-center">
                <Plus className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2">Game Lobby</h1>
            <p className="text-muted-foreground">Find a table or create your own</p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Join by Code */}
            <div className="flex items-center space-x-2">
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

            {/* Create Table */}
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

                  <div className="flex items-center space-x-2">
                    <Switch id="isPrivate" name="isPrivate" />
                    <Label htmlFor="isPrivate">Private Table</Label>
                  </div>

                  <div>
                    <Label htmlFor="botDifficulty">Fill Empty Seats With</Label>
                    <Select name="botDifficulty">
                      <SelectTrigger data-testid="bot-difficulty-select">
                        <SelectValue placeholder="Select bot difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Bots</SelectItem>
                        <SelectItem value="easy">Easy Bots</SelectItem>
                        <SelectItem value="standard">Standard Bots</SelectItem>
                        <SelectItem value="strong">Strong Bots</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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

        {/* Tables List */}
        <Card className="shadow-xl overflow-hidden">
          <div className="bg-muted px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="font-semibold">Active Tables</h3>
              <Badge className="bg-primary text-primary-foreground">
                {tables.length} Available
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <Clock className="w-4 h-4 inline mr-1" />
              Refreshes every 5s
            </div>
          </div>

          <div className="divide-y divide-border">
            {isLoading ? (
              <div className="px-6 py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading tables...</p>
              </div>
            ) : tables.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Tables</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to create a table and start playing!
                </p>
                <Button onClick={() => setCreateTableOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Table
                </Button>
              </div>
            ) : (
              tables.map((table: any) => (
                <div 
                  key={table.id}
                  className="px-6 py-4 hover:bg-muted/30 transition-colors"
                  data-testid={`table-${table.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Player Slots */}
                      {renderPlayerSlots(table)}

                      {/* Table Info */}
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{table.name}</h4>
                          {table.isPrivate && (
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          )}
                          {!table.isPrivate && (
                            <Globe className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {(table.participants || []).length}/4 players 
                          {table.status === 'playing' && ' • Game in progress'}
                          {table.status === 'waiting' && ' • Waiting for players'}
                        </p>
                      </div>
                    </div>

                    {/* Table Actions */}
                    <div className="flex items-center space-x-4">
                      {/* Tags */}
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className={getTableStatusColor(table.status)}>
                          {table.status}
                        </Badge>
                        
                        {table.botDifficulty && (
                          <Badge variant="outline" className="text-xs">
                            {table.botDifficulty} AI
                          </Badge>
                        )}

                        {table.isPrivate ? (
                          <Badge variant="outline" className="text-xs">
                            Private
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                            Public
                          </Badge>
                        )}
                      </div>

                      {/* Action Button */}
                      {table.status === 'waiting' && (table.participants || []).length < 4 ? (
                        <Link href={`/table/${table.id}`}>
                          <Button data-testid={`join-table-${table.id}`}>
                            Join
                          </Button>
                        </Link>
                      ) : table.status === 'playing' ? (
                        <Link href={`/table/${table.id}`}>
                          <Button variant="secondary" data-testid={`watch-table-${table.id}`}>
                            <Eye className="w-4 h-4 mr-1" />
                            Watch
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="secondary" disabled>
                          Full
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Invite Code for Private Tables */}
                  {table.isPrivate && table.inviteCode && table.hostUserId === user?.id && (
                    <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                      <span className="text-muted-foreground">Invite Code: </span>
                      <span className="font-mono font-semibold">{table.inviteCode}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
