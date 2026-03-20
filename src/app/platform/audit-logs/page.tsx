'use client';

/**
 * Platform Audit Logs page.
 * View system-wide activity logs with filtering, pagination, and summary stats.
 */

import { PlatformShell } from '@/components/layout/PlatformShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuditLogs, useAuditLogSummary } from '@/hooks/queries';
import { format } from 'date-fns';
import { AlertCircle, ChevronLeft, ChevronRight, FileText, RefreshCcw, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  READ: 'bg-blue-100 text-blue-800',
  UPDATE: 'bg-amber-100 text-amber-800',
  DELETE: 'bg-red-100 text-red-800',
  LOGIN: 'bg-violet-100 text-violet-800',
  LOGOUT: 'bg-gray-100 text-gray-600',
};

export default function PlatformAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [actionFilter, setActionFilter] = useState<string>('all');

  const { data: logs, isLoading, refetch } = useAuditLogs({
    pageNumber: page,
    pageSize,
    action: actionFilter === 'all' ? undefined : actionFilter,
  });
  const { data: summary } = useAuditLogSummary();

  const totalPages = logs?.totalCount ? Math.ceil(logs.totalCount / pageSize) : 0;

  return (
    <PlatformShell
      title="Audit Logs"
      subtitle="System-wide activity tracking and security monitoring"
      actions={
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      }
    >
      {/* Summary stats */}
      {summary && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 mb-6">
          <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-gray-500 uppercase">Total Entries</p><p className="text-xl font-bold">{summary.totalEntries?.toLocaleString() ?? 0}</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-gray-500 uppercase">Successful</p><p className="text-xl font-bold">{summary.successfulEntries ?? 0}</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-gray-500 uppercase">Failed</p><p className="text-xl font-bold text-red-600">{summary.failedEntries ?? 0}</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-gray-500 uppercase">Unique Users</p><p className="text-xl font-bold">{summary.uniqueUsers ?? 0}</p></CardContent></Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Filter action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="CREATE">Create</SelectItem>
            <SelectItem value="READ">Read</SelectItem>
            <SelectItem value="UPDATE">Update</SelectItem>
            <SelectItem value="DELETE">Delete</SelectItem>
            <SelectItem value="LOGIN">Login</SelectItem>
            <SelectItem value="LOGOUT">Logout</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-500">
          {logs?.totalCount ?? 0} total entries
        </span>
      </div>

      {/* Logs table */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : !logs?.items?.length ? (
        <Card className="p-8 text-center text-gray-500">
          <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
          <p>No audit log entries found.</p>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="w-[140px]">Timestamp</TableHead>
                    <TableHead className="w-[80px]">Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Endpoint</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.items.map((log) => (
                    <TableRow key={log.id} className={!log.success ? 'bg-red-50/30' : ''}>
                      <TableCell className="text-xs text-gray-600 font-mono whitespace-nowrap">
                        {format(new Date(log.createdAt), 'MM/dd HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Badge className={ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'} variant="outline">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="font-medium">{log.resourceType}</span>
                        {log.resourceId && <span className="text-xs text-gray-400 ml-1 font-mono">{log.resourceId.slice(0, 8)}</span>}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 truncate max-w-[150px]">
                        {log.userFullName || log.userEmail || log.userName || '-'}
                      </TableCell>
                      <TableCell>
                        {log.success ? (
                          <span className="text-green-600 text-xs">OK</span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 text-xs"><AlertCircle className="h-3 w-3" />{log.statusCode || 'ERR'}</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-gray-400 font-mono truncate max-w-[200px]">
                        {log.httpMethod && <span className="mr-1">{log.httpMethod}</span>}
                        {log.endpoint}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </PlatformShell>
  );
}
