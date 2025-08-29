import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ObjectUploader } from './ObjectUploader';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Upload, Plus, Palette, Download, Heart, Trash2 } from 'lucide-react';
import type { UploadResult } from '@uppy/core';

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

interface TileUploadState {
  [tileType: string]: string | null;
}

const TILE_TYPES = {
  'dots-1': 'One Dot',
  'dots-2': 'Two Dots',
  'dots-3': 'Three Dots',
  'dots-4': 'Four Dots',
  'dots-5': 'Five Dots',
  'dots-6': 'Six Dots',
  'dots-7': 'Seven Dots',
  'dots-8': 'Eight Dots',
  'dots-9': 'Nine Dots',
  'bams-1': 'One Bam',
  'bams-2': 'Two Bams',
  'bams-3': 'Three Bams',
  'bams-4': 'Four Bams',
  'bams-5': 'Five Bams',
  'bams-6': 'Six Bams',
  'bams-7': 'Seven Bams',
  'bams-8': 'Eight Bams',
  'bams-9': 'Nine Bams',
  'craks-1': 'One Crak',
  'craks-2': 'Two Craks',
  'craks-3': 'Three Craks',
  'craks-4': 'Four Craks',
  'craks-5': 'Five Craks',
  'craks-6': 'Six Craks',
  'craks-7': 'Seven Craks',
  'craks-8': 'Eight Craks',
  'craks-9': 'Nine Craks',
  'winds-east': 'East Wind',
  'winds-south': 'South Wind',
  'winds-west': 'West Wind',
  'winds-north': 'North Wind',
  'dragons-red': 'Red Dragon',
  'dragons-green': 'Green Dragon',
  'dragons-white': 'White Dragon',
  'flowers-1': 'Flower 1',
  'flowers-2': 'Flower 2',
  'flowers-3': 'Flower 3',
  'flowers-4': 'Flower 4',
  'joker': 'Joker'
};

export function ThemeManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTheme, setNewTheme] = useState({
    name: '',
    description: '',
    isPublic: false
  });
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [tileUploads, setTileUploads] = useState<TileUploadState>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's themes
  const { data: themes = [], isLoading: themesLoading } = useQuery<TileTheme[]>({
    queryKey: ['/api/themes'],
    queryFn: () => apiRequest('/api/themes'),
  });

  // Create theme mutation
  const createThemeMutation = useMutation({
    mutationFn: (themeData: any) => apiRequest('/api/themes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(themeData),
    }),
    onSuccess: (newTheme) => {
      queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
      setSelectedTheme(newTheme.id);
      setIsCreateDialogOpen(false);
      setNewTheme({ name: '', description: '', isPublic: false });
      toast({
        title: "Theme Created",
        description: `${newTheme.name} theme created successfully. Now upload tile images!`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create theme. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Upload image mutation
  const updateThemeImageMutation = useMutation({
    mutationFn: ({ themeId, imageType, imageUrl }: { themeId: string; imageType: string; imageUrl: string }) =>
      apiRequest(`/api/themes/${themeId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageType, imageUrl }),
      }),
    onSuccess: (updatedTheme, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
      setTileUploads(prev => ({ ...prev, [variables.imageType]: variables.imageUrl }));
      toast({
        title: "Image Uploaded",
        description: `${TILE_TYPES[variables.imageType as keyof typeof TILE_TYPES]} image uploaded successfully!`,
      });
    },
  });

  const handleGetUploadParameters = async (tileType: string) => {
    if (!selectedTheme) throw new Error('No theme selected');
    
    const response = await apiRequest('/api/themes/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId: selectedTheme, tileType }),
    });
    
    return {
      method: 'PUT' as const,
      url: response.uploadURL,
    };
  };

  const handleUploadComplete = (tileType: string) => (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (!selectedTheme || !result.successful?.[0]?.uploadURL) return;

    updateThemeImageMutation.mutate({
      themeId: selectedTheme,
      imageType: tileType,
      imageUrl: result.successful[0].uploadURL as string,
    });
  };

  const selectedThemeData = themes.find(t => t.id === selectedTheme);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tile Themes</h1>
          <p className="text-muted-foreground">Create and manage custom tile designs</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-theme">
              <Plus className="w-4 h-4 mr-2" />
              Create Theme
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tile Theme</DialogTitle>
              <DialogDescription>
                Design a custom tile theme with your own images
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="theme-name">Theme Name</Label>
                <Input
                  id="theme-name"
                  data-testid="input-theme-name"
                  value={newTheme.name}
                  onChange={(e) => setNewTheme(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Custom Theme"
                />
              </div>
              <div>
                <Label htmlFor="theme-description">Description</Label>
                <Textarea
                  id="theme-description"
                  data-testid="input-theme-description"
                  value={newTheme.description}
                  onChange={(e) => setNewTheme(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="A beautiful custom tile theme..."
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="theme-public"
                  data-testid="switch-theme-public"
                  checked={newTheme.isPublic}
                  onCheckedChange={(checked) => setNewTheme(prev => ({ ...prev, isPublic: checked }))}
                />
                <Label htmlFor="theme-public">Make theme public for others to use</Label>
              </div>
              <Button
                data-testid="button-save-theme"
                onClick={() => createThemeMutation.mutate({
                  ...newTheme,
                  tileImagePaths: {}
                })}
                disabled={!newTheme.name || createThemeMutation.isPending}
                className="w-full"
              >
                {createThemeMutation.isPending ? 'Creating...' : 'Create Theme'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="my-themes" className="w-full">
        <TabsList>
          <TabsTrigger value="my-themes">My Themes</TabsTrigger>
          <TabsTrigger value="public-themes">Public Themes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-themes">
          {themesLoading ? (
            <div className="text-center py-12">Loading themes...</div>
          ) : themes.filter(t => t.creatorId).length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Palette className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Custom Themes</h3>
                <p className="text-muted-foreground mb-4">Create your first custom tile theme to get started</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Theme
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {themes.filter(t => t.creatorId).map((theme) => (
                <Card 
                  key={theme.id} 
                  className={`cursor-pointer transition-all ${
                    selectedTheme === theme.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedTheme(selectedTheme === theme.id ? null : theme.id)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{theme.name}</CardTitle>
                        <CardDescription>{theme.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {theme.isPublic && <Badge variant="secondary">Public</Badge>}
                        {theme.isDefault && <Badge variant="default">Default</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <Download className="w-3 h-3 mr-1" />
                        {theme.downloadCount}
                      </span>
                      <span className="flex items-center">
                        <Heart className="w-3 h-3 mr-1" />
                        {theme.likeCount}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="public-themes">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Public themes will be displayed here</p>
          </div>
        </TabsContent>
      </Tabs>

      {selectedThemeData && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Tiles for "{selectedThemeData.name}"</CardTitle>
            <CardDescription>
              Upload custom images for each tile type. Images should be square and at least 128x128 pixels.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(TILE_TYPES).map(([tileType, displayName]) => (
                <div key={tileType} className="text-center space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">{displayName}</div>
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={5242880} // 5MB
                    onGetUploadParameters={() => handleGetUploadParameters(tileType)}
                    onComplete={handleUploadComplete(tileType)}
                    buttonClassName="w-full h-16 text-xs"
                  >
                    {selectedThemeData.tileImagePaths?.[tileType] ? (
                      <div className="flex flex-col items-center">
                        <Upload className="w-4 h-4 mb-1" />
                        <span>Replace</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-4 h-4 mb-1" />
                        <span>Upload</span>
                      </div>
                    )}
                  </ObjectUploader>
                  {selectedThemeData.tileImagePaths?.[tileType] && (
                    <Badge variant="outline" className="text-xs">Uploaded</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}