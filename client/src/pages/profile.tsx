import { useState } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Settings, 
  Palette, 
  Volume2, 
  Eye, 
  Shield,
  Trophy,
  BarChart3,
  Clock,
  Target,
  Loader2
} from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("profile");
  const [animationSpeed, setAnimationSpeed] = useState([75]);

  // Fetch full profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/profile"],
    retry: false,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: any) => {
      return await apiRequest('PATCH', '/api/profile', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Settings Updated",
        description: "Your preferences have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSettingUpdate = (setting: string, value: any) => {
    updateProfileMutation.mutate({ [setting]: value });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = profile?.engagement || {};

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <Card className="p-6 mb-8">
          <div className="flex items-center space-x-6">
            <Avatar className="w-20 h-20">
              <AvatarImage src={user?.profileImageUrl || ''} />
              <AvatarFallback className="text-2xl">
                {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Your Profile'}
              </h1>
              <p className="text-muted-foreground">{user?.email}</p>
              
              <div className="flex items-center space-x-4 mt-3">
                <Badge variant="secondary">
                  Member since {new Date(user?.createdAt || '').getFullYear()}
                </Badge>
                {user?.subscriptionTier !== 'free' && (
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                    Pro Member
                  </Badge>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold">{stats.totalTablesJoined || 0}</div>
              <div className="text-sm text-muted-foreground">Games Played</div>
            </div>
          </div>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="game" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Game</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span>Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Stats</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    defaultValue={user?.firstName || ''}
                    placeholder="Enter your first name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    defaultValue={user?.lastName || ''}
                    placeholder="Enter your last name"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email cannot be changed
                  </p>
                </div>
              </div>

              <Button className="mt-4" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="game" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Game Settings
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sound Effects</Label>
                    <p className="text-sm text-muted-foreground">Play audio feedback during games</p>
                  </div>
                  <Switch 
                    defaultChecked={user?.soundEnabled !== false}
                    onCheckedChange={(checked) => handleSettingUpdate('soundEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Move Hints</Label>
                    <p className="text-sm text-muted-foreground">Show suggested moves and tips</p>
                  </div>
                  <Switch 
                    defaultChecked={user?.hintsEnabled !== false}
                    onCheckedChange={(checked) => handleSettingUpdate('hintsEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-arrange Tiles</Label>
                    <p className="text-sm text-muted-foreground">Automatically sort tiles in your rack</p>
                  </div>
                  <Switch 
                    defaultChecked={user?.autoArrangeTiles === true}
                    onCheckedChange={(checked) => handleSettingUpdate('autoArrangeTiles', checked)}
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Animation Speed</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[user?.animationSpeed || 75]}
                      onValueChange={(value) => handleSettingUpdate('animationSpeed', value[0])}
                      max={100}
                      step={10}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Slow</span>
                      <span>Fast</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Privacy Settings
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Analytics Collection</Label>
                    <p className="text-sm text-muted-foreground">Allow anonymous usage data collection</p>
                  </div>
                  <Switch 
                    defaultChecked={user?.analyticsEnabled !== false}
                    onCheckedChange={(checked) => handleSettingUpdate('analyticsEnabled', checked)}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Tile Appearance</h3>
              
              <div className="space-y-6">
                <div>
                  <Label className="mb-3 block">Tile Theme</Label>
                  <RadioGroup 
                    defaultValue={user?.preferredTileSkin || 'classic'}
                    onValueChange={(value) => handleSettingUpdate('preferredTileSkin', value)}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { id: 'classic', name: 'Classic', preview: 'Traditional mahjong tiles' },
                        { id: 'modern', name: 'Modern', preview: 'Clean, minimalist design' },
                        { id: 'elegant', name: 'Elegant', preview: 'Premium styled tiles' }
                      ].map((theme) => (
                        <div key={theme.id} className="relative">
                          <RadioGroupItem value={theme.id} id={theme.id} className="sr-only" />
                          <Label 
                            htmlFor={theme.id}
                            className="flex flex-col items-center p-4 border-2 border-border rounded-lg cursor-pointer hover:border-accent transition-colors"
                          >
                            <div className="w-16 h-20 bg-gradient-to-b from-slate-100 to-slate-200 border border-slate-300 rounded mb-2 flex items-center justify-center font-bold text-slate-800">
                              東
                            </div>
                            <span className="font-medium">{theme.name}</span>
                            <span className="text-xs text-muted-foreground text-center">{theme.preview}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="tileLayout">Table Layout</Label>
                  <Select 
                    defaultValue={user?.preferredLayout || 'standard'}
                    onValueChange={(value) => handleSettingUpdate('preferredLayout', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Accessibility
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>High Contrast Mode</Label>
                    <p className="text-sm text-muted-foreground">Increase contrast for better visibility</p>
                  </div>
                  <Switch 
                    defaultChecked={user?.highContrastMode === true}
                    onCheckedChange={(checked) => handleSettingUpdate('highContrastMode', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Colorblind Support</Label>
                    <p className="text-sm text-muted-foreground">Enhanced patterns for colorblind users</p>
                  </div>
                  <Switch 
                    defaultChecked={user?.colorblindSupport === true}
                    onCheckedChange={(checked) => handleSettingUpdate('colorblindSupport', checked)}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <Trophy className="h-8 w-8 mx-auto mb-2 text-accent" />
                <div className="text-2xl font-bold">{stats.totalGamesWon || 0}</div>
                <div className="text-sm text-muted-foreground">Games Won</div>
              </Card>

              <Card className="p-4 text-center">
                <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{stats.totalTablesJoined || 0}</div>
                <div className="text-sm text-muted-foreground">Tables Joined</div>
              </Card>

              <Card className="p-4 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold">{stats.puzzlesCompleted || 0}</div>
                <div className="text-sm text-muted-foreground">Puzzles Solved</div>
              </Card>

              <Card className="p-4 text-center">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <div className="text-2xl font-bold">{stats.tutorialProgress || 0}%</div>
                <div className="text-sm text-muted-foreground">Tutorial Progress</div>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              
              <div className="space-y-3">
                {stats.lastActivity ? (
                  <div className="text-sm text-muted-foreground">
                    <p>Last active: {new Date(stats.lastActivity).toLocaleDateString()}</p>
                    <p>Favorite game mode: {stats.favoriteGameMode || 'Public tables'}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                )}
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
              <h3 className="text-lg font-semibold mb-4">Achievements</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-background/50 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">First Win</h4>
                    <p className="text-xs text-muted-foreground">Won your first game</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-background/50 rounded-lg opacity-50">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                    <Target className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium text-muted-foreground">Pattern Master</h4>
                    <p className="text-xs text-muted-foreground">Learn all hand patterns</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
