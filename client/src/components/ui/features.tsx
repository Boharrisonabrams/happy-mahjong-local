import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Bot, GraduationCap, Handshake, Eye, Wand2, Trophy } from "lucide-react";

export function Features() {
  const features = [
    {
      icon: Users,
      title: "Multiplayer Tables",
      description: "Join live tables with players from around the world. Real-time gameplay with seamless reconnection and chat.",
      items: [
        "4-player tables",
        "Private room codes", 
        "Spectator mode"
      ],
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950"
    },
    {
      icon: Bot,
      title: "AI Opponents", 
      description: "Challenge our sophisticated AI bots with three difficulty levels. Perfect for practice or filling empty seats.",
      items: [
        "Easy, Standard, Strong",
        "Strategic decision making",
        "Instant fill for tables"
      ],
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950"
    },
    {
      icon: GraduationCap,
      title: "Learn & Practice",
      description: "Master every aspect of American Mahjong with our comprehensive tutorial system and daily puzzles.",
      items: [
        "Step-by-step tutorials",
        "Daily practice puzzles",
        "Hand suggestion engine"
      ],
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950"
    }
  ];

  const gameFlow = [
    {
      icon: Handshake,
      title: "Charleston Phase",
      description: "Exchange tiles with other players to build your hand",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950"
    },
    {
      icon: Eye,
      title: "Exposures & Calls",
      description: "Call tiles for pungs, kongs, and quints strategically",
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950"
    },
    {
      icon: Wand2,
      title: "Joker Management",
      description: "Master joker substitution and recovery rules",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950"
    },
    {
      icon: Trophy,
      title: "Win Validation",
      description: "Automatic pattern matching and score calculation",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950"
    }
  ];

  return (
    <section className="py-20 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif font-bold text-foreground mb-4">
            Everything You Need to Master Mahjong
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From beginner tutorials to advanced strategy, our platform provides the complete American Mahjong experience.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className={`w-16 h-16 ${feature.bgColor} rounded-lg flex items-center justify-center mb-6`}>
                <feature.icon className={`${feature.color} text-2xl h-8 w-8`} />
              </div>
              
              <h3 className="text-2xl font-semibold mb-4">{feature.title}</h3>
              
              <p className="text-muted-foreground mb-6">{feature.description}</p>
              
              <ul className="space-y-2 text-sm">
                {feature.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-center">
                    <div className={`w-2 h-2 rounded-full ${feature.color.replace('text-', 'bg-')} mr-3`}></div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        {/* Game Flow Showcase */}
        <Card className="p-8 shadow-lg">
          <h3 className="text-2xl font-semibold text-center mb-8">
            Complete Game Experience
          </h3>
          
          <div className="grid md:grid-cols-4 gap-6">
            {gameFlow.map((step, index) => (
              <div key={index} className="text-center">
                <div className={`w-20 h-20 ${step.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <step.icon className={`${step.color} text-2xl h-8 w-8`} />
                </div>
                
                <h4 className="font-semibold mb-2">{step.title}</h4>
                
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
