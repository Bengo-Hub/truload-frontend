'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle,
  Cpu,
  Database,
  HardDrive,
  MonitorSpeaker,
  Network,
  RefreshCcw,
  Scale,
  Server,
  Settings,
  Signal,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Technical Dashboard Page
 *
 * Features:
 * - System health monitoring
 * - Device status overview
 * - Scale test status
 * - Network connectivity
 * - Service status
 */
export default function TechnicalPage() {
  return (
    <AppShell title="Technical" subtitle="System monitoring and device health">
      <ProtectedRoute requiredPermissions={['config.read']}>
        <TechnicalContent />
      </ProtectedRoute>
    </AppShell>
  );
}

// Mock data for device status (would come from API)
interface DeviceStatus {
  id: string;
  name: string;
  type: 'scale' | 'camera' | 'anpr' | 'boom' | 'server';
  status: 'online' | 'offline' | 'degraded';
  lastSeen: string;
  ipAddress: string;
  location: string;
}

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  lastCheck: string;
}

function TechnicalContent() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Mock device data (would be fetched from API)
  const devices: DeviceStatus[] = [
    { id: '1', name: 'Scale A - Weighbridge 1', type: 'scale', status: 'online', lastSeen: '2 min ago', ipAddress: '192.168.1.101', location: 'Bound A' },
    { id: '2', name: 'Scale B - Weighbridge 1', type: 'scale', status: 'online', lastSeen: '2 min ago', ipAddress: '192.168.1.102', location: 'Bound B' },
    { id: '3', name: 'ANPR Camera - Entry', type: 'anpr', status: 'online', lastSeen: '1 min ago', ipAddress: '192.168.1.110', location: 'Entry Gate' },
    { id: '4', name: 'ANPR Camera - Exit', type: 'anpr', status: 'degraded', lastSeen: '5 min ago', ipAddress: '192.168.1.111', location: 'Exit Gate' },
    { id: '5', name: 'Overview Camera', type: 'camera', status: 'online', lastSeen: '1 min ago', ipAddress: '192.168.1.120', location: 'Control Room' },
    { id: '6', name: 'Entry Boom Gate', type: 'boom', status: 'online', lastSeen: '30 sec ago', ipAddress: '192.168.1.130', location: 'Entry' },
    { id: '7', name: 'Exit Boom Gate', type: 'boom', status: 'offline', lastSeen: '15 min ago', ipAddress: '192.168.1.131', location: 'Exit' },
  ];

  // Mock service status data
  const services: ServiceStatus[] = [
    { name: 'TruLoad API', status: 'healthy', latency: 45, lastCheck: '30 sec ago' },
    { name: 'TruConnect Local', status: 'healthy', latency: 12, lastCheck: '30 sec ago' },
    { name: 'Database', status: 'healthy', latency: 8, lastCheck: '1 min ago' },
    { name: 'NTSA Integration', status: 'degraded', latency: 850, lastCheck: '2 min ago' },
    { name: 'eCitizen Gateway', status: 'healthy', latency: 230, lastCheck: '1 min ago' },
    { name: 'Redis Cache', status: 'healthy', latency: 2, lastCheck: '30 sec ago' },
  ];

  // Mock scale test status
  const scaleTestStatus = {
    lastTestDate: '2026-02-05',
    lastTestTime: '06:30 AM',
    result: 'pass' as const,
    deviation: 0.3,
    nextTestDue: 'Tomorrow 06:00 AM',
    testType: 'Calibration Weight',
    testedBy: 'John Ochieng',
  };

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastRefresh(new Date());
    }, 1500);
  };

  // Calculate summary stats
  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const offlineDevices = devices.filter(d => d.status === 'offline').length;
  const degradedDevices = devices.filter(d => d.status === 'degraded').length;
  const healthyServices = services.filter(s => s.status === 'healthy').length;

  // Get status badge
  const getStatusBadge = (status: 'online' | 'offline' | 'degraded' | 'healthy' | 'down') => {
    switch (status) {
      case 'online':
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Online</Badge>;
      case 'offline':
      case 'down':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Offline</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Degraded</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get device icon
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'scale': return Scale;
      case 'camera': return Camera;
      case 'anpr': return Camera;
      case 'boom': return MonitorSpeaker;
      case 'server': return Server;
      default: return HardDrive;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Devices Online</p>
                <p className="text-2xl font-bold text-green-600">{onlineDevices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Devices Offline</p>
                <p className="text-2xl font-bold text-red-600">{offlineDevices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Degraded</p>
                <p className="text-2xl font-bold text-yellow-600">{degradedDevices}</p>
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

      {/* Tabs */}
      <Tabs defaultValue="devices" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            <span className="hidden sm:inline">Devices</span>
          </TabsTrigger>
          <TabsTrigger value="scale-test" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Scale Test</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            <span className="hidden sm:inline">Services</span>
          </TabsTrigger>
          <TabsTrigger value="network" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            <span className="hidden sm:inline">Network</span>
          </TabsTrigger>
        </TabsList>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hardware Devices</CardTitle>
              <CardDescription>Status of all connected weighbridge hardware</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Device</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                    <TableHead className="font-semibold">IP Address</TableHead>
                    <TableHead className="font-semibold">Location</TableHead>
                    <TableHead className="font-semibold">Last Seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => {
                    const Icon = getDeviceIcon(device.type);
                    return (
                      <TableRow key={device.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{device.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{device.type}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(device.status)}</TableCell>
                        <TableCell className="font-mono text-sm">{device.ipAddress}</TableCell>
                        <TableCell>{device.location}</TableCell>
                        <TableCell className="text-muted-foreground">{device.lastSeen}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

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
                <div className={`p-4 rounded-lg ${scaleTestStatus.result === 'pass' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {scaleTestStatus.result === 'pass' ? (
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      ) : (
                        <XCircle className="h-8 w-8 text-red-600" />
                      )}
                      <div>
                        <p className="font-semibold text-lg">
                          {scaleTestStatus.result === 'pass' ? 'Test Passed' : 'Test Failed'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {scaleTestStatus.lastTestDate} at {scaleTestStatus.lastTestTime}
                        </p>
                      </div>
                    </div>
                    <Badge variant={scaleTestStatus.result === 'pass' ? 'default' : 'destructive'}>
                      {scaleTestStatus.deviation}% deviation
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Test Type</p>
                    <p className="font-medium">{scaleTestStatus.testType}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Performed By</p>
                    <p className="font-medium">{scaleTestStatus.testedBy}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Next Test Due</p>
                    <p className="font-medium">{scaleTestStatus.nextTestDue}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Max Allowed Deviation</p>
                    <p className="font-medium">0.5% or 50kg</p>
                  </div>
                </div>

                <Button className="w-full" variant="outline">
                  <Scale className="mr-2 h-4 w-4" />
                  Perform New Scale Test
                </Button>
              </CardContent>
            </Card>

            {/* Test History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Test History</CardTitle>
                <CardDescription>Last 7 days of scale test results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { date: 'Today', time: '06:30 AM', result: 'pass', deviation: 0.3 },
                    { date: 'Yesterday', time: '06:25 AM', result: 'pass', deviation: 0.2 },
                    { date: 'Feb 3', time: '06:32 AM', result: 'pass', deviation: 0.4 },
                    { date: 'Feb 2', time: '06:28 AM', result: 'pass', deviation: 0.1 },
                    { date: 'Feb 1', time: '06:45 AM', result: 'fail', deviation: 0.8 },
                  ].map((test, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        {test.result === 'pass' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{test.date}</p>
                          <p className="text-xs text-muted-foreground">{test.time}</p>
                        </div>
                      </div>
                      <Badge variant={test.result === 'pass' ? 'secondary' : 'destructive'}>
                        {test.deviation}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service Health</CardTitle>
              <CardDescription>Status of all integrated services and APIs</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Service</TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                    <TableHead className="font-semibold text-right">Latency</TableHead>
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
                      <TableCell className="text-right">
                        <span className={`font-mono ${service.latency && service.latency > 500 ? 'text-yellow-600' : ''}`}>
                          {service.latency}ms
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{service.lastCheck}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Network Tab */}
        <TabsContent value="network" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  Network Connectivity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <Wifi className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Internet Connection</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Connected</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <Signal className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Local Network</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Database Connection</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Connected</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  System Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CPU Usage</span>
                    <span className="font-medium">35%</span>
                  </div>
                  <Progress value={35} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Memory Usage</span>
                    <span className="font-medium">62%</span>
                  </div>
                  <Progress value={62} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Disk Usage</span>
                    <span className="font-medium">48%</span>
                  </div>
                  <Progress value={48} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
