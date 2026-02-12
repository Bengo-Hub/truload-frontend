'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  Download,
  FileText,
  Gavel,
  Scale,
  Truck,
  Settings,
  DollarSign,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  module: string;
  icon: LucideIcon;
}

const MODULES = [
  { value: 'all', label: 'All Modules', icon: BarChart3 },
  { value: 'weighing', label: 'Weighing', icon: Scale },
  { value: 'cases', label: 'Cases', icon: FileText },
  { value: 'financial', label: 'Financial', icon: DollarSign },
  { value: 'yard', label: 'Yard', icon: Truck },
  { value: 'prosecution', label: 'Prosecution', icon: Gavel },
  { value: 'config', label: 'Configuration', icon: Settings },
];

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'daily-weighing',
    name: 'Daily Weighing Summary',
    description: 'Compliance statistics and transaction counts by station',
    module: 'weighing',
    icon: Scale,
  },
  {
    id: 'weighing-compliance',
    name: 'Compliance Trend Report',
    description: 'Legal vs overloaded vehicles over time',
    module: 'weighing',
    icon: Scale,
  },
  {
    id: 'axle-overload',
    name: 'Axle Overload Analysis',
    description: 'Axle group overloads by vehicle configuration',
    module: 'weighing',
    icon: Scale,
  },
  {
    id: 'revenue-report',
    name: 'Revenue Collection Report',
    description: 'Fee collection and payment method breakdown',
    module: 'financial',
    icon: DollarSign,
  },
  {
    id: 'invoice-aging',
    name: 'Invoice Aging Report',
    description: 'Outstanding invoices by age bracket',
    module: 'financial',
    icon: DollarSign,
  },
  {
    id: 'payment-reconciliation',
    name: 'Payment Reconciliation',
    description: 'Pesaflow payments vs manual payments',
    module: 'financial',
    icon: DollarSign,
  },
  {
    id: 'prosecution-report',
    name: 'Prosecution Statistics',
    description: 'Cases by status, fines, and court outcomes',
    module: 'prosecution',
    icon: Gavel,
  },
  {
    id: 'court-calendar',
    name: 'Court Calendar Report',
    description: 'Upcoming court hearings by date and jurisdiction',
    module: 'prosecution',
    icon: Gavel,
  },
  {
    id: 'repeat-offenders',
    name: 'Repeat Offenders',
    description: 'Drivers and transporters with multiple violations',
    module: 'cases',
    icon: Truck,
  },
  {
    id: 'case-register',
    name: 'Case Register Report',
    description: 'All cases by status, violation type, and resolution',
    module: 'cases',
    icon: FileText,
  },
  {
    id: 'station-performance',
    name: 'Station Performance',
    description: 'Weighings, compliance rates, and revenue by station',
    module: 'weighing',
    icon: BarChart3,
  },
  {
    id: 'yard-occupancy',
    name: 'Yard Occupancy Report',
    description: 'Vehicle entries, releases, and current occupancy',
    module: 'yard',
    icon: Truck,
  },
  {
    id: 'system-audit-log',
    name: 'System Audit Log',
    description: 'User actions and system events',
    module: 'config',
    icon: Settings,
  },
];

interface ModuleReportSelectorProps {
  onExport: (reportId: string, dateFrom?: string, dateTo?: string) => void;
}

export function ModuleReportSelector({ onExport }: ModuleReportSelectorProps) {
  const [selectedModule, setSelectedModule] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredReports = selectedModule === 'all'
    ? REPORT_TEMPLATES
    : REPORT_TEMPLATES.filter((r) => r.module === selectedModule);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Module</Label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <div className="flex items-center gap-2">
                        <m.icon className="h-4 w-4" />
                        {m.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report List */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredReports.map((report) => (
          <Card key={report.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <report.icon className="h-5 w-5 text-blue-600" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onExport(report.id, dateFrom || undefined, dateTo || undefined)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              <CardTitle className="text-sm">{report.name}</CardTitle>
              <CardDescription className="text-xs">{report.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onExport(report.id, dateFrom || undefined, dateTo || undefined)}
              >
                <Download className="h-3 w-3 mr-1.5" />
                Export CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No reports available for this module</p>
        </div>
      )}
    </div>
  );
}
