'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cloud, Loader2, PlugZap, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  backupApi,
  type BackupDestinationParams,
  type BackupDestinationType,
  type UpdateBackupDestinationRequest,
} from '@/lib/api/backup';
import { toast } from 'sonner';

const MASK = '********';
const SECRET_KEYS: (keyof BackupDestinationParams)[] = [
  'accessKeyId',
  'secretAccessKey',
  'token',
  'pass',
  'privateKey',
];

const TYPE_OPTIONS: { value: BackupDestinationType; label: string }[] = [
  { value: 'none', label: 'None (local only)' },
  { value: 's3', label: 'S3 / S3-compatible (AWS, MinIO, R2, Wasabi)' },
  { value: 'onedrive', label: 'OneDrive' },
  { value: 'gdrive', label: 'Google Drive' },
  { value: 'webdav', label: 'WebDAV' },
  { value: 'sftp', label: 'SFTP' },
  { value: 'smb', label: 'SMB / Network folder' },
];

export function BackupDestinationForm({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const { data: dest, isLoading } = useQuery({
    queryKey: ['backup', 'destination'],
    queryFn: () => backupApi.getDestination(),
  });

  const [type, setType] = useState<BackupDestinationType>('none');
  const [enabled, setEnabled] = useState(false);
  const [remotePath, setRemotePath] = useState('truload-backups');
  const [params, setParams] = useState<BackupDestinationParams>({});

  useEffect(() => {
    if (dest) {
      setType(dest.type ?? 'none');
      setEnabled(!!dest.enabled);
      setRemotePath(dest.remotePath ?? 'truload-backups');
      setParams(dest.params ?? {});
    }
  }, [dest]);

  const set = (k: keyof BackupDestinationParams, v: string) =>
    setParams((p) => ({ ...p, [k]: v }));

  // Strip secret fields that still hold the masked sentinel so the backend
  // preserves the stored secret instead of overwriting it with "********".
  const buildPayload = (): UpdateBackupDestinationRequest => {
    const outParams: BackupDestinationParams = { ...params };
    for (const k of SECRET_KEYS) {
      if (outParams[k] === MASK) delete outParams[k];
    }
    return { type, enabled, remotePath, params: type === 'none' ? undefined : outParams };
  };

  const saveMutation = useMutation({
    mutationFn: () => backupApi.updateDestination(buildPayload()),
    onSuccess: () => {
      toast.success('Backup destination saved');
      queryClient.invalidateQueries({ queryKey: ['backup', 'destination'] });
    },
    onError: (e: Error) => toast.error('Failed to save destination', { description: e.message }),
  });

  const testMutation = useMutation({
    mutationFn: () => backupApi.testDestination(buildPayload()),
    onSuccess: (r) =>
      r.ok ? toast.success('Connection OK', { description: r.message }) : toast.error('Connection failed', { description: r.message }),
    onError: (e: Error) => toast.error('Test failed', { description: e.message }),
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="h-4 w-1/3 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="h-10 w-full bg-gray-100 animate-pulse rounded" />
      </Card>
    );
  }

  const secretInput = (k: keyof BackupDestinationParams, label: string, placeholder?: string, textarea = false) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      {textarea ? (
        <textarea
          className="w-full min-h-[80px] rounded-md border px-3 py-2 text-sm font-mono"
          value={params[k] ?? ''}
          onFocus={() => { if (params[k] === MASK) set(k, ''); }}
          onChange={(e) => set(k, e.target.value)}
          disabled={!canEdit}
          placeholder={placeholder}
        />
      ) : (
        <Input
          type={params[k] === MASK ? 'text' : 'password'}
          value={params[k] ?? ''}
          onFocus={() => { if (params[k] === MASK) set(k, ''); }}
          onChange={(e) => set(k, e.target.value)}
          disabled={!canEdit}
          placeholder={placeholder}
        />
      )}
    </div>
  );

  const textInput = (k: keyof BackupDestinationParams, label: string, placeholder?: string) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={params[k] ?? ''} onChange={(e) => set(k, e.target.value)} disabled={!canEdit} placeholder={placeholder} />
    </div>
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-gray-600" />
          <div>
            <h3 className="text-lg font-semibold">Remote Backup Destination</h3>
            <p className="text-sm text-gray-500">
              Optionally mirror backups off-server to cloud or network storage. The local copy is always kept.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="dest-enabled" className="text-sm font-medium">Enabled</Label>
          <Switch id="dest-enabled" checked={enabled} onCheckedChange={setEnabled} disabled={!canEdit || type === 'none'} />
        </div>
      </div>

      <div className="space-y-6 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Destination Type</Label>
            <Select value={type} onValueChange={(v: BackupDestinationType) => setType(v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type !== 'none' && (
            <div className="space-y-2">
              <Label>Remote Path / Folder</Label>
              <Input value={remotePath} onChange={(e) => setRemotePath(e.target.value)} disabled={!canEdit} placeholder="truload-backups" />
              <p className="text-xs text-muted-foreground">Folder/prefix on the remote where backups are mirrored.</p>
            </div>
          )}
        </div>

        {type === 's3' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-4 bg-gray-50/50">
            {textInput('provider', 'Provider', 'AWS | Minio | Cloudflare | Wasabi | Other')}
            {textInput('bucket', 'Bucket', 'my-backups')}
            {textInput('region', 'Region', 'us-east-1')}
            {textInput('endpoint', 'Endpoint (S3-compatible)', 'https://s3.example.com')}
            {secretInput('accessKeyId', 'Access Key ID')}
            {secretInput('secretAccessKey', 'Secret Access Key')}
          </div>
        )}

        {(type === 'onedrive' || type === 'gdrive') && (
          <div className="grid grid-cols-1 gap-4 border rounded-lg p-4 bg-gray-50/50">
            {secretInput('token', 'rclone OAuth Token (JSON)', '{"access_token":"...","refresh_token":"..."}', true)}
            {textInput('driveId', type === 'onedrive' ? 'Drive ID (OneDrive)' : 'Drive ID (Shared Drive, optional)')}
            <p className="text-xs text-muted-foreground">
              Generate the token with <code>rclone authorize &quot;{type === 'onedrive' ? 'onedrive' : 'drive'}&quot;</code> and paste the JSON here.
            </p>
          </div>
        )}

        {type === 'webdav' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-4 bg-gray-50/50">
            {textInput('url', 'WebDAV URL', 'https://dav.example.com/remote.php/webdav')}
            {textInput('user', 'Username')}
            {secretInput('pass', 'Password')}
          </div>
        )}

        {type === 'sftp' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-4 bg-gray-50/50">
            {textInput('host', 'Host', 'sftp.example.com')}
            {textInput('port', 'Port', '22')}
            {textInput('user', 'Username')}
            {secretInput('pass', 'Password (or use private key)')}
            <div className="md:col-span-2">{secretInput('privateKey', 'Private Key (PEM, optional)', '-----BEGIN OPENSSH PRIVATE KEY-----', true)}</div>
          </div>
        )}

        {type === 'smb' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-4 bg-gray-50/50">
            {textInput('host', 'Host / Server', '192.168.1.10')}
            {textInput('share', 'Share Name', 'backups')}
            {textInput('domain', 'Domain (optional)', 'WORKGROUP')}
            {textInput('port', 'Port (optional)', '445')}
            {textInput('user', 'Username')}
            {secretInput('pass', 'Password')}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          {type !== 'none' && (
            <Button type="button" variant="outline" onClick={() => testMutation.mutate()} disabled={!canEdit || testMutation.isPending}>
              {testMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
              Test Connection
            </Button>
          )}
          <Button type="button" onClick={() => saveMutation.mutate()} disabled={!canEdit || saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Destination
          </Button>
        </div>
      </div>
    </Card>
  );
}
