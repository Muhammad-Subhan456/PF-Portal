import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";

interface CategoryData {
  name: string;
  score: number;
  total: number;
}

interface CategoryBarChartProps {
  data: CategoryData[];
}

const COLORS = [
  "hsl(var(--chart-1))", // Mint
  "hsl(var(--chart-2))", // Lavender
  "hsl(var(--chart-3))", // Yellow
  "hsl(var(--chart-4))", // Blue
  "hsl(var(--chart-5))", // Pink
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-card">
        <p className="font-medium text-foreground">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          Score: <span className="font-semibold text-foreground">{data.score}</span> / {data.total}
        </p>
        <p className="text-sm text-muted-foreground">
          Percentage: <span className="font-semibold text-foreground">{Math.round((data.score / data.total) * 100)}%</span>
        </p>
      </div>
    );
  }
  return null;
};

const CategoryBarChart = ({ data }: CategoryBarChartProps) => {
  const chartData = data.map((item) => ({
    ...item,
    percentage: Math.round((item.score / item.total) * 100),
  }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis 
            type="category" 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            width={80}
            tick={{ fontSize: 13, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
          <Bar 
            dataKey="percentage" 
            radius={[0, 8, 8, 0]}
            barSize={24}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryBarChart;
