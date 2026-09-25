import { useState, useEffect, type FormEvent } from "react";
import { Copy, Plus, Trash2, Calendar, Users, LogOut, GraduationCap, AlertTriangle, Loader2, X } from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_GRADE_SCALE } from "@/lib/grading";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Admin = {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  added_at: string;
};

const AdminSettings = () => {
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null);

  const fetchAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('added_at', { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error: any) {
      console.error("Error fetching admins:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch admins",
        variant: "destructive",
      });
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleAddAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setAddingAdmin(true);

      // Check if already exists in admins table
      const { data: existing } = await supabase
        .from('admins')
        .select('id')
        .eq('email', newAdminEmail.toLowerCase())
        .maybeSingle();

      if (existing) {
        toast({
          title: "Info",
          description: "This email is already in the admin list.",
        });
        setNewAdminEmail("");
        return;
      }

      const { error } = await supabase
        .from('admins')
        .insert({
          email: newAdminEmail.toLowerCase(),
          name: newAdminEmail.split('@')[0], // Use email prefix as default name
          is_active: true,
          added_by: user?.id || null
        } as any);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${newAdminEmail} has been added as a Teaching Assistant/Admin.`,
      });
      setNewAdminEmail("");
      await fetchAdmins(); // Refresh admin list
    } catch (error: any) {
      console.error("Error adding admin:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add admin",
        variant: "destructive",
      });
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdminClick = (admin: Admin) => {
    setAdminToDelete(admin);
    setDeleteDialogOpen(true);
  };

  const handleRemoveAdmin = async () => {
    if (!adminToDelete) return;

    try {
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('id', adminToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${adminToDelete.email} has been removed as an admin.`,
      });
      setDeleteDialogOpen(false);
      setAdminToDelete(null);
      await fetchAdmins(); // Refresh admin list
    } catch (error: any) {
      console.error("Error removing admin:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove admin",
        variant: "destructive",
      });
    }
  };

  const handleResetSystem = async () => {
    const confirmed = window.confirm(
      "CRITICAL WARNING: This will DELETE ALL student data, grades, and enrollments.\n\nOnly Admin accounts will remain.\n\nAre you absolutely sure you want to proceed?"
    );

    if (!confirmed) return;

    const doubleConfirmed = window.confirm(
      "Please confirm again: This action CANNOT be undone. All student progress will be lost.\n\nType OK to proceed."
    );

    if (!doubleConfirmed) return;

    try {
      setResetting(true);

      // Delete all rows via filters on real columns (Supabase requires a filter;
      // grade_data has no `id` — PK is sheet_id + tab_name + roll_number)

      // 1. Delete Grade Data
      const { error: gradeError } = await supabase
        .from('grade_data')
        .delete()
        .neq('roll_number', '');
      if (gradeError) throw gradeError;

      // 2. Delete Grade Sheets (Configs)
      const { error: sheetError } = await supabase
        .from('grade_sheets')
        .delete()
        .neq('sheet_id', '');
      if (sheetError) throw sheetError;

      // 3. Delete Enrolled Students
      const { error: enrollError } = await supabase
        .from('enrolled_students')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (enrollError) throw enrollError;

      // 4. Clear non-admin user profiles (keep admin accounts)
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('is_admin', false);
      if (userError) throw userError;

      toast({
        title: "System Reset Complete",
        description: "All student data, grades, and enrollments have been wiped.",
      });

    } catch (error: any) {
      console.error("Reset error:", error);
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset system data. Check permissions.",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Admin Settings</h1>
          <p className="text-muted-foreground">Configure portal settings and preferences</p>
        </div>

        {/* Course Info */}
        <div
          className="bg-card rounded-2xl border border-border p-6 animate-fade-in"
          style={{ animationDelay: "100ms" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Course Information</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="courseName">Course Name</Label>
              <Input
                id="courseName"
                defaultValue="Programming Fundamentals"
                className="rounded-xl"
                readOnly
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="semester">Semester</Label>
                <Input id="semester" defaultValue="Fall 2026" className="rounded-xl" readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="section">Batch</Label>
                <Input id="section" defaultValue="CS-F26" className="rounded-xl" readOnly />
              </div>
            </div>
          </div>
        </div>

        {/* Grading System */}
        <div
          className="bg-card rounded-2xl border border-border p-6 animate-fade-in"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <GraduationCap className="h-5 w-5 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Grading System</h2>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Current grading scale used to calculate letter grades from percentages.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 font-semibold text-foreground">Min %</th>
                    <th className="text-left p-2 font-semibold text-foreground">Max %</th>
                    <th className="text-left p-2 font-semibold text-foreground">Letter</th>
                    <th className="text-left p-2 font-semibold text-foreground">GPA</th>
                  </tr>
                </thead>
                <tbody>
                  {DEFAULT_GRADE_SCALE.map((grade, index) => (
                    <tr key={index} className="border-b border-border/50">
                      <td className="p-2 text-muted-foreground">{grade.min}</td>
                      <td className="p-2 text-muted-foreground">{grade.max}</td>
                      <td className="p-2 font-medium text-foreground">{grade.letter}</td>
                      <td className="p-2 text-muted-foreground">{grade.gpa.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Manage TAs */}
        <div
          className="bg-card rounded-2xl border border-border p-6 animate-fade-in"
          style={{ animationDelay: "300ms" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Teaching Assistants / Admins</h2>
          </div>

          <div className="space-y-4">
            <form onSubmit={handleAddAdmin} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="adminEmail" className="sr-only">Email</Label>
                <Input
                  id="adminEmail"
                  placeholder="Enter TA email..."
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <Button type="submit" disabled={addingAdmin} className="rounded-xl">
                {addingAdmin ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">
              Added emails will be granted Admin access immediately. They must login with Google.
            </p>

            {/* Admin List */}
            {loadingAdmins ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : admins.length > 0 ? (
              <div className="space-y-2 mt-4">
                <Label className="text-sm font-semibold">Current Admins ({admins.length})</Label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {admins.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{admin.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{admin.name}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveAdminClick(admin)}
                        disabled={admin.email === user?.email}
                        title={admin.email === user?.email ? "Cannot remove yourself" : "Remove admin"}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground mt-4">
                No admins found. Add one above.
              </div>
            )}
          </div>
        </div>

        {/* Remove Admin Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Admin</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {adminToDelete?.email} as an admin? They will lose access to the admin panel immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveAdmin}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Danger Zone */}
        <div
          className="bg-card rounded-2xl border border-destructive/30 p-6 animate-fade-in"
          style={{ animationDelay: "400ms" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              These actions are irreversible. Proceed with caution.
            </p>
            <Button
              variant="outline"
              className="w-full rounded-xl border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground justify-start"
              onClick={handleResetSystem}
              disabled={resetting}
            >
              {resetting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Reset System (Delete All Student Data)
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl hover:bg-muted justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
