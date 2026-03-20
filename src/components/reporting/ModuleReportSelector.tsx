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
  Eye,
  FileSpreadsheet,
  FileText,
  Gavel,
  Loader2,
  Scale,
  Settings,
  Truck,
  DollarSign,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useReportCatalog, useDownloadReport } from '@/hooks/queries/useReportQueries';
import { StationSelectFilter } from '@/components/filters/StationSelectFilter';
import { ReportPreviewDialog } from './ReportPreviewDialog';
import { useModuleAccess } from '@/hooks/useModuleAccess';

const MODULE_ICONS: Record<string, LucideIcon> = {
  weighing: Scale,
  prosecution: Gavel,
  cases: FileText,
  financial: DollarSign,
  yard: Truck,
  security: Settings,
};

const MODULE_LABELS: Record<string, string> = {
  weighing: 'Weighing',
  prosecution: 'Prosecution',
  cases: 'Cases',
  financial: 'Financial',
  yard: 'Yard',
  security: 'Security',
};

const STATUS_OPTIONS_WEIGHING = [
  { value: 'all', label: 'All Statuses' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'OVERLOAD', label: 'Overloaded' },
];

const WEIGHING_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'multideck', label: 'Multideck' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'static', label: 'Static' },
];

export function ModuleReportSelector() {
  const [selectedModule, setSelectedModule] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [stationId, setStationId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState('all');
  const [weighingType, setWeighingType] = useState('all');
  const [controlStatus, setControlStatus] = useState('all');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');

  const { isEnforcement, hasModule, showFinancial } = useModuleAccess();

  const { data: catalog, isLoading: catalogLoading } = useReportCatalog(
    selectedModule === 'all' ? undefined : selectedModule
  );
  const downloadMutation = useDownloadReport();

  // Map report module keys to tenant module checks (defense in depth - backend also filters)
  const isReportModuleAllowed = (reportModule: string): boolean => {
    switch (reportModule) {
      case 'weighing':
        return hasModule('weighing');
      case 'prosecution':
        return hasModule('prosecution');
      case 'cases':
        return hasModule('cases') || hasModule('case_management');
      case 'financial':
        return showFinancial;
      case 'yard':
        return isEnforcement;
      case 'security':
        // Security reports are always available (no specific tenant module restriction)
        return true;
      default:
        return true;
    }
  };

  const allReports = catalog?.modules
    ?.filter((m) => isReportModuleAllowed(m.module))
    .flatMap((m) =>
      m.reports.map((r) => ({ ...r, moduleDisplayName: m.displayName }))
    ) ?? [];

  const moduleList = catalog?.modules?.filter((m) => isReportModuleAllowed(m.module)) ?? [];

  const handleGenerate = async (
    module: string,
    reportType: string,
    format: 'pdf' | 'csv' | 'xlsx'
  ) => {
    try {
      const result = await downloadMutation.mutateAsync({
        module,
        reportType,
        filters: {
          format,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          stationId: stationId && stationId !== 'all' ? stationId : undefined,
          status: status && status !== 'all' ? status : undefined,
          weighingType: module === 'weighing' && weighingType && weighingType !== 'all' ? weighingType : undefined,
          controlStatus: module === 'weighing' && controlStatus && controlStatus !== 'all' ? controlStatus : undefined,
        },
      });

      if (format === 'pdf') {
        setPreviewBlob(result.blob);
        setPreviewFileName(result.fileName);
        setPreviewOpen(true);
      } else {
        // CSV/Excel - trigger immediate download
        const url = window.URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('CSV report downloaded');
      }
    } catch {
      toast.error('Failed to generate report. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-2">
              <Label>Module</Label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      All Modules
                    </div>
                  </SelectItem>
                  {moduleList.map((m) => {
                    const Icon = MODULE_ICONS[m.module] ?? BarChart3;
                    return (
                      <SelectItem key={m.module} value={m.module}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {m.displayName}
                        </div>
                      </SelectItem>
                    );
                  })}
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
            <div className="space-y-2">
              <StationSelectFilter
                label="Station"
                value={stationId}
                onValueChange={(v) => setStationId(v ?? 'all')}
              />
            </div>
            {selectedModule === 'weighing' && (
              <>
                <div className="space-y-2">
                  <Label>Weighing Type</Label>
                  <Select value={weighingType || ''} onValueChange={(v) => setWeighingType(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEIGHING_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Control Status</Label>
                  <Select value={controlStatus || ''} onValueChange={(v) => setControlStatus(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS_WEIGHING.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {selectedModule !== 'weighing' && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {selectedModule === 'cases' && (
                      <>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                      </>
                    )}
                    {selectedModule === 'prosecution' && (
                      <>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="invoiced">Invoiced</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="court">Court</SelectItem>
                      </>
                    )}
                    {selectedModule === 'yard' && (
                      <>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="released">Released</SelectItem>
                        <SelectItem value="escalated">Escalated</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report List */}
      {catalogLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-8 bg-muted rounded w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allReports.map((report) => {
            const Icon = MODULE_ICONS[report.module] ?? FileText;
            const isGenerating = downloadMutation.isPending;
            return (
              <Card key={`${report.module}-${report.id}`} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <Icon className="h-5 w-5 text-blue-600" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {MODULE_LABELS[report.module] ?? report.module}
                    </span>
                  </div>
                  <CardTitle className="text-sm">{report.name}</CardTitle>
                  <CardDescription className="text-xs">{report.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    {report.supportedFormats.includes('pdf') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={isGenerating}
                        onClick={() => handleGenerate(report.module, report.id, 'pdf')}
                      >
                        {isGenerating ? (
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        ) : (
                          <Eye className="h-3 w-3 mr-1.5" />
                        )}
                        PDF
                      </Button>
                    )}
                    {report.supportedFormats.includes('csv') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={isGenerating}
                        onClick={() => handleGenerate(report.module, report.id, 'csv')}
                      >
                        {isGenerating ? (
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="h-3 w-3 mr-1.5" />
                        )}
                        CSV
                      </Button>
                    )}
                    {report.supportedFormats.includes('xlsx') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={isGenerating}
                        onClick={() => handleGenerate(report.module, report.id, 'xlsx')}
                      >
                        {isGenerating ? (
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="h-3 w-3 mr-1.5 text-green-600" />
                        )}
                        Excel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!catalogLoading && allReports.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No reports available for this module</p>
        </div>
      )}

      {/* PDF Preview Dialog */}
      <ReportPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        blob={previewBlob}
        fileName={previewFileName}
        isLoading={downloadMutation.isPending}
      />
    </div>
  );
}
