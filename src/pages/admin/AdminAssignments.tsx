import { useState, useEffect } from "react";
import { Plus, Clock, FileText, Download, Upload, MoreHorizontal, Pencil, Trash2, CheckCircle2, X } from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  deleteAssignmentFile,
  type Assignment,
} from "@/lib/content";
import { downloadFile } from "@/lib/storage";
import { cn } from "@/lib/utils";

const AdminAssignments = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false); // Start false
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteFileDialogOpen, setDeleteFileDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [fileToDelete, setFileToDelete] = useState<{ fileId: string; fileUrl: string } | null>(null);
  const [formData, setFormData] = useState({
    assignment_number: "",
    title: "",
    description: "",
    submission_deadline: "",
    status: "active" as "active" | "closed",
  });
  const [problemFile, setProblemFile] = useState<File | null>(null);
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const [instructionsFile, setInstructionsFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const data = await getAllAssignments();
      setAssignments(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleSubmit = async () => {
    if (!formData.assignment_number || !formData.title) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
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
      const files = [];
      if (problemFile) files.push({ file: problemFile, type: 'problem' as const });
      if (solutionFile) files.push({ file: solutionFile, type: 'solution' as const });
      if (instructionsFile) files.push({ file: instructionsFile, type: 'instructions' as const });

      if (editingAssignment) {
        await updateAssignment(editingAssignment.id, {
          assignment_number: parseInt(formData.assignment_number),
          title: formData.title,
          description: formData.description || null,
          submission_deadline: formData.submission_deadline || null,
          status: formData.status,
        }, files.length > 0 ? files : undefined);
        
        toast({ title: "Success", description: "Assignment updated successfully" });
      } else {
        await createAssignment({
          assignment_number: parseInt(formData.assignment_number),
          title: formData.title,
          description: formData.description || null,
          submission_deadline: formData.submission_deadline || null,
          status: formData.status,
        }, files, user.id);
        
        toast({ title: "Success", description: "Assignment created successfully" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchAssignments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save assignment",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (assignment: Assignment) => {
    setAssignmentToDelete(assignment);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!assignmentToDelete) return;

    try {
      await deleteAssignment(assignmentToDelete.id);
      toast({ title: "Success", description: "Assignment deleted successfully" });
      setDeleteDialogOpen(false);
      setAssignmentToDelete(null);
      fetchAssignments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete assignment",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFileClick = (fileId: string, fileUrl: string) => {
    setFileToDelete({ fileId, fileUrl });
    setDeleteFileDialogOpen(true);
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;

    try {
      await deleteAssignmentFile(fileToDelete.fileId, fileToDelete.fileUrl);
      toast({ title: "Success", description: "File deleted successfully" });
      setDeleteFileDialogOpen(false);
      setFileToDelete(null);
      fetchAssignments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const path = fileUrl.split('/').slice(-2).join('/');
      await downloadFile('assignment', path, fileName);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      assignment_number: "",
      title: "",
      description: "",
      submission_deadline: "",
      status: "active",
    });
    setProblemFile(null);
    setSolutionFile(null);
    setInstructionsFile(null);
    setEditingAssignment(null);
  };

  const openEditDialog = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      assignment_number: assignment.assignment_number.toString(),
      title: assignment.title,
      description: assignment.description || "",
      submission_deadline: assignment.submission_deadline ? new Date(assignment.submission_deadline).toISOString().slice(0, 16) : "",
      status: assignment.status,
    });
    setIsDialogOpen(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Assignments</h1>
            <p className="text-muted-foreground">Manage assignments and deadlines</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl gap-2 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Add Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAssignment ? "Edit Assignment" : "Add New Assignment"}</DialogTitle>
                <DialogDescription>
                  {editingAssignment ? "Update assignment information" : "Create a new assignment with submission deadline"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assignment_number">Assignment Number *</Label>
                    <Input
                      id="assignment_number"
                      type="number"
                      placeholder="1"
                      value={formData.assignment_number}
                      onChange={(e) => setFormData({ ...formData, assignment_number: e.target.value })}
                      className="rounded-xl"
                      disabled={!!editingAssignment}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value: "active" | "closed") => setFormData({ ...formData, status: value })}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Assignment Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Graph Algorithms"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Assignment description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="rounded-xl"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="submission_deadline">Submission Deadline</Label>
                  <Input
                    id="submission_deadline"
                    type="datetime-local"
                    value={formData.submission_deadline}
                    onChange={(e) => setFormData({ ...formData, submission_deadline: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assignment Problem File</Label>
                  <Input
                    type="file"
                    accept=".pdf,.zip"
                    onChange={(e) => setProblemFile(e.target.files?.[0] || null)}
                    className="rounded-xl"
                  />
                  {problemFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{problemFile.name}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setProblemFile(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Solution File (Optional)</Label>
                  <Input
                    type="file"
                    accept=".pdf,.zip"
                    onChange={(e) => setSolutionFile(e.target.files?.[0] || null)}
                    className="rounded-xl"
                  />
                  {solutionFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{solutionFile.name}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSolutionFile(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Instructions File (Optional)</Label>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setInstructionsFile(e.target.files?.[0] || null)}
                    className="rounded-xl"
                  />
                  {instructionsFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{instructionsFile.name}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setInstructionsFile(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleSubmit} className="rounded-xl bg-primary">
                  {editingAssignment ? "Update Assignment" : "Create Assignment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading assignments...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment, index) => {
              const problemFiles = assignment.assignment_files?.filter(f => f.file_type === 'problem') || [];
              const solutionFiles = assignment.assignment_files?.filter(f => f.file_type === 'solution') || [];
              const instructionFiles = assignment.assignment_files?.filter(f => f.file_type === 'instructions') || [];

              // Automatically determine status based on deadline
              const isExpired = assignment.submission_deadline 
                ? new Date(assignment.submission_deadline) < new Date() 
                : false;
              const effectiveStatus = isExpired ? 'closed' : assignment.status;
              const statusConfig = effectiveStatus === 'active' 
                ? { icon: Clock, label: "Active", className: "bg-info/20 text-secondary" }
                : { icon: CheckCircle2, label: "Closed", className: "bg-success/20 text-foreground" };
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={assignment.id}
                  className="p-5 rounded-2xl bg-card border border-border hover:shadow-card transition-all duration-200 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/20 text-secondary text-sm font-semibold">
                          {assignment.assignment_number}
                        </span>
                        <h3 className="font-semibold text-foreground">Assignment {assignment.assignment_number}: {assignment.title}</h3>
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                          statusConfig.className
                        )}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </div>
                      </div>
                      {assignment.description && (
                        <p className="text-sm text-muted-foreground mb-2">{assignment.description}</p>
                      )}
                      {assignment.submission_deadline && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                          <Clock className="h-4 w-4" />
                          <span>Deadline: {formatDate(assignment.submission_deadline)}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {problemFiles.map((file) => (
                          <div key={file.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>{file.file_name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={() => handleDownload(file.file_url, file.file_name)}>
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 rounded-md text-destructive" 
                              onClick={() => handleDeleteFileClick(file.id, file.file_url)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {solutionFiles.map((file) => (
                          <div key={file.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 text-sm">
                            <FileText className="h-4 w-4 text-primary" />
                            <span>{file.file_name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={() => handleDownload(file.file_url, file.file_name)}>
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 rounded-md text-destructive" 
                              onClick={() => handleDeleteFileClick(file.id, file.file_url)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {instructionFiles.map((file) => (
                          <div key={file.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-info/10 text-sm">
                            <FileText className="h-4 w-4 text-secondary" />
                            <span>{file.file_name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={() => handleDownload(file.file_url, file.file_name)}>
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 rounded-md text-destructive" 
                              onClick={() => handleDeleteFileClick(file.id, file.file_url)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-lg">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem className="rounded-lg" onClick={() => openEditDialog(assignment)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-lg text-destructive" onClick={() => handleDeleteClick(assignment)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
            {assignments.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No assignments found. Create your first assignment to get started.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Assignment Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete Assignment {assignmentToDelete?.assignment_number}: {assignmentToDelete?.title}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete File Dialog */}
      <AlertDialog open={deleteFileDialogOpen} onOpenChange={setDeleteFileDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFile} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminAssignments;
