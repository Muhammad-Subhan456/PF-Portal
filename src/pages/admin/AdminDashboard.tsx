import { useEffect, useState } from "react";
import { Users, BookOpen, FileText, HelpCircle, Award, Trophy, Medal } from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import StatCard from "@/components/dashboard/StatCard";
import { getAllStudents } from "@/lib/students";
import { getAllLabs, getAllAssignments, getAllQuizzes } from "@/lib/content";
import { getTopRankers, type StudentRank } from "@/lib/ranking";
import { preloadAllRanks } from "@/lib/rankingCache";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    labs: 0,
    assignments: 0,
    quizzes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [topRankers, setTopRankers] = useState<{ morning: StudentRank[]; afternoon: StudentRank[] }>({
    morning: [],
    afternoon: [],
  });
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Pre-calculate and cache ranks for all sections in background
    // This makes student detail modal load instantly
    preloadAllRanks().catch(error => {
      console.error('Error preloading ranks:', error);
    });

    // Check cache first
    const cacheKey = 'admin-dashboard-stats';
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      try {
        // Load from cache immediately (no loading spinner)
        const { stats: cachedStats, rankers: cachedRankers } = JSON.parse(cached);
        setStats(cachedStats);
        setTopRankers(cachedRankers);
        setHasFetched(true);
        setLoading(false);
        
        // Refresh in background (silently update cache)
        fetchStats(true);
      } catch (e) {
        console.error('Error parsing cache:', e);
        fetchStats(false);
      }
    } else {
      fetchStats(false);
    }

    return () => {
      mounted = false;
    };
  }, []);

  const fetchStats = async (backgroundRefresh: boolean = false) => {
    let mounted = true;

    try {
      // Only show loader if not a background refresh
      if (!backgroundRefresh && !hasFetched) {
        setLoading(true);
      }

      const [students, labs, assignments, quizzes, rankers] = await Promise.all([
        getAllStudents(),
        getAllLabs(),
        getAllAssignments(),
        getAllQuizzes(),
        getTopRankers(5),
      ]);

      if (!mounted) return;

      const newStats = {
        totalStudents: students.length,
        labs: labs.length,
        assignments: assignments.length,
        quizzes: quizzes.length,
      };

      setStats(newStats);
      setTopRankers(rankers);
      setHasFetched(true);

      // Update cache with fresh data
      const cacheKey = 'admin-dashboard-stats';
      sessionStorage.setItem(cacheKey, JSON.stringify({ stats: newStats, rankers }));

    } catch (error: any) {
      console.error('Error fetching stats:', error);
    } finally {
      if (mounted && !backgroundRefresh) {
        setLoading(false);
      }
    }
  };

  const adminStats = [
    {
      title: "Total Students",
      value: loading ? <Skeleton className="h-6 w-12" /> : stats.totalStudents.toString(),
      subtitle: undefined,
      icon: Users
    },
    {
      title: "Labs",
      value: loading ? <Skeleton className="h-6 w-12" /> : stats.labs.toString(),
      subtitle: undefined,
      icon: BookOpen
    },
    {
      title: "Assignments",
      value: loading ? <Skeleton className="h-6 w-12" /> : stats.assignments.toString(),
      subtitle: undefined,
      icon: FileText
    },
    {
      title: "Quizzes",
      value: loading ? <Skeleton className="h-6 w-12" /> : stats.quizzes.toString(),
      subtitle: undefined,
      icon: HelpCircle
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
            Welcome back{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-muted-foreground">
            Here's your overview for Programming Fundamentals course management
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <StatCard
            title="Total Students"
            value={adminStats[0].value}
            subtitle={adminStats[0].subtitle}
            icon={<Users className="h-5 w-5 text-primary-foreground" />}
            variant="primary"
          />
          <StatCard
            title="Labs"
            value={adminStats[1].value}
            subtitle={adminStats[1].subtitle}
            icon={<BookOpen className="h-5 w-5 text-muted-foreground" />}
          />
          <StatCard
            title="Assignments"
            value={adminStats[2].value}
            subtitle={adminStats[2].subtitle}
            icon={<FileText className="h-5 w-5 text-secondary-foreground" />}
            variant="secondary"
          />
          <StatCard
            title="Quizzes"
            value={adminStats[3].value}
            subtitle={adminStats[3].subtitle}
            icon={<Award className="h-5 w-5 text-muted-foreground" />}
          />
        </div>

        {/* Top Rankers Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Morning Section Top Rankers */}
          <div className="bg-card rounded-2xl border border-border p-6 animate-fade-in" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Top Rankers - CS-F26-M</h2>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : topRankers.morning.length > 0 ? (
              <div className="space-y-3">
                {topRankers.morning.map((student, index) => (
                  <div
                    key={student.rollNumber}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {student.rank}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.rollNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{student.overallLabGrade}%</p>
                      <p className="text-xs text-muted-foreground">Lab Grade</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No rankings available yet.</p>
                <p className="text-sm">Grades will appear here once they're synced.</p>
              </div>
            )}
          </div>

          {/* Afternoon Section Top Rankers */}
          <div className="bg-card rounded-2xl border border-border p-6 animate-fade-in" style={{ animationDelay: "300ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <Medal className="h-5 w-5 text-secondary" />
              <h2 className="text-lg font-semibold text-foreground">Top Rankers - CS-F26-A</h2>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : topRankers.afternoon.length > 0 ? (
              <div className="space-y-3">
                {topRankers.afternoon.map((student, index) => (
                  <div
                    key={student.rollNumber}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/10 text-secondary font-bold text-sm">
                        {student.rank}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.rollNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{student.overallLabGrade}%</p>
                      <p className="text-xs text-muted-foreground">Lab Grade</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No rankings available yet.</p>
                <p className="text-sm">Grades will appear here once they're synced.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div
          className="bg-card rounded-2xl border border-border p-6 animate-fade-in"
          style={{ animationDelay: "400ms" }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              to="/admin/labs"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            >
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-foreground">Add Lab</span>
            </Link>
            <Link
              to="/admin/assignments"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            >
              <FileText className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-foreground">Add Assignment</span>
            </Link>
            <Link
              to="/admin/quizzes"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            >
              <HelpCircle className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-foreground">Add Quiz</span>
            </Link>
            <Link
              to="/admin/students"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            >
              <Users className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-foreground">Manage Students</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
