import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GradeDonutChart from "@/components/dashboard/GradeDonutChart";
import { getStudentGrades, getStudentStats } from "@/lib/studentData";
import { getCachedStudentRank } from "@/lib/rankingCache";
import { getLetterGrade } from "@/lib/grading";
import { Skeleton } from "@/components/ui/skeleton";
import { Award } from "lucide-react";
import type { EnrolledStudent } from "@/lib/students";

interface StudentDetailDialogProps {
  student: EnrolledStudent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GradeCard = ({ item }: { item: any }) => {
  const isBonusOrPenalty = item.isBonusOrPenalty;
  const percentage = isBonusOrPenalty ? 100 : (item.total > 0 ? Math.round((item.score / item.total) * 100) : 0);

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:shadow-soft transition-all">
      {!isBonusOrPenalty && (
        <GradeDonutChart
          percentage={percentage}
          size="sm"
          label=""
        />
      )}
      {isBonusOrPenalty && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <span className="text-lg font-bold text-foreground">
            {item.score > 0 ? '+' : ''}{item.score?.toFixed(0) || 0}
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{item.title}</p>
      </div>
      <div className="text-right">
        {isBonusOrPenalty ? (
          <p className="font-semibold text-foreground text-lg">
            {item.score > 0 ? '+' : ''}{item.score?.toFixed(0) || 0}
          </p>
        ) : (
          <>
            <p className="font-semibold text-foreground">
              {item.score?.toFixed(1) || 0}/{item.total}
            </p>
            <p className="text-sm text-muted-foreground">{percentage}%</p>
          </>
        )}
      </div>
    </div>
  );
};

const CategorySummary = ({
  title,
  score,
  total,
  count
}: {
  title: string;
  score: number;
  total: number;
  count: number;
}) => {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
      <div className="flex-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{count} items</p>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold text-foreground">{percentage}%</p>
        <p className="text-sm text-muted-foreground">{score.toFixed(1)}/{total.toFixed(1)}</p>
      </div>
    </div>
  );
};

const StudentDetailDialog = ({ student, open, onOpenChange }: StudentDetailDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [gradeData, setGradeData] = useState<{
    tabs: Array<{
      name: string;
      items: Array<{
        id: string;
        title: string;
        score: number;
        total: number;
        columnName: string;
        isBonusOrPenalty?: boolean;
      }>;
      visible: boolean;
    }>;
    labs: any[];
    assignments: any[];
    quizzes: any[];
    exams: any[];
  }>({
    tabs: [],
    labs: [],
    assignments: [],
    quizzes: [],
    exams: [],
  });
  const [stats, setStats] = useState<{
    overallLabGrade: number;
    overallCourseGrade: number;
    overall: number;
    labs: { score: number; total: number; count: number };
    assignments: { score: number; total: number; count: number };
    quizzes: { score: number; total: number; count: number };
    exams: { score: number; total: number; count: number };
  } | null>(null);
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    if (open && student) {
      fetchStudentData();
    } else {
      // Reset when dialog closes
      setGradeData({
        tabs: [],
        labs: [],
        assignments: [],
        quizzes: [],
        exams: [],
      });
      setStats(null);
      setRank(null);
    }
  }, [open, student]);

  const fetchStudentData = async () => {
    if (!student) return;

    try {
      setLoading(true);
      // Load all data in parallel - rank will use cache if available
      const [grades, studentStats, studentRank] = await Promise.all([
        getStudentGrades(student.roll_number, student.section),
        getStudentStats(student.roll_number, student.section),
        getCachedStudentRank(student.roll_number, student.section),
      ]);
      setGradeData(grades);
      setStats(studentStats);
      setRank(studentRank);
    } catch (error: any) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter visible tabs only
  const visibleTabs = gradeData.tabs.filter(tab => {
    if (tab.visible === false) {
      return false;
    }
    return true;
  });

  // Calculate summary for each visible tab (exclude "Extra" tab)
  const tabSummaries = visibleTabs
    .filter(tab => {
      const tabNameLower = tab.name.toLowerCase().trim();
      return tabNameLower !== 'extra';
    })
    .map(tab => {
      const regularItems = tab.items.filter(item => !item.isBonusOrPenalty);
      const score = regularItems.reduce((acc, item) => acc + (item.score || 0), 0);
      const total = regularItems.reduce((acc, item) => acc + (item.total || 0), 0);
      return {
        name: tab.name,
        score,
        total,
        count: regularItems.length,
      };
    });

  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    if (visibleTabs.length > 0 && !loading) {
      if (!activeTab || !visibleTabs.some(t => t.name.toLowerCase().replace(/\s+/g, '-') === activeTab)) {
        const firstTab = visibleTabs[0].name.toLowerCase().replace(/\s+/g, '-');
        setActiveTab(firstTab);
      }
    }
  }, [loading, visibleTabs.length, activeTab]);

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] rounded-2xl p-0 overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {student.name} - {student.roll_number}
            </DialogTitle>
            <DialogDescription>
              Complete grade record and performance overview
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-padding">
          {loading ? (
            <div className="space-y-4 py-8">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
            {/* Overall Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card rounded-xl border border-border p-4">
                  <p className="text-sm text-muted-foreground mb-1">Lab Grade</p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.overallLabGrade > 0 ? `${stats.overallLabGrade}%` : '—'}
                  </p>
                  {stats.overallLabGrade > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {getLetterGrade(stats.overallLabGrade)}
                    </p>
                  )}
                </div>
                <div className="bg-card rounded-xl border border-border p-4">
                  <p className="text-sm text-muted-foreground mb-1">Overall Lab Ranking</p>
                  {rank ? (
                    <>
                      <p className="text-2xl font-bold text-foreground">#{rank}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Rank in {student.section}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-foreground">—</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Rank not available
                      </p>
                    </>
                  )}
                </div>
                <div className="bg-card rounded-xl border border-border p-4">
                  <p className="text-sm text-muted-foreground mb-1">Labs</p>
                  <p className="text-2xl font-bold text-foreground">{stats.labs.count}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.labs.score.toFixed(1)}/{stats.labs.total.toFixed(1)}
                  </p>
                </div>
                <div className="bg-card rounded-xl border border-border p-4">
                  <p className="text-sm text-muted-foreground mb-1">Assignments</p>
                  <p className="text-2xl font-bold text-foreground">{stats.assignments.count}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.assignments.score.toFixed(1)}/{stats.assignments.total.toFixed(1)}
                  </p>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            {tabSummaries.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {tabSummaries.map((summary) => (
                  <CategorySummary
                    key={summary.name}
                    title={summary.name}
                    score={summary.score}
                    total={summary.total}
                    count={summary.count}
                  />
                ))}
              </div>
            )}

            {/* Grades Tabs */}
            {visibleTabs.length > 0 ? (
              <Tabs
                value={activeTab || (visibleTabs.length > 0 ? visibleTabs[0].name.toLowerCase().replace(/\s+/g, '-') : '')}
                onValueChange={setActiveTab}
              >
                <TabsList className="bg-muted/50 p-2 rounded-xl grid grid-cols-3 sm:flex sm:flex-wrap gap-3 sm:justify-start">
                  {visibleTabs.map((tab) => {
                    const tabValue = tab.name.toLowerCase().replace(/\s+/g, '-');
                    return (
                      <TabsTrigger
                        key={tab.name}
                        value={tabValue}
                        className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm truncate px-3 py-1.5"
                      >
                        <span className="truncate">{tab.name} ({tab.items.length})</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {visibleTabs.map((tab) => {
                  const tabValue = tab.name.toLowerCase().replace(/\s+/g, '-');
                  return (
                    <TabsContent key={tab.name} value={tabValue} className="mt-4 space-y-3">
                      {tab.items.length > 0 ? (
                        tab.items.map((item) => (
                          <GradeCard key={item.id} item={item} />
                        ))
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <p>No grades available in {tab.name} yet.</p>
                        </div>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No grades available yet.</p>
                <p className="text-sm mt-2">Grades will appear here once they're synced from Google Sheets.</p>
              </div>
            )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentDetailDialog;
