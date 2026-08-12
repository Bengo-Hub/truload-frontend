'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Eye, FileSpreadsheet, Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useReportCatalog, useDownloadReport } from '@/hooks/queries/useReportQueries';
import { triggerBlobDownload } from '@/lib/api/reports';
import {
  useReportConfigs, useSaveReportConfig, useDeleteReportConfig,
} from '@/hooks/queries/useReportConfigQueries';
import { StationSelectFilter } from '@/components/filters/StationSelectFilter';
import { CountySelectFilter } from '@/components/filters/CountySelectFilter';
import { SubcountySelectFilter } from '@/components/filters/SubcountySelectFilter';
import { RoadSelectFilter } from '@/components/filters/RoadSelectFilter';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { ReportPreviewDialog } from './ReportPreviewDialog';
import type { ReportFilterDefinition } from '@/lib/api/reports';

/**
 * Structured custom-report builder - lets a user pick a report type, then (when that report has
 * opted into a column/chart catalog via the backend) toggle which columns/chart visuals to
 * include, or just flip "Use Recommended Defaults" to get the exact same output the plain
 * catalog-driven "Quick Reports" view produces. Deliberately NOT a free-form query builder -
 * Superset/the AI Natural-Language-Query tool already cover true ad-hoc BI; this stays scoped to
 * the curated columns/filters/charts each report type explicitly declares.
 */
export function CustomReportBuilder() {
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedReportType, setSelectedReportType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [stationId, setStationId] = useState<string | undefined>(undefined);
  /** Values for this report's declared drill-down filters (county/subcounty/weighing type/etc.),
   *  keyed by ReportFilterDefinition.key. Applies regardless of "Use Recommended Defaults" -
   *  filters narrow WHAT DATA is fetched, unlike columns/chart visuals which only affect layout. */
  const [filterValues, setFilterValues] = useState<Record<string, string | undefined>>({});
  const [useDefaults, setUseDefaults] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [chartType, setChartType] = useState<string | undefined>(undefined);
  const [configName, setConfigName] = useState('');

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');

  const { data: catalog, isLoading: catalogLoading } = useReportCatalog();
  const downloadMutation = useDownloadReport();
  const { data: savedConfigs = [] } = useReportConfigs(selectedModule, selectedReportType);
  const saveConfigMutation = useSaveReportConfig();
  const deleteConfigMutation = useDeleteReportConfig();

  const allReports = useMemo(
    () => catalog?.modules?.flatMap((m) => m.reports.map((r) => ({ ...r, module: m.module }))) ?? [],
    [catalog]
  );
  const selectedReport = allReports.find((r) => r.id === selectedReportType && r.module === selectedModule);

  const handleSelectReport = (moduleAndType: string) => {
    const [module, reportType] = moduleAndType.split('::');
    setSelectedModule(module);
    setSelectedReportType(reportType);
    setUseDefaults(true);
    setChartType(undefined);
    setFilterValues({});
    const report = allReports.find((r) => r.id === reportType && r.module === module);
    setSelectedColumns(report?.columns?.filter((c) => c.defaultSelected).map((c) => c.key) ?? []);
  };

  const setFilterValue = (key: string, value: string | undefined) => {
    setFilterValues((prev) => {
      const next = { ...prev, [key]: value };
      // Sub-county and Road are both scoped to a county - clear them if the county changes/clears
      // so a stale selection from a different county can't linger.
      if (key === 'countyId') {
        next.subcountyId = undefined;
        next.roadId = undefined;
      }
      return next;
    });
  };

  // Station is already its own dedicated control above; the dynamic section only needs to render
  // this report's OTHER declared filters (county/subcounty/weighing type/compliance status/etc.).
  const dynamicFilters: ReportFilterDefinition[] =
    selectedReport?.filters?.filter((f) => f.key !== 'stationId') ?? [];

  const toggleColumn = (key: string, checked: boolean) => {
    setSelectedColumns((prev) => (checked ? [...prev, key] : prev.filter((c) => c !== key)));
  };

  const handleApplyConfig = (configId: string) => {
    const config = savedConfigs.find((c) => c.id === configId);
    if (!config) return;
    setSelectedColumns(config.columns);
    setChartType(config.chartType ?? undefined);
    setUseDefaults(false);
    toast.success(`Applied "${config.name}"`);
  };

  const handleSaveConfig = async () => {
    if (!configName.trim() || !selectedModule || !selectedReportType) return;
    try {
      await saveConfigMutation.mutateAsync({
        name: configName.trim(),
        module: selectedModule,
        reportType: selectedReportType,
        columns: selectedColumns,
        chartType,
        isDefault: false,
      });
      toast.success('Report layout saved');
      setConfigName('');
    } catch {
      toast.error('Failed to save report layout');
    }
  };

  const handleGenerate = async (format: 'pdf' | 'csv' | 'xlsx') => {
    if (!selectedModule || !selectedReportType) return;
    try {
      const result = await downloadMutation.mutateAsync({
        module: selectedModule,
        reportType: selectedReportType,
        filters: {
          format,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          stationId,
          countyId: filterValues.countyId,
          subcountyId: filterValues.subcountyId,
          roadId: filterValues.roadId,
          weighingType: filterValues.weighingType,
          controlStatus: filterValues.controlStatus,
          useDefaults,
          columns: useDefaults ? undefined : selectedColumns,
          chartType: useDefaults ? undefined : chartType,
        },
      });

      if (format === 'pdf') {
        setPreviewBlob(result.blob);
        setPreviewFileName(result.fileName);
        setPreviewOpen(true);
      } else {
        // Shared helper (was duplicated inline here too - see the same fix in ModuleReportSelector).
        triggerBlobDownload(result.blob, result.fileName);
        toast.success(`${format.toUpperCase()} report downloaded`);
      }
    } catch {
      toast.error('Failed to generate report. Please try again.');
    }
  };

  const isGenerating = downloadMutation.isPending;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom Report Builder</CardTitle>
          <CardDescription>
            Pick a report, then choose exactly which columns and chart visuals to include - or
            leave &quot;Use Recommended Defaults&quot; on for the standard layout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 sm:col-span-2 lg:col-span-2">
              <Label>Report</Label>
              <Select
                value={selectedModule && selectedReportType ? `${selectedModule}::${selectedReportType}` : ''}
                onValueChange={handleSelectReport}
                disabled={catalogLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a report..." />
                </SelectTrigger>
                <SelectContent>
                  {allReports.map((r) => (
                    <SelectItem key={`${r.module}::${r.id}`} value={`${r.module}::${r.id}`}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <StationSelectFilter label="Station" value={stationId} onValueChange={setStationId} />
            </div>
          </div>

          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            className="grid grid-cols-2 gap-3 sm:w-1/2"
          />

          {dynamicFilters.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Drill-down filters for this report</Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {dynamicFilters.map((f) => {
                  if (f.kind === 'county') {
                    return (
                      <CountySelectFilter
                        key={f.key}
                        label={f.label}
                        value={filterValues[f.key]}
                        onValueChange={(v) => setFilterValue(f.key, v)}
                      />
                    );
                  }
                  if (f.kind === 'subcounty') {
                    return (
                      <SubcountySelectFilter
                        key={f.key}
                        label={f.label}
                        value={filterValues[f.key]}
                        countyId={filterValues.countyId}
                        onValueChange={(v) => setFilterValue(f.key, v)}
                      />
                    );
                  }
                  if (f.kind === 'road') {
                    return (
                      <RoadSelectFilter
                        key={f.key}
                        label={f.label}
                        value={filterValues[f.key]}
                        countyId={filterValues.countyId}
                        onValueChange={(v) => setFilterValue(f.key, v)}
                      />
                    );
                  }
                  if (f.kind === 'select' && f.options?.length) {
                    return (
                      <div key={f.key} className="space-y-2">
                        <Label className="text-xs text-gray-500">{f.label}</Label>
                        <Select
                          value={filterValues[f.key] ?? 'all'}
                          onValueChange={(v) => setFilterValue(f.key, v === 'all' ? undefined : v)}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder={`All ${f.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All {f.label.toLowerCase()}</SelectItem>
                            {f.options.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}

          {selectedReport && (
            <div className="flex items-center gap-3 rounded-md border p-3">
              <Switch checked={useDefaults} onCheckedChange={setUseDefaults} id="use-defaults" />
              <Label htmlFor="use-defaults" className="cursor-pointer">
                Use Recommended Defaults
              </Label>
              <span className="text-xs text-muted-foreground">
                {useDefaults
                  ? 'Generates the standard layout for this report.'
                  : 'Customize columns and chart visuals below.'}
              </span>
            </div>
          )}

          {selectedReport && !useDefaults && (
            <div className="space-y-4 rounded-md border p-4">
              {selectedReport.columns && selectedReport.columns.length > 0 ? (
                <div className="space-y-2">
                  <Label>Columns to include</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {selectedReport.columns.map((col) => (
                      <div key={col.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`col-${col.key}`}
                          checked={selectedColumns.includes(col.key)}
                          onCheckedChange={(checked) => toggleColumn(col.key, checked === true)}
                        />
                        <Label htmlFor={`col-${col.key}`} className="text-sm font-normal cursor-pointer">
                          {col.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This report doesn&apos;t have a column catalog yet - it will use its standard columns.
                </p>
              )}

              {selectedReport.chartOptions && selectedReport.chartOptions.length > 0 && (
                <div className="space-y-2">
                  <Label>Chart visuals</Label>
                  <Select value={chartType} onValueChange={setChartType}>
                    <SelectTrigger className="sm:w-1/2">
                      <SelectValue placeholder="Select chart option..." />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedReport.chartOptions.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label>Save this layout as...</Label>
                  <Input
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    placeholder="e.g. Nairobi station monthly review"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleSaveConfig}
                  disabled={!configName.trim() || saveConfigMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  Save
                </Button>
              </div>

              {savedConfigs.length > 0 && (
                <div className="space-y-2">
                  <Label>Saved layouts</Label>
                  <div className="flex flex-wrap gap-2">
                    {savedConfigs.map((c) => (
                      <div key={c.id} className="flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1">
                        <button
                          type="button"
                          className="text-sm hover:underline"
                          onClick={() => handleApplyConfig(c.id)}
                        >
                          {c.name}
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${c.name}`}
                          onClick={() => deleteConfigMutation.mutate(c.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedReport && (
            <div className="flex gap-2 pt-2">
              <Button variant="outline" disabled={isGenerating} onClick={() => handleGenerate('pdf')}>
                {isGenerating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Eye className="h-4 w-4 mr-1.5" />}
                Preview PDF
              </Button>
              <Button variant="outline" disabled={isGenerating} onClick={() => handleGenerate('csv')}>
                <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                CSV
              </Button>
              <Button variant="outline" disabled={isGenerating} onClick={() => handleGenerate('xlsx')}>
                <FileSpreadsheet className="h-4 w-4 mr-1.5 text-green-600" />
                Excel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
