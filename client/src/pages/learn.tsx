import { useState } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Book, 
  CheckCircle, 
  Play, 
  Lock, 
  Clock, 
  Star,
  ArrowRight,
  RotateCcw,
  Eye,
  Wand2,
  Trophy
} from "lucide-react";

export default function Learn() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("basics");

  // Fetch tutorial progress
  const { data: progress = [] } = useQuery({
    queryKey: ["/api/tutorial/progress"],
    retry: false,
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async ({ tutorialStep, completed }: { tutorialStep: string; completed: boolean }) => {
      return await apiRequest('POST', '/api/tutorial/progress', { tutorialStep, completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutorial/progress"] });
      toast({
        title: "Progress Updated",
        description: "Your tutorial progress has been saved!",
      });
    }
  });

  const tutorialSections = [
    {
      id: "basics",
      title: "Game Basics",
      description: "Learn the fundamentals of American Mahjong",
      icon: Book,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      lessons: [
        {
          id: "setup",
          title: "Game Setup & Tiles",
          description: "Understanding the 152-tile set and table setup",
          duration: "5 min",
          completed: true
        },
        {
          id: "objective", 
          title: "Game Objective",
          description: "How to win and basic scoring",
          duration: "3 min",
          completed: true
        },
        {
          id: "hands",
          title: "Hand Patterns",
          description: "Introduction to winning combinations",
          duration: "8 min",
          completed: false
        },
        {
          id: "flowers",
          title: "Flowers & Jokers",
          description: "Special tiles and their uses",
          duration: "6 min",
          completed: false
        }
      ]
    },
    {
      id: "charleston",
      title: "Charleston Phase",
      description: "Master the tile exchange process",
      icon: RotateCcw,
      color: "text-green-600", 
      bgColor: "bg-green-50 dark:bg-green-950",
      lessons: [
        {
          id: "charleston-basics",
          title: "Charleston Rules",
          description: "Understanding the three-pass system",
          duration: "7 min",
          completed: false
        },
        {
          id: "charleston-strategy",
          title: "Charleston Strategy",
          description: "What to pass and what to keep",
          duration: "10 min",
          completed: false
        },
        {
          id: "optional-pass",
          title: "Optional Pass",
          description: "When and how to use the fourth pass",
          duration: "5 min",
          completed: false
        }
      ]
    },
    {
      id: "gameplay",
      title: "Active Gameplay",
      description: "Playing the game turn by turn", 
      icon: Play,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
      lessons: [
        {
          id: "turns",
          title: "Turn Structure",
          description: "Draw, discard, and calling sequence",
          duration: "6 min",
          completed: false
        },
        {
          id: "exposures",
          title: "Exposures & Calls",
          description: "Pung, Kong, and Quint calls",
          duration: "12 min",
          completed: false
        },
        {
          id: "winning",
          title: "Going Mahjong",
          description: "Declaring a win and validation",
          duration: "8 min", 
          completed: false
        }
      ]
    },
    {
      id: "advanced",
      title: "Advanced Strategy", 
      description: "Master-level techniques and tips",
      icon: Star,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950",
      lessons: [
        {
          id: "reading-hands",
          title: "Reading Other Hands",
          description: "Analyzing discards and exposures",
          duration: "15 min",
          completed: false
        },
        {
          id: "defensive-play",
          title: "Defensive Strategy",
          description: "Safe discards and blocking opponents",
          duration: "12 min",
          completed: false
        },
        {
          id: "joker-strategy",
          title: "Advanced Joker Use",
          description: "Maximizing joker value and recovery",
          duration: "10 min",
          completed: false
        }
      ]
    }
  ];

  const practiceActivities = [
    {
      title: "Pattern Recognition",
      description: "Practice identifying winning patterns",
      icon: Eye,
      difficulty: "Beginner",
      estimatedTime: "10 min"
    },
    {
      title: "Charleston Simulator", 
      description: "Practice tile passing decisions",
      icon: RotateCcw,
      difficulty: "Intermediate", 
      estimatedTime: "15 min"
    },
    {
      title: "Joker Placement",
      description: "Learn optimal joker usage",
      icon: Wand2,
      difficulty: "Advanced",
      estimatedTime: "12 min"  
    },
    {
      title: "End Game Scenarios",
      description: "Practice winning hand completion",
      icon: Trophy,
      difficulty: "Expert",
      estimatedTime: "20 min"
    }
  ];

  const getProgressForSection = (sectionId: string) => {
    const section = tutorialSections.find(s => s.id === sectionId);
    if (!section) return 0;
    
    const completedLessons = section.lessons.filter(l => l.completed).length;
    return Math.round((completedLessons / section.lessons.length) * 100);
  };

  const overallProgress = () => {
    const totalLessons = tutorialSections.reduce((acc, section) => acc + section.lessons.length, 0);
    const completedLessons = tutorialSections.reduce((acc, section) => 
      acc + section.lessons.filter(l => l.completed).length, 0);
    return Math.round((completedLessons / totalLessons) * 100);
  };

  const handleStartLesson = (sectionId: string, lessonId: string) => {
    // In a real app, this would navigate to the lesson content
    toast({
      title: "Lesson Started",
      description: "This would open the interactive lesson content.",
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'advanced':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'expert':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold mb-2">Learn American Mahjong</h1>
          <p className="text-muted-foreground mb-4">
            Master the game step by step with our comprehensive tutorial system
          </p>
          
          {/* Overall Progress */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Your Learning Progress</h3>
                <p className="text-sm text-muted-foreground">
                  {overallProgress()}% complete across all modules
                </p>
              </div>
              <Badge className="bg-primary text-primary-foreground text-lg px-4 py-2">
                {overallProgress()}%
              </Badge>
            </div>
            <Progress value={overallProgress()} className="h-3" />
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tutorials">Interactive Tutorials</TabsTrigger>
            <TabsTrigger value="practice">Practice Activities</TabsTrigger>
          </TabsList>

          <TabsContent value="tutorials" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {tutorialSections.map((section) => (
                <Card key={section.id} className="p-6 shadow-lg">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`w-12 h-12 ${section.bgColor} rounded-lg flex items-center justify-center`}>
                      <section.icon className={`${section.color} h-6 w-6`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{section.title}</h3>
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    </div>
                    <Badge variant="secondary">
                      {getProgressForSection(section.id)}%
                    </Badge>
                  </div>

                  <Progress value={getProgressForSection(section.id)} className="mb-4" />

                  <div className="space-y-3">
                    {section.lessons.map((lesson) => (
                      <div 
                        key={lesson.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            lesson.completed 
                              ? 'bg-green-500 text-white' 
                              : 'bg-muted border-2 border-dashed border-border'
                          }`}>
                            {lesson.completed ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">{lesson.title}</h4>
                            <p className="text-xs text-muted-foreground">{lesson.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className="text-xs text-muted-foreground flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {lesson.duration}
                          </div>
                          <Button 
                            size="sm"
                            variant={lesson.completed ? "outline" : "default"}
                            onClick={() => handleStartLesson(section.id, lesson.id)}
                            data-testid={`start-lesson-${lesson.id}`}
                          >
                            {lesson.completed ? "Review" : "Start"}
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="practice" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Practice Activities</h3>
              <p className="text-muted-foreground mb-6">
                Reinforce your learning with hands-on practice exercises
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                {practiceActivities.map((activity, index) => (
                  <Card key={index} className="p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <activity.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{activity.title}</h4>
                          <p className="text-sm text-muted-foreground">{activity.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant="secondary" className={getDifficultyColor(activity.difficulty)}>
                          {activity.difficulty}
                        </Badge>
                        <div className="text-sm text-muted-foreground flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {activity.estimatedTime}
                        </div>
                      </div>
                      <Button size="sm" data-testid={`practice-${activity.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        Practice
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>

            {/* Quick Tips */}
            <Card className="p-6 bg-gradient-to-r from-primary/5 to-accent/5">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Star className="h-5 w-5 mr-2 text-accent" />
                Quick Tips for Learning
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="flex items-start">
                    <span className="text-accent mr-2">•</span>
                    Practice daily for 15-20 minutes to build muscle memory
                  </p>
                  <p className="flex items-start">
                    <span className="text-accent mr-2">•</span>
                    Start with bot games to practice without pressure
                  </p>
                  <p className="flex items-start">
                    <span className="text-accent mr-2">•</span>
                    Focus on learning one pattern category at a time
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="flex items-start">
                    <span className="text-accent mr-2">•</span>
                    Use the hint system to understand optimal plays
                  </p>
                  <p className="flex items-start">
                    <span className="text-accent mr-2">•</span>
                    Study discards to read opponents' strategies
                  </p>
                  <p className="flex items-start">
                    <span className="text-accent mr-2">•</span>
                    Complete daily puzzles to sharpen pattern recognition
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
