import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { User, Mail, Hash, Calendar, Award, LogOut } from "lucide-react";
import GradeDonutChart from "@/components/dashboard/GradeDonutChart";
import { useAuth } from "@/contexts/AuthContext";
import { getStudentStats } from "@/lib/studentData";
import { useEffect, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getStudentRank } from "@/lib/ranking";
import { isEmailEnrolled } from "@/lib/auth";
import NotEnrolledMessage from "@/components/NotEnrolledMessage";

const Profile = () => {
  const { profile, signOut, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [overallGrade, setOverallGrade] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (profile?.roll_number) {
      // If section is missing, try to fetch anyway (will use default section)
      fetchData();
    } else if (profile === null) {
      // Only set loading to false if profile is explicitly null (not loading)
      setLoading(false);
    }
  }, [profile?.roll_number, profile?.section]);

  // Show not enrolled message if user is not enrolled
  if (isEnrolled === false) {
    return (
      <AppLayout>
        <NotEnrolledMessage />
      </AppLayout>
    );
  }

  const fetchData = async () => {
    if (!profile?.roll_number) {
      setLoading(false);
      return;
    }

    try {
      // Check cache first
      const cacheKey = `profile-stats-${profile.roll_number}`;
      const cached = sessionStorage.getItem(cacheKey);

      if (cached) {
        try {
          const { stats, rank } = JSON.parse(cached);
          setOverallGrade(stats.overallLabGrade);
          setRank(rank);
          setLoading(false);
        } catch (e) { console.error(e); }
      }

      // Use section if available, otherwise try both sections
      const section = profile.section as 'CS-F26-M' | 'CS-F26-A' | undefined;
      const [stats, studentRank] = await Promise.all([
        getStudentStats(profile.roll_number, section),
        section ? getStudentRank(profile.roll_number, section) : Promise.resolve(null),
      ]);
      setOverallGrade(stats.overallLabGrade); // Use overallLabGrade to match dashboard
      setRank(studentRank);

      // Update cache
      sessionStorage.setItem(cacheKey, JSON.stringify({ stats, rank: studentRank }));
    } catch (error) {
      console.error('Error fetching data:', error);
      setOverallGrade(0);
      setRank(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error: any) {
      console.error('Error signing out:', error);
    }
  };

  if (!profile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const initials = profile.name
    ? profile.name.split(" ").map(n => n[0]).join("").toUpperCase()
    : profile.roll_number?.substring(0, 2).toUpperCase() || "U";

  // Get avatar URL from user metadata (Google OAuth provides this)
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.user_metadata?.avatar || null;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Profile</h1>
          <p className="text-muted-foreground">Your student information and settings</p>
        </div>

        {/* Profile Card */}
        <div className="bg-card rounded-2xl border border-border p-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <Avatar className="h-24 w-24 rounded-2xl">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={profile.name || 'User'} referrerPolicy="no-referrer" />}
              <AvatarFallback className="rounded-2xl bg-primary text-3xl font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-foreground">{profile.name || 'Student'}</h2>
              <p className="text-muted-foreground font-mono">{profile.roll_number || 'N/A'}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                {profile.section && (
                  <span className="px-3 py-1 rounded-full bg-primary/20 text-foreground text-sm font-medium">
                    Section {profile.section}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full bg-secondary/20 text-secondary text-sm font-medium">
                  Fall 2026
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
          <div className="bg-card rounded-2xl border border-border p-6 text-center">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <GradeDonutChart percentage={overallGrade} size="md" label="Overall Lab Grade" />
            )}
          </div>
          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center justify-center">
            <Award className="h-8 w-8 text-secondary mb-2" />
            {loading ? (
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            ) : rank ? (
              <>
                <p className="text-3xl font-bold text-foreground">#{rank}</p>
                <p className="text-sm text-muted-foreground">Rank in {profile.section}</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-foreground">-</p>
                <p className="text-sm text-muted-foreground">Rank not available</p>
              </>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="bg-card rounded-2xl border border-border divide-y divide-border animate-fade-in" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium text-foreground">{profile.name || 'Not set'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Mail className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium text-foreground">{profile.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Hash className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Roll Number</p>
              <p className="font-medium text-foreground font-mono">{profile.roll_number || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Session</p>
              <p className="font-medium text-foreground">Fall 2026</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Award className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Section</p>
              <p className="font-medium text-foreground">{profile.section || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <Button
          variant="outline"
          className="w-full rounded-xl gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </AppLayout>
  );
};

export default Profile;
