/**
 * Dashboard Filters Component
 * Displays filter controls for dashboard data
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function DashboardFilters() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Date From</Label>
            <Input type="date" defaultValue="2025-12-10" />
          </div>
          <div className="space-y-2">
            <Label>Date To</Label>
            <Input type="date" defaultValue="2025-12-10" />
          </div>
          <div className="space-y-2">
            <Label>Station</Label>
            <Select defaultValue="all">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stations</SelectItem>
                <SelectItem value="nairobi">Nairobi Region</SelectItem>
                <SelectItem value="central">Central Region</SelectItem>
                <SelectItem value="western">Western Region</SelectItem>
                <SelectItem value="coast">Coast Region</SelectItem>
                <SelectItem value="nyanza">Nyanza Region</SelectItem>
                <SelectItem value="lower-eastern">Lower Eastern Region</SelectItem>
                <SelectItem value="upper-eastern">Upper Eastern Region</SelectItem>
                <SelectItem value="north-rift">North Rift</SelectItem>
                <SelectItem value="south-rift">South Rift</SelectItem>
                <SelectItem value="north-eastern">North Eastern</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Weighing Type</Label>
            <Select defaultValue="all">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="multideck">Multideck</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
