import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Deadline {
  id: string;
  title: string;
  type: "lab" | "assignment" | "quiz";
  dueDate: string;
  daysLeft: number;
}

interface UpcomingDeadlinesProps {
  deadlines: Deadline[];
}

const typeColors = {
  lab: "bg-chart-1",
  assignment: "bg-chart-2",
  quiz: "bg-chart-3",
};

const UpcomingDeadlines = ({ deadlines }: UpcomingDeadlinesProps) => {
  return (
    <div className="space-y-3">
      {deadlines.map((deadline, index) => (
        <div
          key={deadline.id}
          className="relative flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:shadow-soft transition-all duration-200 animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* Timeline Indicator */}
          <div className={cn(
            "absolute left-0 top-4 bottom-4 w-1 rounded-r-full",
            typeColors[deadline.type]
          )} />

          {/* Calendar Icon */}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted ml-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{deadline.title}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{deadline.dueDate}</span>
            </div>
          </div>

          {/* Days Left */}
          <div className={cn(
            "text-center px-3 py-2 rounded-xl",
            deadline.daysLeft <= 1 ? "bg-destructive/10" : deadline.daysLeft <= 3 ? "bg-warning/10" : "bg-muted"
          )}>
            <p className={cn(
              "text-lg font-bold",
              deadline.daysLeft <= 1 ? "text-destructive" : deadline.daysLeft <= 3 ? "text-warning" : "text-foreground"
            )}>
              {deadline.daysLeft}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {deadline.daysLeft === 1 ? "Day" : "Days"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UpcomingDeadlines;
