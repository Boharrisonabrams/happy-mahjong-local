import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Menu, 
  Moon, 
  Sun, 
  User, 
  LogOut,
  Play,
  BookOpen,
  Puzzle,
  ShoppingCart,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [location] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const navItems = [
    { path: '/play', label: 'Play', icon: Play },
    { path: '/learn', label: 'Learn', icon: BookOpen },
    { path: '/puzzle', label: 'Daily Puzzle', icon: Puzzle },
    { path: '/shop', label: 'Shop', icon: ShoppingCart },
  ];

  const userNavItems = [
    { path: '/profile', label: 'Profile', icon: User },
    { path: '/profile', label: 'Settings', icon: Settings },
  ];

  const NavLink = ({ path, label, icon: Icon, className }: any) => (
    <Link 
      href={path}
      className={cn(
        "flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-300 font-medium",
        location === path 
          ? "bg-gradient-primary text-white shadow-medium scale-105" 
          : "text-foreground hover:text-primary hover:bg-primary/5 hover:scale-105 hover:shadow-soft",
        className
      )}
      data-testid={`nav-link-${label.toLowerCase().replace(' ', '-')}`}
    >
      {Icon && <Icon className="h-5 w-5" />}
      <span>{label}</span>
    </Link>
  );

  return (
    <nav className="glass border-b border-white/10 sticky top-0 z-50 shadow-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link 
            href={isAuthenticated ? "/" : "/"}
            className="flex items-center space-x-2"
            data-testid="logo-link"
          >
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-medium hover:scale-105 transition-transform duration-200">
              <div className="w-5 h-5 grid grid-cols-2 gap-1">
                <div className="bg-white rounded-sm opacity-90"></div>
                <div className="bg-white rounded-sm opacity-90"></div>
                <div className="bg-white rounded-sm opacity-90"></div>
                <div className="bg-white rounded-sm opacity-90"></div>
              </div>
            </div>
            <span className="text-2xl font-serif font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              MahjongMaster
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <NavLink 
                key={item.path} 
                path={item.path} 
                label={item.label}
                icon={item.icon}
              />
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-xl transition-all duration-300 hover:scale-105"
              data-testid="theme-toggle"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* User menu */}
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : isAuthenticated && user ? (
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.profileImageUrl || ''} />
                  <AvatarFallback>
                    {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="hidden sm:block">
                  <div className="flex items-center space-x-2">
                    <NavLink path="/profile" label="Profile" className="px-2 py-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.href = '/api/logout'}
                      data-testid="logout-button"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button 
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => window.location.href = '/api/login'}
                data-testid="sign-in-button"
              >
                Sign In
              </Button>
            )}

            {/* Mobile menu trigger */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="mobile-menu-trigger"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              
              <SheetContent side="right" className="w-[300px]">
                <div className="py-4 space-y-4">
                  <div className="px-3 py-2">
                    <h2 className="text-lg font-semibold">MahjongMaster</h2>
                  </div>

                  <div className="space-y-1">
                    {navItems.map((item) => (
                      <NavLink 
                        key={item.path}
                        path={item.path}
                        label={item.label}
                        icon={item.icon}
                        className="w-full justify-start"
                      />
                    ))}
                  </div>

                  {isAuthenticated && (
                    <>
                      <div className="border-t pt-4 space-y-1">
                        {userNavItems.map((item) => (
                          <NavLink
                            key={item.path}
                            path={item.path}
                            label={item.label}
                            icon={item.icon}
                            className="w-full justify-start"
                          />
                        ))}
                      </div>

                      <div className="border-t pt-4">
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => window.location.href = '/api/logout'}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
