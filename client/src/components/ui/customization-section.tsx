import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function CustomizationSection() {
  const [selectedTheme, setSelectedTheme] = useState("classic");
  const [tileSize, setTileSize] = useState("standard");
  const [animationSpeed, setAnimationSpeed] = useState([75]);

  const tileThemes = [
    {
      id: "classic",
      name: "Classic",
      preview: ["東", "南", "西"],
      colors: "from-slate-100 to-slate-200 border-slate-300"
    },
    {
      id: "modern-blue", 
      name: "Modern Blue",
      preview: ["東", "南", "西"],
      colors: "from-blue-100 to-blue-200 border-blue-300"
    },
    {
      id: "royal-purple",
      name: "Royal Purple", 
      preview: ["東", "南", "西"],
      colors: "from-purple-100 to-purple-200 border-purple-300"
    }
  ];

  const TilePreview = ({ theme, isSelected }: { theme: any, isSelected: boolean }) => (
    <div 
      className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
        isSelected ? 'border-primary' : 'border-border hover:border-accent'
      }`}
      onClick={() => setSelectedTheme(theme.id)}
    >
      <div className="flex space-x-2 mb-2">
        {theme.preview.map((char: string, i: number) => (
          <div 
            key={i}
            className={`w-8 h-10 rounded text-xs flex items-center justify-center font-bold bg-gradient-to-b ${theme.colors}`}
          >
            {char}
          </div>
        ))}
      </div>
      <span className="text-sm font-medium">{theme.name}</span>
    </div>
  );

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif font-bold mb-4">Customize Your Experience</h2>
          <p className="text-xl text-muted-foreground">
            Tailor the game to your preferences with extensive customization options
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Tile Themes */}
          <Card className="p-8 shadow-lg">
            <h3 className="text-xl font-semibold mb-6">Tile Themes</h3>
            <div className="space-y-4">
              {tileThemes.map((theme) => (
                <TilePreview 
                  key={theme.id}
                  theme={theme}
                  isSelected={selectedTheme === theme.id}
                />
              ))}
            </div>
          </Card>
          
          {/* Layout Options */}
          <Card className="p-8 shadow-lg">
            <h3 className="text-xl font-semibold mb-6">Layout & Size</h3>
            
            <Tabs defaultValue="size" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="size">Size</TabsTrigger>
                <TabsTrigger value="layout">Layout</TabsTrigger>
              </TabsList>
              
              <TabsContent value="size" className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Tile Size</Label>
                  <RadioGroup value={tileSize} onValueChange={setTileSize}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="compact" id="compact" />
                      <Label htmlFor="compact">Compact</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="standard" id="standard" />
                      <Label htmlFor="standard">Standard</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="large" id="large" />
                      <Label htmlFor="large">Large</Label>
                    </div>
                  </RadioGroup>
                </div>
              </TabsContent>
              
              <TabsContent value="layout" className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Table Layout</Label>
                  <RadioGroup defaultValue="square">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="square" id="square" />
                      <Label htmlFor="square">Traditional Square</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="circle" id="circle" />
                      <Label htmlFor="circle">Compact Circle</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch id="high-contrast" />
                  <Label htmlFor="high-contrast">High Contrast Mode</Label>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
          
          {/* Accessibility */}
          <Card className="p-8 shadow-lg">
            <h3 className="text-xl font-semibold mb-6">Accessibility</h3>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sound-effects">Sound Effects</Label>
                  <Switch id="sound-effects" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="move-hints">Move Hints</Label>
                  <Switch id="move-hints" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-arrange">Auto-arrange Tiles</Label>
                  <Switch id="auto-arrange" />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="colorblind">Colorblind Support</Label>
                  <Switch id="colorblind" />
                </div>
              </div>
              
              <div className="pt-4">
                <Label className="text-sm font-medium mb-2 block">Animation Speed</Label>
                <Slider
                  value={animationSpeed}
                  onValueChange={setAnimationSpeed}
                  max={100}
                  step={10}
                  className="mb-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Off</span>
                  <span>Fast</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
