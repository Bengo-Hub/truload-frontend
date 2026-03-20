'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { CalibrationConfigTab } from '@/components/settings/CalibrationConfigTab';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHealthStatus } from '@/hooks/queries/useTechnicalQueries';
import { useMyStation, useScaleTestStatus } from '@/hooks/queries/useWeighingQueries';
import { useAuth, useHasPermission } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    Activity,
    AlertTriangle,
    CheckCircle,
    HardDrive,
    Network,
    RefreshCcw,
    Scale,
    Server,
    Signal,
    Wifi,
    WifiOff,
    XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export default function TechnicalPage() {
  return (
    <AppShell title="Technical" subtitle="System monitoring and device health">
      <ProtectedRoute requiredPermissions={['technical.read']}>
        <TechnicalContent />
      </ProtectedRoute>
    </AppShell>
  );
}

function TechnicalContent() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(true);
  const canEdit = useHasPermission('config.read');
  const { user } = useAuth();
  // Services and Network tabs are only visible to platform users (superusers)
  const isPlatformUser = user?.isSuperUser === true;

  // Real data hooks
  const { data: health, isLoading: healthLoading, dataUpdatedAt: healthUpdatedAt } = useHealthStatus();
  const { data: myStation } = useMyStation();
  const { data: scaleTestStatus, isLoading: scaleTestLoading } = useScaleTestStatus(myStation?.id);

  // Track online/offline status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Refresh all
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['technical'] });
    queryClient.invalidateQueries({ queryKey: ['scale-tests'] });
  };

  // Derive service statuses from real data
  const services = [
    {
      name: 'Backend API',
      status: health ? 'healthy' as const : healthLoading ? 'checking' as const : 'down' as const,
      detail: health ? `v${health.version}` : healthLoading ? 'Checking...' : 'Unreachable',
      lastCheck: healthUpdatedAt ? format(new Date(healthUpdatedAt), 'HH:mm:ss') : '-',
    },
    {
      name: 'Internet Connection',
      status: isOnline ? 'healthy' as const : 'down' as const,
      detail: isOnline ? 'Connected' : 'Offline',
      lastCheck: 'Real-time',
    },
    {
      name: 'Station Config',
      status: myStation ? 'healthy' as const : 'down' as const,
      detail: myStation ? `${myStation.name} (${myStation.code})` : 'No station linked',
      lastCheck: '-',
    },
  ];

  const healthyServices = services.filter(s => s.status === 'healthy').length;
  const backendHealthy = health?.status === 'healthy';

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Healthy</Badge>;
      case 'down':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Down</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Degraded</Badge>;
      case 'checking':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Checking</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Last health check: {healthUpdatedAt ? format(new Date(healthUpdatedAt), 'PPp') : 'Never'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${backendHealthy ? 'bg-green-100' : 'bg-red-100'}`}>
                {backendHealthy ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Backend API</p>
                <p className={`text-lg font-bold ${backendHealthy ? 'text-green-600' : 'text-red-600'}`}>
                  {healthLoading ? '...' : backendHealthy ? 'Healthy' : 'Down'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isOnline ? 'bg-green-100' : 'bg-red-100'}`}>
                {isOnline ? (
                  <Wifi className="h-5 w-5 text-green-600" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Internet</p>
                <p className={`text-lg font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${scaleTestStatus?.hasValidTest ? 'bg-green-100' : 'bg-yellow-100'}`}>
                <Scale className={`h-5 w-5 ${scaleTestStatus?.hasValidTest ? 'text-green-600' : 'text-yellow-600'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Scale Test</p>
                <p className={`text-lg font-bold ${scaleTestStatus?.hasValidTest ? 'text-green-600' : 'text-yellow-600'}`}>
                  {scaleTestLoading ? '...' : scaleTestStatus?.hasValidTest ? 'Passed' : 'Pending'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Services Healthy</p>
                <p className="text-2xl font-bold text-blue-600">{healthyServices}/{services.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs (Calibration moved from Integrations to Technical per Section 19) */}
      <Tabs defaultValue={isPlatformUser ? "services" : "scale-test"} className="space-y-6">
        <TabsList className={`grid w-full ${isPlatformUser ? 'grid-cols-4' : 'grid-cols-2'}`}>
          {/* Services — platform users only */}
          {isPlatformUser && (
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              <span className="hidden sm:inline">Services</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="scale-test" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Scale Test</span>
          </TabsTrigger>
          <TabsTrigger value="calibration" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Calibration</span>
          </TabsTrigger>
          {/* Network — platform users only */}
          {isPlatformUser && (
            <TabsTrigger value="network" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              <span className="hidden sm:inline">Network</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Services Tab — platform users only */}
        {isPlatformUser && <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service Health</CardTitle>
              <CardDescription>Status of backend services and connectivity</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {healthLoading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold">Service</TableHead>
                      <TableHead className="font-semibold text-center">Status</TableHead>
                      <TableHead className="font-semibold">Detail</TableHead>
                      <TableHead className="font-semibold">Last Check</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{service.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(service.status)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {service.detail}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">
                          {service.lastCheck}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Backend Details */}
          {health && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Backend Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Service</p>
                    <p className="font-medium">{health.service}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Version</p>
                    <p className="font-medium font-mono">{health.version}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="font-medium capitalize">{health.status}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Server Time</p>
                    <p className="font-medium">{format(new Date(health.timestamp), 'PPp')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        }

        {/* Scale Test Tab */}
        <TabsContent value="scale-test" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Current Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Daily Scale Test Status
                </CardTitle>
                <CardDescription>Required before weighing operations can commence</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {scaleTestLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : scaleTestStatus?.latestTest ? (
                  <>
                    <div className={`p-4 rounded-lg ${scaleTestStatus.hasValidTest ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {scaleTestStatus.hasValidTest ? (
                            <CheckCircle className="h-8 w-8 text-green-600" />
                          ) : (
                            <XCircle className="h-8 w-8 text-red-600" />
                          )}
                          <div>
                            <p className="font-semibold text-lg">
                              {scaleTestStatus.hasValidTest ? 'Test Passed' : 'Test Failed'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(scaleTestStatus.latestTest.carriedAt), 'PPp')}
                            </p>
                          </div>
                        </div>
                        {scaleTestStatus.latestTest.deviationKg !== undefined && (
                          <Badge variant={scaleTestStatus.hasValidTest ? 'default' : 'destructive'}>
                            {scaleTestStatus.latestTest.deviationKg} kg deviation
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Test Weight</p>
                        <p className="font-medium">{scaleTestStatus.latestTest.testWeightKg ?? '-'} kg</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Measured Weight</p>
                        <p className="font-medium">{scaleTestStatus.latestTest.actualWeightKg ?? '-'} kg</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Performed By</p>
                        <p className="font-medium">{scaleTestStatus.latestTest.carriedByName || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Weighing Allowed</p>
                        <p className="font-medium">{scaleTestStatus.weighingAllowed ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-center">
                    <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                    <p className="font-semibold">No Scale Test Today</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {scaleTestStatus?.message || 'A daily scale test is required before weighing operations.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Station Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Station Information</CardTitle>
                <CardDescription>Your assigned weighbridge station</CardDescription>
              </CardHeader>
              <CardContent>
                {myStation ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground">Station Name</span>
                      <span className="font-medium">{myStation.name}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground">Station Code</span>
                      <span className="font-mono font-medium">{myStation.code}</span>
                    </div>
                    {myStation.supportsBidirectional && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span className="text-sm text-muted-foreground">Bidirectional</span>
                        <Badge className="bg-blue-100 text-blue-800">Supported</Badge>
                      </div>
                    )}
                    {myStation.location && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span className="text-sm text-muted-foreground">Location</span>
                        <span className="font-medium">{myStation.location}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <HardDrive className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No station assigned to your account.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Calibration Tab (moved from Integrations) */}
        <TabsContent value="calibration" className="space-y-6">
          <CalibrationConfigTab canEdit={canEdit} />
        </TabsContent>

        {/* Network Tab — platform users only */}
        {isPlatformUser && <TabsContent value="network" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  Connectivity Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`flex items-center justify-between p-3 rounded-lg ${isOnline ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center gap-3">
                    {isOnline ? (
                      <Wifi className="h-5 w-5 text-green-600" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">Internet Connection</span>
                  </div>
                  <Badge className={isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {isOnline ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div className={`flex items-center justify-between p-3 rounded-lg ${backendHealthy ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center gap-3">
                    <Signal className={`h-5 w-5 ${backendHealthy ? 'text-green-600' : 'text-red-600'}`} />
                    <span className="font-medium">Backend API</span>
                  </div>
                  <Badge className={backendHealthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {backendHealthy ? 'Reachable' : 'Unreachable'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Backend Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                {health ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground">Service</span>
                      <span className="font-medium">{health.service}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground">Version</span>
                      <span className="font-mono font-medium">{health.version}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground">Server Time</span>
                      <span className="font-medium">{format(new Date(health.timestamp), 'PPp')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{healthLoading ? 'Checking backend...' : 'Backend unreachable'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>}
      </Tabs>
    </div>
  );
}
