/**
 * Monthly Revenue Trend Chart Component
 * Displays a line chart with revenue trends over months
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface RevenueData {
  month: string;
  revenue: number;
}

interface RevenueChartProps {
  data?: RevenueData[];
}

const DEFAULT_DATA: RevenueData[] = [
  { month: 'Jan', revenue: 3200000 },
  { month: 'Feb', revenue: 3450000 },
  { month: 'Mar', revenue: 3100000 },
  { month: 'Apr', revenue: 3800000 },
  { month: 'May', revenue: 4200000 },
  { month: 'Jun', revenue: 3900000 },
];

export function RevenueChart({ data = DEFAULT_DATA }: RevenueChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Revenue Trend (KES)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `KES ${value.toLocaleString()}`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2}
              name="Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
