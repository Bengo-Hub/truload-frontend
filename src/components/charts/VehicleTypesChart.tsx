/**
 * Vehicle Types Distribution Chart Component
 * Displays a pie chart with vehicle type percentages
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface VehicleTypeData {
  name: string;
  value: number;
  color: string;
  [key: string]: any;
}

interface VehicleTypesChartProps {
  data?: VehicleTypeData[];
}

const DEFAULT_DATA: VehicleTypeData[] = [
  { name: 'Light Vehicles', value: 45, color: '#10b981' },
  { name: 'Medium Trucks', value: 30, color: '#3b82f6' },
  { name: 'Heavy Trucks', value: 15, color: '#f59e0b' },
  { name: 'Trailers', value: 10, color: '#8b5cf6' },
];

export function VehicleTypesChart({ data = DEFAULT_DATA }: VehicleTypesChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Types Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data as any}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }: { name?: string; percent?: number }) =>
                `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
