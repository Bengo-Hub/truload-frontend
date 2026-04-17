/**
 * Portal Reports Page
 *
 * Report downloads based on subscription tier.
 * Shows locked reports for upgrade CTA.
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortalSubscription } from '@/hooks/queries/usePortalQueries';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Lock,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';

interface PortalReportDef {
  id: string;
  name: string;
  description: string;
  formats: ('pdf' | 'csv')[];
  requiredTier: 'basic' | 'standard' | 'premium';
}

const PORTAL_REPORTS: PortalReportDef[] = [
  {
    id: 'weighing-summary',
    name: 'Weighing Summary',
    description: 'Monthly summary of all weighings by vehicle',
    formats: ['pdf', 'csv'],
    requiredTier: 'basic',
  },
  {
    id: 'vehicle-weight-history',
    name: 'Vehicle Weight History',
    description: 'Complete weight history for each vehicle',
    formats: ['pdf', 'csv'],
    requiredTier: 'basic',
  },
  {
    id: 'driver-trips',
    name: 'Driver Trip Report',
    description: 'Trip details per driver with payload data',
    formats: ['pdf', 'csv'],
    requiredTier: 'standard',
  },
  {
    id: 'cargo-analysis',
    name: 'Cargo Volume Analysis',
    description: 'Cargo volumes by type over time',
    formats: ['pdf', 'csv'],
    requiredTier: 'standard',
  },
  {
    id: 'fleet-utilization',
    name: 'Fleet Utilization',
    description: 'Vehicle utilization rates and idle time analysis',
    formats: ['pdf', 'csv'],
    requiredTier: 'premium',
  },
  {
    id: 'weight-discrepancy',
    name: 'Weight Discrepancy',
    description: 'Compare expected vs actual weights per consignment',
    formats: ['pdf', 'csv'],
    requiredTier: 'premium',
  },
];

const TIER_ORDER = { basic: 0, standard: 1, premium: 2 };

export default function PortalReportsPage() {
  const { data: subscription, isLoading } = usePortalSubscription();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const currentTier = subscription?.tier ?? 'basic';

  const isUnlocked = (requiredTier: string) => {
    return TIER_ORDER[currentTier] >= TIER_ORDER[requiredTier as keyof typeof TIER_ORDER];
  };

  const handleDownload = async (reportId: string, format: 'pdf' | 'csv') => {
    try {
      setDownloadingId(reportId);
      const response = await apiClient.get(`/portal/reports/${reportId}`, {
        params: { format },
        responseType: 'blob',
      });
      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportId}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch {
      toast.error('Failed to download report');
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-500">Download and analyze your data</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-500">Download and analyze your data</p>
        </div>
        <Badge variant="outline" className="capitalize">
          {currentTier} Plan
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PORTAL_REPORTS.map((report) => {
          const unlocked = isUnlocked(report.requiredTier);
          const isDownloading = downloadingId === report.id;

          return (
            <Card
              key={report.id}
              className={`hover:shadow-md transition-shadow ${!unlocked ? 'opacity-75' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  {unlocked ? (
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Lock className="h-5 w-5 text-gray-400" />
                  )}
                  <Badge
                    variant={unlocked ? 'default' : 'secondary'}
                    className="text-[10px] capitalize"
                  >
                    {report.requiredTier}
                  </Badge>
                </div>
                <CardTitle className="text-sm">{report.name}</CardTitle>
                <CardDescription className="text-xs">{report.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {unlocked ? (
                  <div className="flex gap-2">
                    {report.formats.includes('pdf') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={isDownloading}
                        onClick={() => handleDownload(report.id, 'pdf')}
                      >
                        {isDownloading ? (
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3 mr-1.5" />
                        )}
                        PDF
                      </Button>
                    )}
                    {report.formats.includes('csv') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={isDownloading}
                        onClick={() => handleDownload(report.id, 'csv')}
                      >
                        {isDownloading ? (
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="h-3 w-3 mr-1.5" />
                        )}
                        CSV
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <a href="/portal/subscription">
                      <Lock className="h-3 w-3 mr-1.5" />
                      Upgrade to {report.requiredTier}
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
