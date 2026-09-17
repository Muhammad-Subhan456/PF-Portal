import { BookOpen, FileText, HelpCircle, GraduationCap, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "lab" | "assignment" | "quiz" | "exam";
  title: string;
  status: "completed" | "in_progress" | "missing" | "upcoming";
  date: string;
  score?: number;
  total?: number;
}

interface ActivityFeedProps {
  activities: Activity[];
}

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    className: "bg-success/20 text-foreground",
  },
  in_progress: {
    icon: Clock,
    label: "In Progress",
    className: "bg-info/20 text-secondary",
  },
  missing: {
    icon: AlertCircle,
    label: "Missing",
    className: "bg-destructive/20 text-destructive",
  },
  upcoming: {
    icon: Clock,
    label: "Upcoming",
    className: "bg-muted text-muted-foreground",
  },
};

const typeConfig = {
  lab: { icon: BookOpen, className: "bg-primary/20 text-primary" },
  assignment: { icon: FileText, className: "bg-secondary/20 text-secondary" },
  quiz: { icon: HelpCircle, className: "bg-info/20 text-info" },
  exam: { icon: GraduationCap, className: "bg-warning/20 text-warning" },
};

const ActivityFeed = ({ activities }: ActivityFeedProps) => {
  return (
    <div className="space-y-3">
      {activities.map((activity, index) => {
        const status = statusConfig[activity.status];
        const StatusIcon = status.icon;
        const typeInfo = typeConfig[activity.type];
        const TypeIcon = typeInfo.icon;

        return (
          <div
            key={activity.id}
            className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:shadow-soft transition-all duration-200 animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Type Icon */}
            <div className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl",
              typeInfo.className
            )}>
              <TypeIcon className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{activity.title}</p>
              <p className="text-sm text-muted-foreground">{activity.date}</p>
            </div>

            {/* Score (if completed) */}
            {activity.score !== undefined && activity.total !== undefined && (
              <div className="hidden sm:block text-right">
                <p className="font-semibold text-foreground">
                  {activity.score}/{activity.total}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round((activity.score / activity.total) * 100)}%
                </p>
              </div>
            )}

            {/* Status Badge */}
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
              status.className
            )}>
              <StatusIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{status.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityFeed;
