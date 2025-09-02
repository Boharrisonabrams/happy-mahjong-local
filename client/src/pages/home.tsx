import { Navigation } from "@/components/ui/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Play, BookOpen, Puzzle, Trophy, TrendingUp, Clock, Users } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user } = useAuth();

  // Fetch user stats and recent activity
  const { data: profile } = useQuery({
    queryKey: ["/api/profile"],
    retry: false,
  });

  // Fetch active tables
  const { data: tables = [] } = useQuery({
    queryKey: ["/api/tables"],
    retry: false,
  });

  // Fetch daily puzzle
  const { data: dailyPuzzle } = useQuery({
    queryKey: ["/api/puzzles/daily"],
    retry: false,
  });

  const quickActions = [
    {
      title: "Play Now",
      description: "Join a table or play against AI",
      icon: Play,
      href: "/play",
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Continue Learning",
      description: "Pick up where you left off",
      icon: BookOpen,
      href: "/learn", 
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950"
    },
    {
      title: "Daily Puzzle",
      description: "Today's challenge awaits",
      icon: Puzzle,
      href: "/puzzle",
      color: "text-purple-600", 
      bgColor: "bg-purple-50 dark:bg-purple-950"
    }
  ];

  const stats = profile?.engagement || {
    totalTablesJoined: 0,
    totalGamesWon: 0,
    tutorialProgress: 0,
    puzzlesCompleted: 0
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold mb-2">
            Welcome back, {user?.firstName || 'Player'}!
          </h1>
          <p className="text-muted-foreground">
            Ready to continue your mahjong journey?
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {quickActions.map((action) => (
                  <Link key={action.title} href={action.href}>
                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" data-testid={`quick-action-${action.title.toLowerCase().replace(' ', '-')}`}>
                      <div className={`w-12 h-12 ${action.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                        <action.icon className={`${action.color} h-6 w-6`} />
                      </div>
                      <h3 className="font-semibold mb-2">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>

            {/* Active Tables */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Active Tables</h2>
                <Link href="/play">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>
              
              <Card className="p-4">
                {tables.length > 0 ? (
                  <div className="space-y-3">
                    {tables.slice(0, 3).map((table: any) => (
                      <div key={table.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <h4 className="font-medium">{table.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {table.playerCount || 0}/4 players
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">{table.status}</Badge>
                          <Link href={`/table/${table.id}`}>
                            <Button size="sm">Join</Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No active tables at the moment</p>
                    <Link href="/play">
                      <Button>Create Table</Button>
                    </Link>
                  </div>
                )}
              </Card>
            </div>

            {/* Daily Puzzle */}
            {dailyPuzzle && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Today's Puzzle</h2>
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Puzzle className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold">Daily Challenge</h3>
                    </div>
                    <Badge variant="secondary">Medium</Badge>
                  </div>
                  
                  <p className="text-muted-foreground mb-4">
                    Complete this hand with optimal tile selection. Test your pattern recognition skills!
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Trophy className="h-4 w-4" />
                        <span>Best: 2:34</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>847 solved</span>
                      </div>
                    </div>
                    <Link href="/puzzle">
                      <Button data-testid="solve-puzzle-button">Solve Puzzle</Button>
                    </Link>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Player Stats */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Your Stats
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tables Joined</span>
                  <span className="font-medium">{stats.totalTablesJoined}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Games Won</span>
                  <span className="font-medium">{stats.totalGamesWon}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tutorial Progress</span>
                  <span className="font-medium">{stats.tutorialProgress}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Puzzles Solved</span>
                  <span className="font-medium">{stats.puzzlesCompleted}</span>
                </div>
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Recent Activity
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Completed tutorial step</span>
                  <span className="text-xs text-muted-foreground">2h ago</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Joined practice table</span>
                  <span className="text-xs text-muted-foreground">1d ago</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Solved daily puzzle</span>
                  <span className="text-xs text-muted-foreground">2d ago</span>
                </div>
              </div>
            </Card>

            {/* Quick Settings */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Quick Settings</h3>
              <div className="space-y-2">
                <Link href="/profile">
                  <Button variant="ghost" className="w-full justify-start text-sm">
                    Tile Themes & Layout
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button variant="ghost" className="w-full justify-start text-sm">
                    Sound & Hints
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button variant="ghost" className="w-full justify-start text-sm">
                    Privacy Settings
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
