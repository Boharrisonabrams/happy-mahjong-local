import { useState } from "react";
import { Navigation } from "@/components/ui/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  Flag, 
  FileText, 
  Users, 
  AlertTriangle,
  Plus,
  Edit,
  Eye,
  Trash2,
  Upload,
  Download,
  BarChart3,
  Shield,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [createPatternOpen, setCreatePatternOpen] = useState(false);
  const [editFlagOpen, setEditFlagOpen] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<any>(null);

  // Redirect if not admin (in production, check user role)
  // For MVP, assume any authenticated user can access admin
  
  // Fetch admin data
  const { data: featureFlags = [], isLoading: flagsLoading } = useQuery({
    queryKey: ["/api/admin/feature-flags"],
    retry: false,
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["/api/admin/reports"],
    retry: false,
  });

  const { data: patterns = [], isLoading: patternsLoading } = useQuery({
    queryKey: ["/api/patterns"],
    retry: false,
  });


  // Mutations
  const updateFlagMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return await apiRequest('PATCH', `/api/admin/feature-flags/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-flags"] });
      setEditFlagOpen(false);
      toast({
        title: "Feature Flag Updated",
        description: "The feature flag has been updated successfully.",
      });
    }
  });

  const createPatternMutation = useMutation({
    mutationFn: async (patternData: any) => {
      return await apiRequest('POST', '/api/admin/patterns', patternData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patterns"] });
      setCreatePatternOpen(false);
      toast({
        title: "Pattern Created",
        description: "The hand pattern has been created successfully.",
      });
    }
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest('PATCH', `/api/admin/reports/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({
        title: "Report Updated",
        description: "The report status has been updated.",
      });
    }
  });


  const handleFlagEdit = (flag: any) => {
    setSelectedFlag(flag);
    setEditFlagOpen(true);
  };

  const handleFlagUpdate = (formData: FormData) => {
    if (!selectedFlag) return;
    
    const updates = {
      enabled: formData.get('enabled') === 'on',
      rolloutPercentage: parseInt(formData.get('rolloutPercentage') as string) || 0,
      description: formData.get('description') as string,
    };
    
    updateFlagMutation.mutate({ id: selectedFlag.id, updates });
  };

  const handlePatternCreate = (formData: FormData) => {
    const patternData = {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      description: formData.get('description') as string,
      concealedOnly: formData.get('concealedOnly') === 'on',
      jokersAllowed: formData.get('jokersAllowed') === 'on',
      flowersUsage: formData.get('flowersUsage') as string,
      points: parseInt(formData.get('points') as string) || 25,
      patternSets: JSON.parse(formData.get('patternSets') as string || '[]'),
      isActive: true,
    };
    
    createPatternMutation.mutate(patternData);
  };

  const getFlagStatusColor = (flag: any) => {
    if (!flag.enabled) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    if (flag.rolloutPercentage >= 100) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (flag.rolloutPercentage > 0) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-serif font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Manage feature flags, hand patterns, user reports, and system settings
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="flags">Feature Flags</TabsTrigger>
            <TabsTrigger value="patterns">Hand Patterns</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="p-6 text-center">
                <Flag className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{featureFlags.length}</div>
                <div className="text-sm text-muted-foreground">Feature Flags</div>
              </Card>

              <Card className="p-6 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold">{patterns.length}</div>
                <div className="text-sm text-muted-foreground">Hand Patterns</div>
              </Card>

              <Card className="p-6 text-center">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <div className="text-2xl font-bold">{reports.filter((r: any) => r.status === 'pending').length}</div>
                <div className="text-sm text-muted-foreground">Pending Reports</div>
              </Card>

              <Card className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold">--</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span>Feature flag 'ai_hints_enabled' updated</span>
                  <span className="text-muted-foreground">2 hours ago</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span>New hand pattern 'Consecutive Dragons' created</span>
                  <span className="text-muted-foreground">1 day ago</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span>User report resolved</span>
                  <span className="text-muted-foreground">2 days ago</span>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="flags" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Feature Flags</h3>
                <div className="text-sm text-muted-foreground">
                  Control feature rollouts and experiments
                </div>
              </div>

              {flagsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading feature flags...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Flag Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rollout %</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {featureFlags.map((flag: any) => (
                      <TableRow key={flag.id}>
                        <TableCell className="font-medium">{flag.name}</TableCell>
                        <TableCell>
                          <Badge className={getFlagStatusColor(flag)}>
                            {flag.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </TableCell>
                        <TableCell>{flag.rolloutPercentage}%</TableCell>
                        <TableCell className="max-w-xs truncate">{flag.description}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFlagEdit(flag)}
                            data-testid={`edit-flag-${flag.name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="patterns" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Hand Patterns</h3>
                <Dialog open={createPatternOpen} onOpenChange={setCreatePatternOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="create-pattern-button">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Pattern
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create Hand Pattern</DialogTitle>
                    </DialogHeader>
                    <form action={handlePatternCreate} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Pattern Name</Label>
                          <Input id="name" name="name" required />
                        </div>
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Input id="category" name="category" required />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" />
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="points">Points</Label>
                          <Input id="points" name="points" type="number" defaultValue="25" />
                        </div>
                        <div>
                          <Label htmlFor="flowersUsage">Flowers Usage</Label>
                          <Select name="flowersUsage">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="optional">Optional</SelectItem>
                              <SelectItem value="required">Required</SelectItem>
                              <SelectItem value="none">None</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Switch id="concealedOnly" name="concealedOnly" />
                            <Label htmlFor="concealedOnly">Concealed Only</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch id="jokersAllowed" name="jokersAllowed" defaultChecked />
                            <Label htmlFor="jokersAllowed">Jokers Allowed</Label>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="patternSets">Pattern Sets (JSON)</Label>
                        <Textarea 
                          id="patternSets" 
                          name="patternSets"
                          placeholder='[{"type": "pung", "tileSet": "any"}, {"type": "pair", "tileSet": "dragons_any"}]'
                          className="font-mono"
                        />
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setCreatePatternOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createPatternMutation.isPending}>
                          {createPatternMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Create Pattern
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {patternsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading patterns...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patterns.map((pattern: any) => (
                      <TableRow key={pattern.id}>
                        <TableCell className="font-medium">{pattern.name}</TableCell>
                        <TableCell>{pattern.category}</TableCell>
                        <TableCell>{pattern.points}</TableCell>
                        <TableCell>
                          <Badge variant={pattern.isActive ? "default" : "secondary"}>
                            {pattern.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" data-testid={`view-pattern-${pattern.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" data-testid={`edit-pattern-${pattern.id}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6">User Reports</h3>

              {reportsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading reports...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No reports to review</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Reported User</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report: any) => (
                      <TableRow key={report.id}>
                        <TableCell>{report.reporter?.firstName || 'Anonymous'}</TableCell>
                        <TableCell>{report.reportedUser?.firstName || 'Unknown'}</TableCell>
                        <TableCell>{report.reason}</TableCell>
                        <TableCell>
                          <Badge variant={report.status === 'pending' ? 'destructive' : 'secondary'}>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(report.createdAt), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          {report.status === 'pending' && (
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateReportMutation.mutate({ id: report.id, status: 'resolved' })}
                                data-testid={`resolve-report-${report.id}`}
                              >
                                Resolve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateReportMutation.mutate({ id: report.id, status: 'reviewed' })}
                                data-testid={`review-report-${report.id}`}
                              >
                                Review
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>


          <TabsContent value="analytics" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">System Analytics</h3>
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h4 className="text-lg font-semibold mb-2">Analytics Dashboard</h4>
                <p className="text-muted-foreground mb-4">
                  Detailed analytics and reporting features will be available in a future update.
                </p>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Flag Dialog */}
        <Dialog open={editFlagOpen} onOpenChange={setEditFlagOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Feature Flag</DialogTitle>
            </DialogHeader>
            {selectedFlag && (
              <form action={handleFlagUpdate} className="space-y-4">
                <div>
                  <Label>Flag Name</Label>
                  <Input value={selectedFlag.name} disabled />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    defaultValue={selectedFlag.description}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    id="enabled" 
                    name="enabled" 
                    defaultChecked={selectedFlag.enabled}
                  />
                  <Label htmlFor="enabled">Enabled</Label>
                </div>

                <div>
                  <Label htmlFor="rolloutPercentage">Rollout Percentage</Label>
                  <Input 
                    id="rolloutPercentage" 
                    name="rolloutPercentage" 
                    type="number" 
                    min="0" 
                    max="100"
                    defaultValue={selectedFlag.rolloutPercentage}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setEditFlagOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateFlagMutation.isPending}>
                    {updateFlagMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Update Flag
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
