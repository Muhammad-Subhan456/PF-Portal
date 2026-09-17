import { useState, useEffect } from "react";
import { Plus, Calendar, FileText, Download, Upload, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllLabs,
  createLab,
  updateLab,
  deleteLab,
  deleteLabFile,
  isSolutionVisible,
  type Lab,
} from "@/lib/content";
import { downloadFile } from "@/lib/storage";

const AdminLabs = () => {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(false); // Start false
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<Lab | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteFileDialogOpen, setDeleteFileDialogOpen] = useState(false);
  const [labToDelete, setLabToDelete] = useState<Lab | null>(null);
  const [fileToDelete, setFileToDelete] = useState<{ fileId: string; fileUrl: string; labId: string } | null>(null);
  const [formData, setFormData] = useState({
    lab_number: "",
    title: "",
    description: "",
    taken_date: "",
    solution_visible_after: "",
  });
  const [problemFile, setProblemFile] = useState<File | null>(null);
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const [starterCodeFile, setStarterCodeFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchLabs = async () => {
    try {
      setLoading(true);
      const data = await getAllLabs();
      setLabs(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch labs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, []);

  const handleSubmit = async () => {
    if (!formData.lab_number || !formData.title) {
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
      if (starterCodeFile) files.push({ file: starterCodeFile, type: 'starter_code' as const });

      if (editingLab) {
        await updateLab(editingLab.id, {
          lab_number: parseInt(formData.lab_number),
          title: formData.title,
          description: formData.description || null,
          taken_date: formData.taken_date || null,
          deadline: null, // Labs don't have deadlines
          solution_visible_after: formData.solution_visible_after || null,
        }, files.length > 0 ? files : undefined);
        
        toast({
          title: "Success",
          description: "Lab updated successfully",
        });
      } else {
        await createLab({
          lab_number: parseInt(formData.lab_number),
          title: formData.title,
          description: formData.description || null,
          taken_date: formData.taken_date || null,
          deadline: null, // Labs don't have deadlines
          solution_visible_after: formData.solution_visible_after || null,
        }, files, user.id);
        
        toast({
          title: "Success",
          description: "Lab created successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchLabs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save lab",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (lab: Lab) => {
    setLabToDelete(lab);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!labToDelete) return;

    try {
      await deleteLab(labToDelete.id);
      toast({
        title: "Success",
        description: "Lab deleted successfully",
      });
      setDeleteDialogOpen(false);
      setLabToDelete(null);
      fetchLabs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lab",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFileClick = (fileId: string, fileUrl: string, labId: string) => {
    setFileToDelete({ fileId, fileUrl, labId });
    setDeleteFileDialogOpen(true);
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;

    try {
      await deleteLabFile(fileToDelete.fileId, fileToDelete.fileUrl);
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
      setDeleteFileDialogOpen(false);
      setFileToDelete(null);
      fetchLabs();
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
      await downloadFile('lab', path, fileName);
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
      lab_number: "",
      title: "",
      description: "",
      taken_date: "",
      solution_visible_after: "",
    });
    setProblemFile(null);
    setSolutionFile(null);
    setStarterCodeFile(null);
    setEditingLab(null);
  };

  const openEditDialog = (lab: Lab) => {
    setEditingLab(lab);
    setFormData({
      lab_number: lab.lab_number.toString(),
      title: lab.title,
      description: lab.description || "",
      taken_date: lab.taken_date || "",
      solution_visible_after: lab.solution_visible_after ? new Date(lab.solution_visible_after).toISOString().split('T')[0] : "",
    });
    setIsDialogOpen(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Labs</h1>
            <p className="text-muted-foreground">Manage lab materials and solutions</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl gap-2 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Add Lab
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingLab ? "Edit Lab" : "Add New Lab"}</DialogTitle>
                <DialogDescription>
                  {editingLab ? "Update lab information and files" : "Create a new lab entry with materials"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lab_number">Lab Number *</Label>
                    <Input
                      id="lab_number"
                      type="number"
                      placeholder="1"
                      value={formData.lab_number}
                      onChange={(e) => setFormData({ ...formData, lab_number: e.target.value })}
                      className="rounded-xl"
                      disabled={!!editingLab}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taken_date">Taken Date</Label>
                    <Input
                      id="taken_date"
                      type="date"
                      value={formData.taken_date}
                      onChange={(e) => setFormData({ ...formData, taken_date: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Lab Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Hash Tables"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Lab description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="rounded-xl"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="solution_visible_after">Solution Visible After</Label>
                  <Input
                    id="solution_visible_after"
                    type="datetime-local"
                    value={formData.solution_visible_after}
                    onChange={(e) => setFormData({ ...formData, solution_visible_after: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lab Problem File</Label>
                  <Input
                    type="file"
                    accept=".pdf,.zip,.cpp,.java,.py"
                    onChange={(e) => setProblemFile(e.target.files?.[0] || null)}
                    className="rounded-xl"
                  />
                  {problemFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{problemFile.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setProblemFile(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Solution File (Optional)</Label>
                  <Input
                    type="file"
                    accept=".pdf,.zip,.cpp,.java,.py"
                    onChange={(e) => setSolutionFile(e.target.files?.[0] || null)}
                    className="rounded-xl"
                  />
                  {solutionFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{solutionFile.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setSolutionFile(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Starter Code (Optional)</Label>
                  <Input
                    type="file"
                    accept=".zip,.cpp,.java,.py"
                    onChange={(e) => setStarterCodeFile(e.target.files?.[0] || null)}
                    className="rounded-xl"
                  />
                  {starterCodeFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{starterCodeFile.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setStarterCodeFile(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} className="rounded-xl bg-primary">
                  {editingLab ? "Update Lab" : "Create Lab"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Labs Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading labs...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {labs.map((lab, index) => {
              const problemFiles = lab.lab_files?.filter(f => f.file_type === 'problem') || [];
              const solutionFiles = lab.lab_files?.filter(f => f.file_type === 'solution') || [];
              const starterCodeFiles = lab.lab_files?.filter(f => f.file_type === 'starter_code') || [];
              const solutionVisible = isSolutionVisible(lab);

              return (
                <div
                  key={lab.id}
                  className="p-5 rounded-2xl bg-card border border-border hover:shadow-card transition-all duration-200 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary text-sm font-semibold">
                          {lab.lab_number}
                        </span>
                        <h3 className="font-semibold text-foreground">Lab {lab.lab_number}: {lab.title}</h3>
                      </div>
                      {lab.description && (
                        <p className="text-sm text-muted-foreground mb-2">{lab.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
                        {lab.taken_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Taken: {formatDate(lab.taken_date)}</span>
                          </div>
                        )}
                        {lab.deadline && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Deadline: {formatDate(lab.deadline)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {problemFiles.map((file) => (
                          <div key={file.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>{file.file_name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-md"
                              onClick={() => handleDownload(file.file_url, file.file_name)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-md text-destructive"
                              onClick={() => handleDeleteFileClick(file.id, file.file_url, lab.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {problemFiles.length === 0 && (
                          <Button variant="outline" size="sm" className="rounded-lg gap-2" disabled>
                            <Upload className="h-4 w-4" />
                            No Problem File
                          </Button>
                        )}
                        
                        {solutionFiles.map((file) => (
                          <div key={file.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 text-sm">
                            <FileText className="h-4 w-4 text-primary" />
                            <span>{file.file_name}</span>
                            {solutionVisible && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-md"
                                onClick={() => handleDownload(file.file_url, file.file_name)}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-md text-destructive"
                              onClick={() => handleDeleteFileClick(file.id, file.file_url, lab.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {solutionFiles.length === 0 && (
                          <Button variant="outline" size="sm" className="rounded-lg gap-2 border-dashed" disabled>
                            <Upload className="h-4 w-4" />
                            No Solution
                          </Button>
                        )}

                        {starterCodeFiles.map((file) => (
                          <div key={file.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-info/10 text-sm">
                            <FileText className="h-4 w-4 text-secondary" />
                            <span>{file.file_name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-md"
                              onClick={() => handleDownload(file.file_url, file.file_name)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-md text-destructive"
                              onClick={() => handleDeleteFileClick(file.id, file.file_url, lab.id)}
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
                        <DropdownMenuItem className="rounded-lg" onClick={() => openEditDialog(lab)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-lg text-destructive" onClick={() => handleDeleteClick(lab)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
            {labs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No labs found. Create your first lab to get started.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Lab Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lab</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete Lab {labToDelete?.lab_number}: {labToDelete?.title}? This action cannot be undone.
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

export default AdminLabs;
