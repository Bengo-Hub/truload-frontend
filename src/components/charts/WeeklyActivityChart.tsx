/**
 * Weekly Weighing Activity Chart Component
 * Displays a bar chart with legal and overloaded vehicle counts
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface WeeklyActivityData {
  day: string;
  weighings: number;
  overloaded: number;
}

interface WeeklyActivityChartProps {
  data?: WeeklyActivityData[];
}

const DEFAULT_DATA: WeeklyActivityData[] = [
  { day: 'Mon', weighings: 234, overloaded: 18 },
  { day: 'Tue', weighings: 267, overloaded: 25 },
  { day: 'Wed', weighings: 289, overloaded: 31 },
  { day: 'Thu', weighings: 256, overloaded: 22 },
  { day: 'Fri', weighings: 298, overloaded: 28 },
  { day: 'Sat', weighings: 189, overloaded: 15 },
  { day: 'Sun', weighings: 247, overloaded: 23 },
];

export function WeeklyActivityChart({ data = DEFAULT_DATA }: WeeklyActivityChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Weighing Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="weighings" fill="#10b981" name="Legal" />
            <Bar dataKey="overloaded" fill="#ef4444" name="Overloaded" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
