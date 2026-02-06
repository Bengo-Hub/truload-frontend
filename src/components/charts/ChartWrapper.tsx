/**
 * ChartWrapper Component
 * Provides a reusable wrapper with export, copy, and view-change functionality for charts
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  Copy,
  Download,
  LineChart,
  Maximize2,
  MoreVertical,
  PieChart,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// Chart color palette
const CHART_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
];

export type ChartType = 'bar' | 'line' | 'pie' | 'donut';

// Flexible chart data type - use any object with a name property
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ChartDataItem = Record<string, any>;

export interface ChartSeries {
  dataKey: string;
  name: string;
  color?: string;
}

interface ChartWrapperProps {
  title: string;
  subtitle?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: readonly any[];
  series: ChartSeries[];
  xAxisKey?: string;
  defaultChartType?: ChartType;
  allowedChartTypes?: ChartType[];
  height?: number;
  isLoading?: boolean;
  showLegend?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
}

export function ChartWrapper({
  title,
  subtitle,
  data,
  series,
  xAxisKey = 'name',
  defaultChartType = 'bar',
  allowedChartTypes = ['bar', 'line', 'pie'],
  height = 300,
  isLoading = false,
  showLegend = true,
  valueFormatter = (v) => v.toLocaleString(),
  className,
}: ChartWrapperProps) {
  const [chartType, setChartType] = useState<ChartType>(defaultChartType);
  const chartRef = useRef<HTMLDivElement>(null);

  // Copy data to clipboard as CSV
  const copyToClipboard = useCallback(async () => {
    if (!data.length) return;

    const headers = [xAxisKey, ...series.map((s) => s.name)].join(',');
    const rows = data.map((item) =>
      [item[xAxisKey], ...series.map((s) => item[s.dataKey])].join(',')
    );
    const csv = [headers, ...rows].join('\n');

    try {
      await navigator.clipboard.writeText(csv);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [data, series, xAxisKey]);

  // Export as CSV
  const exportCSV = useCallback(() => {
    if (!data.length) return;

    const headers = [xAxisKey, ...series.map((s) => s.name)].join(',');
    const rows = data.map((item) =>
      [item[xAxisKey], ...series.map((s) => item[s.dataKey])].join(',')
    );
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data, series, title, xAxisKey]);

  // Export chart as SVG
  const exportSVG = useCallback(() => {
    if (!chartRef.current) return;

    const svgElement = chartRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }, [title]);

  // Get chart type icon
  const getChartIcon = (type: ChartType) => {
    switch (type) {
      case 'line':
        return LineChart;
      case 'pie':
      case 'donut':
        return PieChart;
      default:
        return BarChart3;
    }
  };

  // Render the appropriate chart
  const renderChart = () => {
    if (chartType === 'pie' || chartType === 'donut') {
      // For pie/donut, use first series and aggregate data
      const pieData = data.map((item, index) => ({
        name: item[xAxisKey] as string,
        value: Number(item[series[0]?.dataKey] || 0),
        color: CHART_COLORS[index % CHART_COLORS.length],
      }));

      return (
        <RechartsPieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={chartType === 'donut' ? 60 : 0}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => valueFormatter(Number(value))} />
          {showLegend && <Legend />}
        </RechartsPieChart>
      );
    }

    if (chartType === 'line') {
      return (
        <RechartsLineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} stroke="#6b7280" />
          <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
          <Tooltip formatter={(value) => valueFormatter(Number(value))} />
          {showLegend && <Legend />}
          {series.map((s, index) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color || CHART_COLORS[index % CHART_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </RechartsLineChart>
      );
    }

    // Default: Bar chart
    return (
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} stroke="#6b7280" />
        <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
        <Tooltip formatter={(value) => valueFormatter(Number(value))} />
        {showLegend && <Legend />}
        {series.map((s, index) => (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            name={s.name}
            fill={s.color || CHART_COLORS[index % CHART_COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {/* Chart Type Selector */}
          {allowedChartTypes.length > 1 && (
            <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
              <SelectTrigger className="w-[110px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedChartTypes.map((type) => {
                  const Icon = getChartIcon(type);
                  return (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="capitalize">{type}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Data
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportSVG}>
                <Download className="h-4 w-4 mr-2" />
                Export SVG
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => chartRef.current?.requestFullscreen?.()}>
                <Maximize2 className="h-4 w-4 mr-2" />
                Fullscreen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={chartRef} style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Export chart colors for external use
export { CHART_COLORS };
