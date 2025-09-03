import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TileThemeProvider } from "@/contexts/TileThemeContext";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Play from "@/pages/play";
import Table from "@/pages/table";
import Learn from "@/pages/learn";
import Puzzle from "@/pages/puzzle";
import Profile from "@/pages/profile";
import Shop from "@/pages/shop";
import Admin from "@/pages/admin";
import Terms from "@/pages/legal/terms";
import Privacy from "@/pages/legal/privacy";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes available to all users */}
      <Route path="/legal/terms" component={Terms} />
      <Route path="/legal/privacy" component={Privacy} />
      
      {/* Authenticated user routes */}
      {isAuthenticated ? (
        <>
          <Route path="/" component={Home} />
          <Route path="/play" component={Play} />
          <Route path="/table/:id" component={Table} />
          <Route path="/learn" component={Learn} />
          <Route path="/puzzle" component={Puzzle} />
          <Route path="/profile" component={Profile} />
          <Route path="/shop" component={Shop} />
          <Route path="/admin" component={Admin} />
        </>
      ) : (
        <>
          {/* Unauthenticated users see landing page for all routes */}
          <Route path="/" component={Landing} />
          <Route path="/play" component={Landing} />
          <Route path="/learn" component={Landing} />
          <Route path="/puzzle" component={Landing} />
          <Route path="/profile" component={Landing} />
          <Route path="/shop" component={Landing} />
          <Route path="/admin" component={Landing} />
          <Route path="/table/:id" component={Landing} />
        </>
      )}
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TileThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </TileThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
