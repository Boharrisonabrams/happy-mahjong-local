import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Palette, Download, Heart, Crown, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface TileTheme {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  isPublic: boolean;
  isDefault: boolean;
  isActive: boolean;
  tileImagePaths: Record<string, string>;
  previewImagePath?: string;
  downloadCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

export function ThemeManager() {
  const [selectedThemeForPreview, setSelectedThemeForPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  // Fetch all public themes (your curated collection)
  const { data: themes = [], isLoading: themesLoading } = useQuery<TileTheme[]>({
    queryKey: ['/api/themes/public'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/themes/public');
      return response.json();
    },
  });

  // Select theme mutation (sets user preference)
  const selectThemeMutation = useMutation({
    mutationFn: async (themeId: string) => {
      const response = await apiRequest('PUT', '/api/user/theme', { themeId });
      return response.json();
    },
    onSuccess: (data, themeId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      const selectedTheme = themes.find(t => t.id === themeId);
      toast({
        title: "Theme Selected",
        description: `${selectedTheme?.name} is now your active theme!`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to select theme. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Like theme mutation
  const likeThemeMutation = useMutation({
    mutationFn: async (themeId: string) => {
      const response = await apiRequest('POST', `/api/themes/${themeId}/like`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/themes/public'] });
    },
  });

  const handleSelectTheme = (themeId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to select a theme.",
        variant: "destructive",
      });
      return;
    }
    selectThemeMutation.mutate(themeId);
  };

  const handleLikeTheme = (themeId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to like themes.",
        variant: "destructive",
      });
      return;
    }
    likeThemeMutation.mutate(themeId);
  };

  const isPremiumUser = (user as any)?.subscriptionTier === 'pro';
  const userSelectedTheme = (user as any)?.selectedThemeId;

  if (themesLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Loading themes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Tile Themes</h1>
        <p className="text-muted-foreground">Choose from our collection of beautiful, professionally designed tile themes</p>
      </div>

      {/* Premium Feature Banner */}
      <div className="mb-8 p-6 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Crown className="h-6 w-6 text-yellow-600" />
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Want to Create Your Own Theme?</h3>
              <p className="text-yellow-700 dark:text-yellow-300">Upload custom tile images and create personalized themes with MahjongMaster Pro</p>
            </div>
          </div>
          <Button 
            variant={isPremiumUser ? "secondary" : "default"}
            className={!isPremiumUser ? "bg-yellow-600 hover:bg-yellow-700" : ""}
          >
            {isPremiumUser ? "Create Theme" : "Upgrade to Pro"}
          </Button>
        </div>
      </div>

      {/* Theme Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {themes.map((theme) => (
          <Card key={theme.id} className={`transition-all duration-200 hover:shadow-lg ${
            userSelectedTheme === theme.id ? 'ring-2 ring-primary' : ''
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{theme.name}</CardTitle>
                {theme.isDefault && (
                  <Badge variant="secondary">Default</Badge>
                )}
                {userSelectedTheme === theme.id && (
                  <Badge variant="default">Active</Badge>
                )}
              </div>
              <CardDescription className="text-sm">{theme.description}</CardDescription>
            </CardHeader>
            
            <CardContent>
              {/* Theme Preview Area */}
              <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg mb-4 flex items-center justify-center">
                <div className="grid grid-cols-3 gap-2">
                  {/* Mock tile preview - you can replace with actual tile images */}
                  <div className="w-8 h-10 bg-white border border-gray-300 rounded-sm flex items-center justify-center text-xs font-bold">🀄</div>
                  <div className="w-8 h-10 bg-white border border-gray-300 rounded-sm flex items-center justify-center text-xs font-bold">🀅</div>
                  <div className="w-8 h-10 bg-white border border-gray-300 rounded-sm flex items-center justify-center text-xs font-bold">🀆</div>
                </div>
              </div>

              {/* Theme Stats */}
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <Download className="h-4 w-4" />
                    <span>{theme.downloadCount}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Heart className="h-4 w-4" />
                    <span>{theme.likeCount}</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Button 
                  onClick={() => handleSelectTheme(theme.id)}
                  disabled={userSelectedTheme === theme.id || selectThemeMutation.isPending}
                  className="flex-1"
                  data-testid={`button-select-theme-${theme.id}`}
                >
                  {userSelectedTheme === theme.id ? 'Selected' : 'Select Theme'}
                </Button>
                <Button
                  onClick={() => handleLikeTheme(theme.id)}
                  variant="outline"
                  size="icon"
                  disabled={!isAuthenticated || likeThemeMutation.isPending}
                  data-testid={`button-like-theme-${theme.id}`}
                >
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {themes.length === 0 && (
        <div className="text-center py-16">
          <Palette className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Themes Available</h3>
          <p className="text-muted-foreground">Check back soon for new theme releases!</p>
        </div>
      )}
    </div>
  );
}