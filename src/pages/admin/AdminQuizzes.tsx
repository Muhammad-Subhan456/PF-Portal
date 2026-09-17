import { useState, useEffect } from "react";
import { Plus, Calendar, FileText, Download, Upload, MoreHorizontal, Pencil, Trash2, Clock, X } from "lucide-react";
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
  getAllQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  deleteQuizFile,
  type Quiz,
} from "@/lib/content";
import { downloadFile } from "@/lib/storage";
import { cn } from "@/lib/utils";

const AdminQuizzes = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false); // Start false
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [formData, setFormData] = useState({
    quiz_number: "",
    title: "",
    description: "",
    scheduled_date: "",
    taken_date: "",
    status: "upcoming" as "completed" | "upcoming",
  });
  const [problemFile, setProblemFile] = useState<File | null>(null);
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const data = await getAllQuizzes();
      setQuizzes(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch quizzes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleSubmit = async () => {
    if (!formData.quiz_number || !formData.title) {
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

      if (editingQuiz) {
        await updateQuiz(editingQuiz.id, {
          quiz_number: parseInt(formData.quiz_number),
          title: formData.title,
          description: formData.description || null,
          scheduled_date: formData.scheduled_date || null,
          taken_date: formData.taken_date || null,
          status: formData.status,
        }, files.length > 0 ? files : undefined);
        
        toast({ title: "Success", description: "Quiz updated successfully" });
      } else {
        await createQuiz({
          quiz_number: parseInt(formData.quiz_number),
          title: formData.title,
          description: formData.description || null,
          scheduled_date: formData.scheduled_date || null,
          taken_date: formData.taken_date || null,
          status: formData.status,
        }, files, user.id);
        
        toast({ title: "Success", description: "Quiz created successfully" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchQuizzes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save quiz",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (quiz: Quiz) => {
    if (!confirm(`Are you sure you want to delete Quiz ${quiz.quiz_number}: ${quiz.title}?`)) {
      return;
    }

    try {
      await deleteQuiz(quiz.id);
      toast({ title: "Success", description: "Quiz deleted successfully" });
      fetchQuizzes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete quiz",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFile = async (fileId: string, fileUrl: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      await deleteQuizFile(fileId, fileUrl);
      toast({ title: "Success", description: "File deleted successfully" });
      fetchQuizzes();
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
      await downloadFile('quiz', path, fileName);
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
      quiz_number: "",
      title: "",
      description: "",
      scheduled_date: "",
      taken_date: "",
      status: "upcoming",
    });
    setProblemFile(null);
    setSolutionFile(null);
    setEditingQuiz(null);
  };

  const openEditDialog = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setFormData({
      quiz_number: quiz.quiz_number.toString(),
      title: quiz.title,
      description: quiz.description || "",
      scheduled_date: quiz.scheduled_date || "",
      taken_date: quiz.taken_date || "",
      status: quiz.status,
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Quizzes</h1>
            <p className="text-muted-foreground">Manage quizzes and solutions</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl gap-2 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Add Quiz
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingQuiz ? "Edit Quiz" : "Add New Quiz"}</DialogTitle>
                <DialogDescription>
                  {editingQuiz ? "Update quiz information" : "Schedule a new quiz for the course"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quiz_number">Quiz Number *</Label>
                    <Input
                      id="quiz_number"
                      type="number"
                      placeholder="1"
                      value={formData.quiz_number}
                      onChange={(e) => setFormData({ ...formData, quiz_number: e.target.value })}
                      className="rounded-xl"
                      disabled={!!editingQuiz}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value: "completed" | "upcoming") => setFormData({ ...formData, status: value })}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Quiz Title *</Label>
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
                    placeholder="Quiz description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="rounded-xl"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_date">Scheduled Date</Label>
                    <Input
                      id="scheduled_date"
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                      className="rounded-xl"
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
                  <Label>Quiz Problem File (Optional - upload after quiz)</Label>
                  <Input
                    type="file"
                    accept=".pdf"
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
                    accept=".pdf"
                    onChange={(e) => setSolutionFile(e.target.files?.[0] || null)}
                    className="rounded-xl"
                    disabled={formData.status === "upcoming"}
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
                  {formData.status === "upcoming" && (
                    <p className="text-xs text-muted-foreground">Solution can only be uploaded after quiz is completed</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleSubmit} className="rounded-xl bg-primary">
                  {editingQuiz ? "Update Quiz" : "Create Quiz"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading quizzes...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map((quiz, index) => {
              const problemFiles = quiz.quiz_files?.filter(f => f.file_type === 'problem') || [];
              const solutionFiles = quiz.quiz_files?.filter(f => f.file_type === 'solution') || [];

              return (
                <div
                  key={quiz.id}
                  className="p-5 rounded-2xl bg-card border border-border hover:shadow-card transition-all duration-200 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/20 text-secondary text-sm font-semibold">
                          {quiz.quiz_number}
                        </span>
                        <h3 className="font-semibold text-foreground">Quiz {quiz.quiz_number}: {quiz.title}</h3>
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                          quiz.status === "upcoming" 
                            ? "bg-info/20 text-secondary" 
                            : "bg-success/20 text-foreground"
                        )}>
                          {quiz.status === "upcoming" ? (
                            <>
                              <Clock className="h-3 w-3" />
                              Upcoming
                            </>
                          ) : (
                            "Completed"
                          )}
                        </div>
                      </div>
                      {quiz.description && (
                        <p className="text-sm text-muted-foreground mb-2">{quiz.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
                        {quiz.scheduled_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Scheduled: {formatDate(quiz.scheduled_date)}</span>
                          </div>
                        )}
                        {quiz.taken_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Taken: {formatDate(quiz.taken_date)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {problemFiles.map((file) => (
                          <div key={file.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>{file.file_name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={() => handleDownload(file.file_url, file.file_name)}>
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-destructive" onClick={() => handleDeleteFile(file.id, file.file_url)}>
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
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-destructive" onClick={() => handleDeleteFile(file.id, file.file_url)}>
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
                        {solutionFiles.length === 0 && quiz.status === "completed" && (
                          <Button variant="outline" size="sm" className="rounded-lg gap-2 border-dashed" disabled>
                            <Upload className="h-4 w-4" />
                            No Solution
                          </Button>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-lg">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem className="rounded-lg" onClick={() => openEditDialog(quiz)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-lg text-destructive" onClick={() => handleDelete(quiz)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
            {quizzes.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No quizzes found. Create your first quiz to get started.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminQuizzes;
