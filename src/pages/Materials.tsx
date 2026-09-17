import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, FileText, Lock, CheckCircle2, Clock, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllLabs, getAllAssignments, getAllQuizzes, isSolutionVisible, type Lab, type Assignment, type Quiz } from "@/lib/content";
import { downloadFile } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { isEmailEnrolled } from "@/lib/auth";
import NotEnrolledMessage from "@/components/NotEnrolledMessage";

const LabCard = ({ lab }: { lab: Lab }) => {
  const problemFiles = lab.lab_files?.filter(f => f.file_type === 'problem') || [];
  const solutionFiles = lab.lab_files?.filter(f => f.file_type === 'solution') || [];
  const solutionVisible = isSolutionVisible(lab);
  const { toast } = useToast();

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

  return (
    <div className="p-5 rounded-2xl bg-card border border-border hover:shadow-card transition-all duration-200">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">Lab {lab.lab_number}: {lab.title}</h3>
          {lab.description && (
            <p className="text-sm text-muted-foreground mb-2 mt-1">{lab.description}</p>
          )}
          {lab.taken_date && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Taken: {new Date(lab.taken_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {problemFiles.map((file) => (
          <Button
            key={file.id}
            variant="outline"
            size="sm"
            className="rounded-xl gap-2"
            onClick={() => handleDownload(file.file_url, file.file_name)}
          >
            <FileText className="h-4 w-4" />
            {file.file_name}
            <Download className="h-3 w-3" />
          </Button>
        ))}

        {solutionFiles.length > 0 && solutionVisible ? (
          solutionFiles.map((file) => (
            <Button
              key={file.id}
              variant="default"
              size="sm"
              className="rounded-xl gap-2 hover:bg-primary/90"
              onClick={() => handleDownload(file.file_url, file.file_name)}
            >
              <FileText className="h-4 w-4" />
              Solution: {file.file_name}
              <Download className="h-3 w-3" />
            </Button>
          ))
        ) : (
          <Button variant="outline" size="sm" className="rounded-xl gap-2" disabled>
            <Lock className="h-4 w-4" />
            Solution
          </Button>
        )}
      </div>
    </div>
  );
};

const AssignmentCard = ({ assignment }: { assignment: Assignment }) => {
  const problemFiles = assignment.assignment_files?.filter(f => f.file_type === 'problem') || [];
  const solutionFiles = assignment.assignment_files?.filter(f => f.file_type === 'solution') || [];
  const instructionFiles = assignment.assignment_files?.filter(f => f.file_type === 'instructions') || [];
  const { toast } = useToast();

  const statusConfig = {
    active: { icon: Clock, label: "Active", className: "bg-info/20 text-secondary" },
    closed: { icon: CheckCircle2, label: "Closed", className: "bg-success/20 text-foreground" },
  };

  const isExpired = assignment.submission_deadline ? new Date(assignment.submission_deadline) < new Date() : false;
  const effectiveStatus = isExpired ? 'closed' : assignment.status;
  const status = statusConfig[effectiveStatus];
  const StatusIcon = status.icon;

  const handleDownload = async (fileUrl: string, fileName: string, fileType: 'assignment' | 'quiz') => {
    try {
      const path = fileUrl.split('/').slice(-2).join('/');
      await downloadFile(fileType, path, fileName);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to download file",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-card border border-border hover:shadow-card transition-all duration-200">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-foreground">Assignment {assignment.assignment_number}: {assignment.title}</h3>
            <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", status.className)}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </div>
          </div>
          {assignment.description && (
            <p className="text-sm text-muted-foreground mb-2 mt-1">{assignment.description}</p>
          )}
        </div>
      </div>

      {assignment.submission_deadline && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Clock className="h-4 w-4" />
          <span>Deadline: {new Date(assignment.submission_deadline).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {problemFiles.map((file) => (
          <Button
            key={file.id}
            variant="outline"
            size="sm"
            className="rounded-xl gap-2"
            onClick={() => handleDownload(file.file_url, file.file_name, 'assignment')}
          >
            <FileText className="h-4 w-4" />
            {file.file_name}
            <Download className="h-3 w-3" />
          </Button>
        ))}

        {solutionFiles.map((file) => (
          <Button
            key={file.id}
            variant="default"
            size="sm"
            className="rounded-xl gap-2 hover:bg-primary/90"
            onClick={() => handleDownload(file.file_url, file.file_name, 'assignment')}
          >
            <FileText className="h-4 w-4" />
            Solution: {file.file_name}
            <Download className="h-3 w-3" />
          </Button>
        ))}

        {instructionFiles.map((file) => (
          <Button
            key={file.id}
            variant="outline"
            size="sm"
            className="rounded-xl gap-2"
            onClick={() => handleDownload(file.file_url, file.file_name, 'assignment')}
          >
            <FileText className="h-4 w-4" />
            Instructions: {file.file_name}
            <Download className="h-3 w-3" />
          </Button>
        ))}
      </div>
    </div>
  );
};

const QuizCard = ({ quiz }: { quiz: Quiz }) => {
  const problemFiles = quiz.quiz_files?.filter(f => f.file_type === 'problem') || [];
  const solutionFiles = quiz.quiz_files?.filter(f => f.file_type === 'solution') || [];
  const { toast } = useToast();

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

  return (
    <div className="p-5 rounded-2xl bg-card border border-border hover:shadow-card transition-all duration-200">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-foreground">Quiz {quiz.quiz_number}: {quiz.title}</h3>
            {quiz.status === "upcoming" && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-info/20 text-secondary">
                <Clock className="h-3 w-3" />
                Upcoming
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Calendar className="h-4 w-4" />
        <span>
          {quiz.status === "upcoming" ? "Scheduled: " : "Taken: "}
          {quiz.taken_date
            ? new Date(quiz.taken_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : quiz.scheduled_date
              ? new Date(quiz.scheduled_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
              : 'Not set'}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {problemFiles.map((file) => (
          <Button
            key={file.id}
            variant="outline"
            size="sm"
            className="rounded-xl gap-2"
            onClick={() => handleDownload(file.file_url, file.file_name)}
          >
            <FileText className="h-4 w-4" />
            {file.file_name}
            <Download className="h-3 w-3" />
          </Button>
        ))}

        {solutionFiles.map((file) => (
          <Button
            key={file.id}
            variant="default"
            size="sm"
            className="rounded-xl gap-2 hover:bg-primary/90"
            onClick={() => handleDownload(file.file_url, file.file_name)}
          >
            <FileText className="h-4 w-4" />
            Solution: {file.file_name}
            <Download className="h-3 w-3" />
          </Button>
        ))}

        {problemFiles.length === 0 && solutionFiles.length === 0 && (
          <Button variant="outline" size="sm" className="rounded-xl gap-2" disabled>
            <FileText className="h-4 w-4" />
            No files available
          </Button>
        )}
      </div>
    </div>
  );
};

const Materials = () => {
  const { profile, isAdmin } = useAuth();
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);

  // Check if user is enrolled
  useEffect(() => {
    if (profile?.email && !isAdmin) {
      isEmailEnrolled(profile.email).then(enrolled => {
        setIsEnrolled(enrolled);
      });
    } else if (isAdmin) {
      setIsEnrolled(true); // Admins are always considered "enrolled"
    }
  }, [profile?.email, isAdmin]);

  // Show not enrolled message if user is not enrolled
  if (isEnrolled === false) {
    return (
      <AppLayout>
        <NotEnrolledMessage />
      </AppLayout>
    );
  }
  const location = useLocation();
  const navigate = useNavigate();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false); // Track if data has been fetched

  // Determine active tab from URL
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/labs')) return 'labs';
    if (path.includes('/assignments')) return 'assignments';
    if (path.includes('/quizzes')) return 'quizzes';
    return 'labs'; // default
  };

  // Initialize active tab from URL, persist in sessionStorage
  const [activeTab, setActiveTab] = useState(() => {
    const saved = sessionStorage.getItem('materialsActiveTab');
    return saved || getActiveTab();
  });

  // Only fetch once on mount, not on every render
  useEffect(() => {
    if (!hasFetched) {
      fetchMaterials();
      setHasFetched(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFetched]);

  // Update active tab when URL changes (but don't refetch data)
  useEffect(() => {
    const newTab = getActiveTab();
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const fetchMaterials = async () => {
    try {
      // Check cache first
      const cacheKey = 'materials-data';
      const cached = sessionStorage.getItem(cacheKey);

      if (cached) {
        try {
          const { labs: cachedLabs, assignments: cachedAssignments, quizzes: cachedQuizzes } = JSON.parse(cached);
          setLabs(cachedLabs);
          setAssignments(cachedAssignments);
          setQuizzes(cachedQuizzes);
          setLoading(false);
        } catch (e) {
          console.error("Error parsing cached materials", e);
        }
      }

      // Only show loading if not loaded from cache
      if (!cached) setLoading(true);

      const [labsData, assignmentsData, quizzesData] = await Promise.all([
        getAllLabs(),
        getAllAssignments(),
        getAllQuizzes(),
      ]);
      // Sort labs by lab_number descending (latest first) - ensure numeric sorting
      const sortedLabs = [...labsData].sort((a, b) => {
        const numA = typeof a.lab_number === 'number' ? a.lab_number : parseInt(String(a.lab_number), 10);
        const numB = typeof b.lab_number === 'number' ? b.lab_number : parseInt(String(b.lab_number), 10);
        return numB - numA; // Descending order
      });
      setLabs(sortedLabs);
      setAssignments(assignmentsData);
      setQuizzes(quizzesData);

      // Update cache
      sessionStorage.setItem(cacheKey, JSON.stringify({
        labs: sortedLabs,
        assignments: assignmentsData,
        quizzes: quizzesData
      }));
    } catch (error: any) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Persist tab selection
    sessionStorage.setItem('materialsActiveTab', value);
    // Navigate to the corresponding URL
    if (value === 'labs') {
      navigate('/materials/labs', { replace: true });
    } else if (value === 'assignments') {
      navigate('/materials/assignments', { replace: true });
    } else if (value === 'quizzes') {
      navigate('/materials/quizzes', { replace: true });
    }
  };

  if (isEnrolled === false) {
    return (
      <AppLayout>
        <NotEnrolledMessage />
      </AppLayout>
    );
  }

  if (loading || isEnrolled === null) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading materials...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Course Materials</h1>
          <p className="text-muted-foreground">Access labs, assignments, quizzes, and solutions</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="labs" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Labs ({labs.length})
            </TabsTrigger>
            <TabsTrigger value="assignments" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Assignments ({assignments.length})
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Quizzes ({quizzes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="labs" className="mt-4 space-y-4">
            {labs.length > 0 ? (
              labs.map((lab) => (
                <LabCard key={lab.id} lab={lab} />
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No labs available yet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="assignments" className="mt-4 space-y-4">
            {assignments.length > 0 ? (
              assignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No assignments available yet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="quizzes" className="mt-4 space-y-4">
            {quizzes.length > 0 ? (
              quizzes.map((quiz) => (
                <QuizCard key={quiz.id} quiz={quiz} />
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No quizzes available yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Materials;
