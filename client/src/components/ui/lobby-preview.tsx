import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Eye } from "lucide-react";
import { Link } from "wouter";

export function LobbyPreview() {
  const mockTables = [
    {
      id: "1",
      name: "Evening Practice",
      players: [
        { id: "1", name: "SJ", color: "bg-blue-500" },
        { id: "2", name: "MK", color: "bg-green-500" }
      ],
      status: "2/4 players • Started 5 min ago",
      tags: ["Standard AI", "Public"],
      joinable: true
    },
    {
      id: "2", 
      name: "Casual vs Bots",
      players: [
        { id: "1", name: "AL", color: "bg-red-500" },
        { id: "2", name: "Bot", isBot: true, color: "bg-gray-500" },
        { id: "3", name: "Bot", isBot: true, color: "bg-gray-500" }
      ],
      status: "3/4 players • Waiting for players",
      tags: ["Easy AI", "Public"],
      joinable: true
    },
    {
      id: "3",
      name: "Masters Tournament", 
      players: [
        { id: "1", name: "LC", color: "bg-blue-500" },
        { id: "2", name: "DR", color: "bg-green-500" },
        { id: "3", name: "TH", color: "bg-purple-500" },
        { id: "4", name: "RG", color: "bg-red-500" }
      ],
      status: "4/4 players • In progress",
      tags: ["Expert", "Private"],
      joinable: false
    }
  ];

  const getTagStyle = (tag: string) => {
    switch (tag.toLowerCase()) {
      case 'standard ai':
        return 'bg-accent/10 text-accent';
      case 'easy ai':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'expert':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'public':
        return 'bg-primary/10 text-primary';
      case 'private':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-serif font-bold mb-4">Join Active Tables</h2>
          <p className="text-xl text-muted-foreground">Find your perfect game from our bustling lobby</p>
        </div>
        
        <Card className="shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-muted px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="font-semibold">Active Tables</h3>
              <Badge className="bg-primary text-primary-foreground">
                8 Available
              </Badge>
            </div>
            <Link href="/play">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Create Table
              </Button>
            </Link>
          </div>
          
          <div className="divide-y divide-border">
            {mockTables.map((table) => (
              <div 
                key={table.id}
                className="px-6 py-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Player Avatars */}
                    <div className="flex -space-x-2">
                      {table.players.map((player) => (
                        <Avatar key={player.id} className="w-10 h-10 border-2 border-background">
                          <AvatarFallback className={player.color}>
                            {player.isBot ? '🤖' : player.name}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      
                      {/* Empty slots */}
                      {Array.from({ length: 4 - table.players.length }).map((_, i) => (
                        <div 
                          key={`empty-${i}`}
                          className="w-10 h-10 bg-muted border-2 border-dashed border-border rounded-full flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>

                    {/* Table Info */}
                    <div>
                      <h4 className="font-medium">{table.name}</h4>
                      <p className="text-sm text-muted-foreground">{table.status}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-4">
                    {/* Tags */}
                    <div className="flex items-center space-x-2">
                      {table.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className={`text-xs ${getTagStyle(tag)}`}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Join/Watch Button */}
                    {table.joinable ? (
                      <Link href="/play">
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                          Join
                        </Button>
                      </Link>
                    ) : (
                      <Button 
                        variant="secondary" 
                        disabled
                        className="cursor-not-allowed"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Watch
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
