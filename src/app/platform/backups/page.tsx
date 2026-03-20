'use client';

/**
 * Platform Backup & Restore page.
 * Create, download, validate, restore, and delete backups.
 * Configure automated backup schedule and retention.
 */

import { PlatformShell } from '@/components/layout/PlatformShell';
import { BackupSettingsForm } from '@/components/settings/BackupSettingsForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useBackupList,
  useBackupStatus,
  useCreateBackup,
  useDeleteBackup,
  useDownloadBackup,
  useRestoreBackup,
} from '@/hooks/queries';
import { formatFileSize } from '@/lib/api/backup';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, Database, Download, Loader2, RefreshCcw, Settings, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function PlatformBackupsPage() {
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useBackupStatus();
  const { data: backups, isLoading: backupsLoading, refetch: refetchBackups } = useBackupList();
  const createBackup = useCreateBackup();
  const deleteBackup = useDeleteBackup();
  const downloadBackup = useDownloadBackup();
  const restoreBackup = useRestoreBackup();
  const [restoringFile, setRestoringFile] = useState('');

  const handleCreate = async () => {
    try {
      const result = await createBackup.mutateAsync({ backupType: 'Full' });
      if (result?.success) { toast.success(`Backup created: ${result.fileName}`); refetchBackups(); refetchStatus(); }
      else toast.error(result?.message || 'Backup failed');
    } catch { toast.error('Backup creation failed'); }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Delete backup ${fileName}?`)) return;
    try {
      await deleteBackup.mutateAsync(fileName);
      toast.success('Backup deleted');
      refetchBackups(); refetchStatus();
    } catch { toast.error('Failed to delete backup'); }
  };

  const handleRestore = async (fileName: string) => {
    if (!confirm(`DANGEROUS: Restore database from ${fileName}? This will replace all current data.`)) return;
    setRestoringFile(fileName);
    try {
      const result = await restoreBackup.mutateAsync({ fileName });
      if (result?.success) toast.success('Database restored successfully');
      else toast.error(result?.message || 'Restore failed');
    } catch { toast.error('Restore failed'); }
    finally { setRestoringFile(''); }
  };

  return (
    <PlatformShell title="Backup & Restore" subtitle="Database backups, automated scheduling, and disaster recovery">
      <Tabs defaultValue="backups" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="backups" className="gap-2"><Database className="h-4 w-4" />Backups</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" />Schedule & Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="backups" className="mt-6 space-y-6">
          {/* Status overview */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-gray-500 uppercase">Status</p>
                {statusLoading ? <Skeleton className="mt-1 h-6 w-20" /> : (
                  <Badge className={status?.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                    {status?.isEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-gray-500 uppercase">Total Backups</p>
                <p className="mt-1 text-xl font-bold">{status?.totalBackupsCount ?? '...'}</p>
                <p className="text-xs text-gray-400">{status?.totalStorageUsedBytes ? formatFileSize(status.totalStorageUsedBytes) : ''}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-gray-500 uppercase">Next Scheduled</p>
                <p className="mt-1 text-sm font-medium">{status?.nextScheduledBackup ? format(new Date(status.nextScheduledBackup), 'PPp') : 'Not scheduled'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button onClick={handleCreate} disabled={createBackup.isPending}>
              {createBackup.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
              Create Backup
            </Button>
            <Button variant="outline" size="sm" onClick={() => { refetchBackups(); refetchStatus(); }}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>

          {/* Backup list */}
          {backupsLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : !backups?.backups?.length ? (
            <Card className="p-8 text-center text-gray-500">No backups found. Create your first backup above.</Card>
          ) : (
            <div className="space-y-2">
              {backups.backups.map((b: { fileName: string; fileSizeBytes: number; createdAt: string; backupType: string }) => (
                <Card key={b.fileName}>
                  <CardContent className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{b.fileName}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-500">{format(new Date(b.createdAt), 'PPp')}</span>
                        <Badge variant="outline" className="text-[10px]">{b.backupType}</Badge>
                        <span className="text-xs text-gray-400">{formatFileSize(b.fileSizeBytes)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => downloadBackup.mutate(b.fileName)} title="Download">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRestore(b.fileName)} disabled={restoringFile === b.fileName} title="Restore" className="text-amber-600 hover:text-amber-700">
                        {restoringFile === b.fileName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(b.fileName)} title="Delete" className="text-red-500 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <BackupSettingsForm canEdit={true} />
        </TabsContent>
      </Tabs>
    </PlatformShell>
  );
}
