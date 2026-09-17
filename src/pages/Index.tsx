import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, BookOpen, FileText, HelpCircle, Award } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import StatCard from "@/components/dashboard/StatCard";
import GradeDonutChart from "@/components/dashboard/GradeDonutChart";
import CategoryBarChart from "@/components/dashboard/CategoryBarChart";
import UpcomingDeadlines from "@/components/dashboard/UpcomingDeadlines";
import { useAuth } from "@/contexts/AuthContext";
import { getStudentStats, getUpcomingDeadlines } from "@/lib/studentData";
import { getLetterGrade } from "@/lib/grading";
import { isEmailEnrolled } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import NotEnrolledMessage from "@/components/NotEnrolledMessage";

const Index = () => {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true); // Start true, will be set false after first load
  const [stats, setStats] = useState<{
    overallLabGrade: number;
    overallCourseGrade: number;
    overall: number;
    labs: { score: number; total: number; count: number };
    assignments: { score: number; total: number; count: number };
    quizzes: { score: number; total: number; count: number };
    exams: { score: number; total: number; count: number };
  } | null>(null);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null); // null = checking, true = enrolled, false = not enrolled

  // Redirect admin
  useEffect(() => {
    if (isAdmin && profile) {
      navigate('/admin', { replace: true });
    }
  }, [isAdmin, profile, navigate]);

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

  // Always fetch fresh stats when profile is ready, and again when window regains focus
  useEffect(() => {
    if (profile?.roll_number && !isAdmin) {
      fetchDashboardData();
    } else if (profile === null && !isAdmin) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.roll_number, profile?.section, isAdmin]);

  useEffect(() => {
    const onFocus = () => {
      if (profile?.roll_number && !isAdmin) {
        fetchDashboardData();
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.roll_number, profile?.section, isAdmin]);

  const fetchDashboardData = async () => {
    if (!profile?.roll_number) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [statsData, deadlines] = await Promise.all([
        getStudentStats(profile.roll_number, profile.section as 'CS-F26-M' | 'CS-F26-A' | undefined),
        getUpcomingDeadlines(),
      ]);

      setStats(statsData);
      setCategoryData([
        { name: "Labs", score: statsData.labs.score, total: statsData.labs.total },
        { name: "Assignments", score: statsData.assignments.score, total: statsData.assignments.total },
        { name: "Quizzes", score: statsData.quizzes.score, total: statsData.quizzes.total },
        { name: "Exams", score: statsData.exams.score, total: statsData.exams.total },
      ]);
      setUpcomingDeadlines(deadlines);

      // Optional soft cache for other consumers; dashboard always revalidates on mount
      const cacheKey = `dashboard-stats-${profile.roll_number}`;
      sessionStorage.setItem(cacheKey, JSON.stringify({ stats: statsData, deadlines }));

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setCategoryData([
        { name: "Labs", score: 0, total: 0 },
        { name: "Assignments", score: 0, total: 0 },
        { name: "Quizzes", score: 0, total: 0 },
        { name: "Exams", score: 0, total: 0 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Use actual counts from stats
  const labsCompleted = stats?.labs.count || 0;
  const assignmentsSubmitted = stats?.assignments.count || 0;
  const quizzesTaken = stats?.quizzes.count || 0;

  // Show not enrolled message if user is not enrolled
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
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
            Welcome back{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-muted-foreground">
            Here's your performance overview for Programming Fundamentals
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <StatCard
            title="Labs"
            value={loading ? <Skeleton className="h-6 w-12" /> : (stats && stats.labs.total > 0 ? `${stats.overallLabGrade}%` : '—')}
            subtitle={labsCompleted > 0 ? `${labsCompleted} completed` : 'No labs yet'}
            icon={<BookOpen className="h-5 w-5 text-primary-foreground" />}
            variant="primary"
          />
          <StatCard
            title="Assignments"
            value={loading ? <Skeleton className="h-6 w-12" /> : (stats && stats.assignments.total > 0 ? `${Math.round((stats.assignments.score / stats.assignments.total) * 100)}%` : stats && stats.assignments.count > 0 ? '0%' : '—')}
            subtitle={assignmentsSubmitted > 0 ? `${assignmentsSubmitted} submitted` : 'No assignments yet'}
            icon={<FileText className="h-5 w-5 text-muted-foreground" />}
          />
          <StatCard
            title="Quizzes"
            value={loading ? <Skeleton className="h-6 w-12" /> : (stats && stats.quizzes.total > 0 ? `${Math.round((stats.quizzes.score / stats.quizzes.total) * 100)}%` : stats && stats.quizzes.count > 0 ? '0%' : '—')}
            subtitle={quizzesTaken > 0 ? `${quizzesTaken} taken` : 'No quizzes yet'}
            icon={<HelpCircle className="h-5 w-5 text-secondary-foreground" />}
            variant="secondary"
          />
          <StatCard
            title="Overall Grade"
            value={loading ? <Skeleton className="h-6 w-12" /> : (stats && stats.overall > 0 ? getLetterGrade(stats.overall) : '—')}
            subtitle={stats && stats.overall > 0 ? `${stats.overall}%` : 'No grades yet'}
            icon={<Award className="h-5 w-5 text-muted-foreground" />}
          />
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Overall Grade Donut — all visible sheet tabs combined */}
          <div className="bg-card rounded-2xl border border-border p-6 animate-fade-in" style={{ animationDelay: "200ms" }}>
            <h2 className="text-lg font-semibold text-foreground mb-4">Overall Grade</h2>
            <div className="flex justify-center">
              {loading ? (
                <Skeleton className="h-48 w-48 rounded-full" />
              ) : (
                <GradeDonutChart percentage={stats?.overall || 0} size="lg" />
              )}
            </div>
            <div className="mt-4 text-center">
              {stats && stats.overall > 0 ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/20 text-foreground text-sm font-medium">
                  <TrendingUp className="h-4 w-4" />
                  Grade: {getLetterGrade(stats.overall)}
                  {stats.overallLabGrade > 0 && (
                    <span className="text-muted-foreground font-normal">
                      (Labs {stats.overallLabGrade}%)
                    </span>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                  No grades yet
                </span>
              )}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 animate-fade-in" style={{ animationDelay: "300ms" }}>
            <h2 className="text-lg font-semibold text-foreground mb-4">Performance by Category</h2>
            {categoryData.length > 0 && categoryData.some(c => c.total > 0) ? (
              <>
                <CategoryBarChart data={categoryData.filter(c => c.total > 0)} />
                <div className="flex flex-wrap gap-3 mt-4">
                  {categoryData.filter(c => c.total > 0).map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: `hsl(var(--chart-${i + 1}))` }}
                      />
                      <span className="text-sm text-muted-foreground">{cat.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No grade data available yet.</p>
                <p className="text-sm">Grades will appear here once they're synced from Google Sheets.</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        {upcomingDeadlines.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-6 animate-fade-in" style={{ animationDelay: "400ms" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Upcoming Deadlines</h2>
            </div>
            <UpcomingDeadlines deadlines={upcomingDeadlines} />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
