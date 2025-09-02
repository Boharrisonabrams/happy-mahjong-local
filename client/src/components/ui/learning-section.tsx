import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Book, Puzzle, Lightbulb, Trophy, Play, CheckCircle } from "lucide-react";
import { Link } from "wouter";

export function LearningSection() {
  const features = [
    {
      icon: Book,
      title: "Interactive Tutorials",
      description: "Learn Charleston, exposures, calling, and joker rules with step-by-step guidance.",
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      icon: Puzzle,
      title: "Daily Puzzles", 
      description: "Sharpen your skills with new challenges every day and compete on the leaderboard.",
      color: "text-accent",
      bgColor: "bg-accent/10"
    },
    {
      icon: Lightbulb,
      title: "AI Hints & Analysis",
      description: "Get personalized suggestions and learn from expert-level analysis of your moves.",
      color: "text-chart-1",
      bgColor: "bg-chart-1/10"
    }
  ];

  const tutorialSteps = [
    { name: "Basic Rules & Setup", completed: true },
    { name: "Charleston Phase", completed: true },
    { name: "Exposures & Calls", inProgress: true },
    { name: "Joker Management", completed: false }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-accent/5 to-primary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-serif font-bold mb-6">
              Master Every Aspect of the Game
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Our comprehensive learning system guides you from basic rules to advanced strategies with interactive tutorials and daily challenges.
            </p>
            
            <div className="space-y-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className={`w-10 h-10 ${feature.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <feature.icon className={`${feature.color} h-5 w-5`} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <Link href="/learn">
              <Button className="mt-8 bg-primary text-primary-foreground px-8 py-3 hover:bg-primary/90" size="lg">
                Start Learning
              </Button>
            </Link>
          </div>
          
          <div className="space-y-4">
            {/* Tutorial Progress Card */}
            <Card className="p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Your Progress</h3>
                <Badge className="bg-primary text-primary-foreground">75% Complete</Badge>
              </div>
              
              <Progress value={75} className="mb-4" />
              
              <div className="space-y-3">
                {tutorialSteps.map((step, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.completed 
                        ? 'bg-primary text-primary-foreground' 
                        : step.inProgress 
                          ? 'bg-accent text-accent-foreground' 
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      {step.completed ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : step.inProgress ? (
                        <Play className="h-3 w-3" />
                      ) : (
                        <span className="text-xs">{index + 1}</span>
                      )}
                    </div>
                    <span className={`text-sm ${step.inProgress ? 'font-medium' : step.completed ? '' : 'text-muted-foreground'}`}>
                      {step.name}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
            
            {/* Daily Puzzle Card */}
            <Card className="p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Today's Puzzle</h3>
                <Badge variant="secondary" className="bg-accent/10 text-accent">New</Badge>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                Complete this hand with optimal tile selection. Can you beat today's top time of 2:34?
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4 text-accent" />
                  <span className="text-sm">847 completed</span>
                </div>
                <Link href="/puzzle">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                    Try Now →
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
