import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface GradeDonutChartProps {
  percentage: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

const GradeDonutChart = ({ percentage, label = "Overall", size = "md" }: GradeDonutChartProps) => {
  const data = [
    { name: "Score", value: percentage },
    { name: "Remaining", value: 100 - percentage },
  ];

  const getGradeColor = (pct: number) => {
    if (pct >= 85) return "hsl(var(--chart-1))"; // Mint green
    if (pct >= 70) return "hsl(var(--chart-4))"; // Blue
    if (pct >= 50) return "hsl(var(--chart-3))"; // Yellow
    return "hsl(var(--destructive))"; // Red
  };

  const sizeMap = {
    sm: { outer: 50, inner: 38, container: 100 },
    md: { outer: 70, inner: 55, container: 160 },
    lg: { outer: 90, inner: 72, container: 200 },
  };

  const { outer, inner, container } = sizeMap[size];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: container, height: container }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={inner}
              outerRadius={outer}
              startAngle={90}
              endAngle={-270}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={getGradeColor(percentage)} />
              <Cell fill="hsl(var(--muted))" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold ${size === "lg" ? "text-3xl" : size === "md" ? "text-2xl" : "text-lg"}`}>
            {percentage}%
          </span>
        </div>
      </div>
      <p className="text-sm font-medium text-muted-foreground mt-2">{label}</p>
    </div>
  );
};

export default GradeDonutChart;
