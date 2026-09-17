import { useState, useEffect, useCallback, useRef } from "react";
import { Eye, EyeOff, RefreshCw, ExternalLink, Loader2, Clock } from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getGradeSheetConfig,
  saveGradeSheetConfig,
  extractSheetId,
  updateColumnVisibility,
  updateTabVisibility,
  syncSheetData,
  getAutoSyncEnabled,
  setAutoSyncEnabled as updateAutoSyncEnabled,
  type GradeSheet,
} from "@/lib/googleSheets";

interface TabConfig {
  name: string;
  columns: string[];
  visibleColumns: string[];
  rollNumberColumn: string;
  visible?: boolean;
}

const AdminGrades = () => {
  const [selectedSection, setSelectedSection] = useState<'CS-F26-M' | 'CS-F26-A'>('CS-F26-M');
  const [sheetUrl, setSheetUrl] = useState("");
  const [gradeSheet, setGradeSheet] = useState<GradeSheet | null>(null);
  const [loading, setLoading] = useState(false); // Start as false, set to true only when fetching
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  // Initialize from database (shared across all admins)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncInterval, setAutoSyncInterval] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Define fetchConfig outside useEffect so it can be called from other functions
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      // Force a fresh fetch by clearing any cached state
      const config = await getGradeSheetConfig(selectedSection);

      if (config) {
        setGradeSheet(config);
        setSheetUrl(config.sheet_url);
        // Load auto-sync status from database
        const autoSync = await getAutoSyncEnabled(selectedSection);
        setAutoSyncEnabled(autoSync);
      } else {
        // Explicitly clear state when no config found for this section
        setGradeSheet(null);
        setSheetUrl("");
        setAutoSyncEnabled(false);
      }
    } catch (error: any) {
      console.error(`[AdminGrades] Error fetching grade sheet config for ${selectedSection}:`, error);
      setGradeSheet(null);
      setSheetUrl("");
      setAutoSyncEnabled(false);
      // Don't show toast for column errors (migration not run)
      if (!error.message?.includes('column') && !error.message?.includes('does not exist')) {
        toast({
          title: "Error",
          description: error.message || "Failed to fetch configuration",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [selectedSection, toast]);

  useEffect(() => {
    // Reset state when section changes to prevent stale data
    setGradeSheet(null);
    setSheetUrl("");
    setAutoSyncEnabled(false);
    // Fetch config for the new section
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSection]); // Only depend on selectedSection - fetchConfig will be recreated when it changes

  // Keep a ref to the latest gradeSheet to avoid stale closures in the interval
  const gradeSheetRef = useRef(gradeSheet);
  useEffect(() => {
    gradeSheetRef.current = gradeSheet;
  }, [gradeSheet]);

  // Use ref to track if sync is in progress (prevents concurrent syncs)
  const syncingRef = useRef(false);

  // Auto-sync effect - runs on fixed interval (30 minutes)
  useEffect(() => {
    if (!autoSyncEnabled) {
      // Clear interval if auto-sync is disabled
      if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
        setAutoSyncInterval(null);
      }
      return;
    }

    const performSync = async () => {
      // Use the ref to get the absolute latest config
      const currentSheet = gradeSheetRef.current;

      // Safety checks
      if (!currentSheet || !currentSheet.sheet_id) return;
      
      // Prevent concurrent syncs using ref (more reliable than state)
      if (syncingRef.current) {
        return;
      }

      try {
        syncingRef.current = true;
        setSyncing(true);
        const result = await syncSheetData(currentSheet.sheet_id);

          if (result.success && result.tabsInfo) {
            // Re-read latest from ref again just in case it verified slightly during await
            const freshSheet = gradeSheetRef.current || currentSheet;

            // Preserve existing visibility settings during auto-sync
            const existingTabs = freshSheet.tabs ? (freshSheet.tabs as any as TabConfig[]) : [];
            const existingTabsMap = new Map(existingTabs.map(t => [t.name, t]));

            const detectedTabs: TabConfig[] = result.tabsInfo.map(tabInfo => {
              const existingTab = existingTabsMap.get(tabInfo.name);

              // Filter function for columns that should be hidden by default
              const shouldHideByDefault = (col: string) => {
                const colLower = col.toLowerCase().trim();
                return (
                  col === tabInfo.rollNumberColumn ||
                  colLower === 'student name' ||
                  colLower === 'name' ||
                  colLower.includes('pct') ||
                  (colLower.includes('total') && !colLower.includes('penalty')) ||
                  (colLower.includes('percentage') && !colLower.includes('penalty')) ||
                  colLower === '%'
                );
              };

              // CRITICAL: Preserve existing visibleColumns EXACTLY as they were
              // Only filter out columns that no longer exist in the sheet
              let visibleColumns: string[];
              if (existingTab && existingTab.visibleColumns) {
                // Preserve existing visibility settings - filter only non-existent columns
                visibleColumns = existingTab.visibleColumns.filter(col => tabInfo.columns.includes(col));
              } else {
                // New tab: hide columns that match exclusion patterns by default
                visibleColumns = tabInfo.columns.filter(col => !shouldHideByDefault(col));
              }

              return {
                name: tabInfo.name,
                columns: tabInfo.columns,
                visibleColumns: visibleColumns,
                rollNumberColumn: tabInfo.rollNumberColumn,
                visible: existingTab?.visible !== undefined ? existingTab.visible : true,
              };
            });

            if (user) {
              // Save config - this will update last_synced_at timestamp
              await saveGradeSheetConfig(
                freshSheet.sheet_url,
                freshSheet.sheet_id,
                selectedSection,
                detectedTabs,
                user.id
              );
            }
          }

          // Always fetch new config to ensure UI matches DB (including updated timestamp)
          await fetchConfig();
        } catch (error: any) {
          console.error('Auto-sync error:', error);
        } finally {
          syncingRef.current = false;
          setSyncing(false);
        }
      };

      // Set up interval - 30 minutes (1800000 ms)
      // Don't sync immediately - wait for the first interval
      const interval = setInterval(performSync, 30 * 60 * 1000); // 30 minutes
      setAutoSyncInterval(interval);

      return () => {
        clearInterval(interval);
        syncingRef.current = false;
      };
  }, [autoSyncEnabled, selectedSection]); // Re-run when section changes to update interval

  const handleSaveSheet = async () => {
    if (!sheetUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Google Sheet URL",
        variant: "destructive",
      });
      return;
    }

    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      toast({
        title: "Error",
        description: "Invalid Google Sheet URL",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      // Create empty tabs structure - will be populated after sync
      const emptyTabs: TabConfig[] = [];

      const config = await saveGradeSheetConfig(sheetUrl, sheetId, selectedSection, emptyTabs, user.id);

      setGradeSheet(config);
      setSheetUrl(config.sheet_url);

      toast({
        title: "Success",
        description: "Google Sheet configuration saved. Now sync to detect tabs and columns.",
      });
    } catch (error: any) {
      console.error('Error saving sheet config:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save configuration. Please check the console for details.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!gradeSheet) {
      toast({
        title: "Error",
        description: "Please configure a Google Sheet first",
        variant: "destructive",
      });
      return;
    }

    try {
      setSyncing(true);
      const result = await syncSheetData(gradeSheet.sheet_id);

      if (result.success && result.tabsInfo) {
        // Preserve existing visibility settings when syncing
        const existingTabs = (gradeSheet.tabs as any as TabConfig[]) || [];
        const existingTabsMap = new Map(existingTabs.map(t => [t.name, t]));

        // Auto-update tabs with detected columns, preserving existing visibility settings
        const detectedTabs: TabConfig[] = result.tabsInfo.map(tabInfo => {
          const existingTab = existingTabsMap.get(tabInfo.name);

          // Filter out summary columns and metadata columns (but allow LAB PENALTY and COURSE PENALTY)
          // This is the default filter - columns matching these patterns should be hidden by default
          const shouldHideByDefault = (col: string) => {
            const colLower = col.toLowerCase().trim();
            return (
              col === tabInfo.rollNumberColumn ||
              colLower === 'student name' ||
              colLower === 'name' ||
              colLower.includes('pct') ||
              (colLower.includes('total') && !colLower.includes('penalty')) ||
              (colLower.includes('percentage') && !colLower.includes('penalty')) ||
              colLower === '%'
            );
          };

          // CRITICAL: For existing tabs, preserve the exact visibleColumns
          // For new tabs, start with columns hidden if they match exclusion patterns
          let visibleColumns: string[];
          if (existingTab && existingTab.visibleColumns) {
            // Preserve existing visibleColumns EXACTLY as they were
            // Only remove columns that no longer exist in the sheet
            visibleColumns = existingTab.visibleColumns.filter(col => tabInfo.columns.includes(col));
            // DO NOT auto-add new columns - admin must manually enable them
          } else {
            // New tab: hide columns that match exclusion patterns by default
            visibleColumns = tabInfo.columns.filter(col => !shouldHideByDefault(col));
          }

          const visible = existingTab?.visible !== undefined ? existingTab.visible : true;

          return {
            name: tabInfo.name,
            columns: tabInfo.columns,
            visibleColumns: visibleColumns, // Preserve existing or use filtered default
            rollNumberColumn: tabInfo.rollNumberColumn,
            visible: visible, // Preserve existing visibility setting
          };
        });

        // Update the sheet config with detected tabs
        if (user) {
          await saveGradeSheetConfig(
            gradeSheet.sheet_url,
            gradeSheet.sheet_id,
            selectedSection,
            detectedTabs,
            user.id
          );
        }
      }

      toast({
        title: "Success",
        description: `Synced ${result.tabsSynced} tabs and ${result.studentsSynced} students. Tabs and columns detected automatically.`,
      });

      // CRITICAL: Wait a brief moment to ensure database write is committed
      // Then refresh config to get updated tabs
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchConfig();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sync sheet data. Make sure the Edge Function is deployed.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleTab = async (tabName: string, visible: boolean) => {
    if (!gradeSheet) return;

    try {
      const tabs = (gradeSheet.tabs as any[]) || [];
      const tab = tabs.find(t => t.name === tabName);
      if (!tab) {
        toast({
          title: "Error",
          description: `Tab '${tabName}' not found`,
          variant: "destructive",
        });
        return;
      }

      // Optimistically update UI immediately
      const updatedTabs = tabs.map(t => {
        if (t.name === tabName) {
          return {
            ...t,
            visible: visible,
          };
        }
        return t;
      });

      // Update local state immediately for instant feedback
      setGradeSheet({
        ...gradeSheet,
        tabs: updatedTabs as any,
      });

      // Save to database
      await updateTabVisibility(gradeSheet.sheet_id, selectedSection, tabName, visible);

      // Refresh config from database to ensure consistency
      await fetchConfig();

      toast({
        title: "Success",
        description: `Tab '${tabName}' is now ${visible ? 'visible' : 'hidden'} to students`,
      });
    } catch (error: any) {
      console.error('Error toggling tab visibility:', error);
      // Revert optimistic update on error
      await fetchConfig();
      toast({
        title: "Error",
        description: error.message || "Failed to update tab visibility",
        variant: "destructive",
      });
    }
  };

  const handleToggleColumn = async (tabName: string, columnName: string, visible: boolean) => {
    if (!gradeSheet) return;

    try {
      const tabs = (gradeSheet.tabs as any[]) || [];
      const tab = tabs.find(t => t.name === tabName);
      if (!tab) {
        toast({
          title: "Error",
          description: `Tab '${tabName}' not found`,
          variant: "destructive",
        });
        return;
      }

      // Calculate new visible columns
      const visibleColumns = visible
        ? [...(tab.visibleColumns || []), columnName]
        : (tab.visibleColumns || []).filter((c: string) => c !== columnName);

      // Optimistically update UI immediately
      const updatedTabs = tabs.map(t => {
        if (t.name === tabName) {
          return {
            ...t,
            visibleColumns: [...visibleColumns], // New array reference
          };
        }
        return t;
      });

      // Update local state immediately for instant feedback
      setGradeSheet({
        ...gradeSheet,
        tabs: updatedTabs as any,
      });

      // Save to database
      await updateColumnVisibility(gradeSheet.sheet_id, selectedSection, tabName, visibleColumns);

      // Refresh config from database to ensure consistency
      await fetchConfig();

      toast({
        title: "Success",
        description: `Column '${columnName}' is now ${visible ? 'visible' : 'hidden'} to students`,
      });
    } catch (error: any) {
      console.error('Error toggling column visibility:', error);
      // Revert optimistic update on error
      await fetchConfig();
      toast({
        title: "Error",
        description: error.message || "Failed to update column visibility",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    // Parse the date string and format it in local timezone
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  const tabs = gradeSheet ? (gradeSheet.tabs as any[]) : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Grades Configuration</h1>
            <p className="text-muted-foreground">Configure Google Sheets integration and column visibility</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={async () => {
                if (!gradeSheet) return;
                
                const newValue = !autoSyncEnabled;
                try {
                  // Save to database (shared across all admins)
                  await updateAutoSyncEnabled(gradeSheet.sheet_id, selectedSection, newValue);
                  setAutoSyncEnabled(newValue);
                  toast({
                    title: "Success",
                    description: `Auto-sync ${newValue ? 'enabled' : 'disabled'} for ${selectedSection}`,
                  });
                } catch (error: any) {
                  console.error('Error updating auto-sync:', error);
                  toast({
                    title: "Error",
                    description: error.message || "Failed to update auto-sync setting",
                    variant: "destructive",
                  });
                }
              }}
              disabled={!gradeSheet}
            >
              <Clock className="h-4 w-4" />
              {autoSyncEnabled ? 'Auto-Sync On' : 'Auto-Sync Off'}
            </Button>
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={handleSync}
              disabled={!gradeSheet || syncing}
            >
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sync Now
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Section Selector */}
        <div
          className="bg-card rounded-2xl border border-border p-6 animate-fade-in"
          style={{ animationDelay: "50ms" }}
        >
          <div className="space-y-2">
            <Label htmlFor="section">Select Section</Label>
            <Select value={selectedSection} onValueChange={(value: 'CS-F26-M' | 'CS-F26-A') => setSelectedSection(value)}>
              <SelectTrigger className="rounded-xl w-full sm:w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CS-F26-M">CS-F26-M</SelectItem>
                <SelectItem value="CS-F26-A">CS-F26-A</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Each section can have its own Google Sheet. Configure them separately.
            </p>
          </div>
        </div>

        {/* Google Sheets Connection */}
        <div
          className="bg-card rounded-2xl border border-border p-6 animate-fade-in"
          style={{ animationDelay: "100ms" }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Google Sheets Connection</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sheetUrl">Google Sheet URL for {selectedSection}</Label>
              <div className="flex gap-2">
                <Input
                  id="sheetUrl"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="rounded-xl flex-1"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  disabled={saving || loading}
                />
                {gradeSheet && (
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => window.open(gradeSheet.sheet_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Share the sheet with your Google <strong>service account</strong> email
                (from the JSON key&apos;s <code className="text-xs">client_email</code> field) as{" "}
                <strong>Viewer</strong>. Set that account as the{" "}
                <code className="text-xs">GOOGLE_SERVICE_ACCOUNT</code> secret on the Edge Function.
                See <code className="text-xs">GOOGLE_SHEETS_SETUP.md</code>.
              </p>
            </div>

            <Button
              onClick={handleSaveSheet}
              className="rounded-xl bg-primary"
              disabled={saving || loading || !sheetUrl.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>

            {gradeSheet && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div>
                  <p className="text-sm font-medium text-foreground">Last Synced</p>
                  <p className="text-xs text-muted-foreground">{formatDate(gradeSheet.last_synced_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success" />
                  <span className="text-sm text-muted-foreground">Connected</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Column Visibility */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading configuration...</p>
          </div>
        ) : tabs.length > 0 ? (
          tabs.map((tab, tabIndex) => {
            const gradeColumns = tab.columns.filter((col: string) =>
              col !== tab.rollNumberColumn &&
              col.toLowerCase() !== "student name" &&
              col.toLowerCase() !== "name"
            );
            const visibleCount = tab.visibleColumns.length;

            return (
              <div
                key={tab.name}
                className="bg-card rounded-2xl border border-border p-6 animate-fade-in"
                style={{ animationDelay: `${(tabIndex + 2) * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-foreground">{tab.name}</h2>
                    <Switch
                      checked={tab.visible !== false}
                      onCheckedChange={(checked) => {
                        handleToggleTab(tab.name, checked);
                      }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {visibleCount} of {gradeColumns.length} visible
                  </p>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  {tab.visible !== false
                    ? "Control which grade columns are visible to students. Hidden columns will not appear in the student grades view."
                    : "This tab is hidden from students. Toggle above to show it."}
                </p>

                {tab.visible !== false && (
                  <>
                    <Separator className="my-4" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {gradeColumns.map((column: string) => {
                        const isVisible = tab.visibleColumns.includes(column);
                        const isLocked = column === tab.rollNumberColumn ||
                          column.toLowerCase() === "student name" ||
                          column.toLowerCase() === "name";

                        return (
                          <div
                            key={column}
                            className="flex items-center justify-between p-3 rounded-xl bg-muted/30"
                          >
                            <div className="flex items-center gap-2">
                              {isVisible ? (
                                <Eye className="h-4 w-4 text-primary" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-sm font-medium">{column}</span>
                            </div>
                            <Switch
                              checked={isVisible}
                              disabled={isLocked}
                              onCheckedChange={(checked) => {
                                handleToggleColumn(tab.name, column, checked);
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-card rounded-2xl border border-border p-6 text-center">
            <p className="text-muted-foreground mb-2">
              No Google Sheet configured for {selectedSection}.
            </p>
            <p className="text-sm text-muted-foreground">
              Add a sheet URL above, save it, then click "Sync Now" to automatically detect all tabs and columns.
            </p>
          </div>
        )}

        {/* Info */}
        {gradeSheet && (
          <div className="flex justify-end animate-fade-in" style={{ animationDelay: "300ms" }}>
            <p className="text-sm text-muted-foreground">
              Column visibility changes are saved automatically
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminGrades;
