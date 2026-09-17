import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number | ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "secondary";
  className?: string;
}

const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  variant = "default",
  className 
}: StatCardProps) => {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:shadow-card hover:-translate-y-0.5 min-w-0",
      variant === "primary" && "bg-primary text-primary-foreground",
      variant === "secondary" && "bg-secondary text-secondary-foreground",
      variant === "default" && "bg-card border border-border",
      className
    )}>
      {/* Background Decoration */}
      {variant !== "default" && (
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 pointer-events-none" />
      )}
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <p className={cn(
            "text-sm font-medium",
            variant === "default" ? "text-muted-foreground" : "text-current/80"
          )}>
            {title}
          </p>
          {icon && (
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              variant === "default" ? "bg-muted" : "bg-white/20"
            )}>
              {icon}
            </div>
          )}
        </div>

        {/* Value */}
        {typeof value === 'string' || typeof value === 'number' ? (
          <p className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 truncate">{value}</p>
        ) : (
          <div className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 truncate">{value}</div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2">
          {trend && (
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              trend.isPositive 
                ? "bg-success/20 text-foreground" 
                : "bg-destructive/20 text-destructive"
            )}>
              {trend.isPositive ? "+" : ""}{trend.value}%
            </span>
          )}
          {subtitle && (
            <span className={cn(
              "text-xs",
              variant === "default" ? "text-muted-foreground" : "text-current/70"
            )}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
