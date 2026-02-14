'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useHasPermission } from '@/hooks/useAuth';
import {
  useAllActs,
  useActConfiguration,
  useSetDefaultAct,
} from '@/hooks/queries/useActQueries';
import type {
  ActDefinitionDto,
  AxleFeeScheduleDto,
  AxleTypeOverloadFeeScheduleDto,
  ToleranceSettingDto,
  DemeritPointScheduleDto,
} from '@/lib/api/acts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BookOpen, CheckCircle, DollarSign, Scale, Shield, Star } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ActsConfigurationPage() {
  return (
    <ProtectedRoute requiredPermissions={['config.read']}>
      <ActsConfigurationContent />
    </ProtectedRoute>
  );
}

function ActsConfigurationContent() {
  const { data: acts, isLoading: actsLoading } = useAllActs();
  const canUpdate = useHasPermission(['config.update']);
  const [selectedActId, setSelectedActId] = useState<string>('');

  // Auto-select first act when loaded
  const activeActId = selectedActId || acts?.[0]?.id || '';

  const { data: actConfig, isLoading: configLoading } = useActConfiguration(activeActId);
  const setDefaultMutation = useSetDefaultAct();

  const handleSetDefault = async (actId: string) => {
    try {
      await setDefaultMutation.mutateAsync(actId);
      toast.success('Default act updated successfully');
    } catch {
      toast.error('Failed to update default act');
    }
  };

  if (actsLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Acts & Compliance</h1>
        <p className="text-sm text-muted-foreground">
          Manage legal framework configurations, fee schedules, tolerances, and demerit points.
        </p>
      </div>

      {/* Act Definition Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {acts?.map((act) => (
          <ActDefinitionCard
            key={act.id}
            act={act}
            isSelected={activeActId === act.id}
            canUpdate={canUpdate}
            onSelect={() => setSelectedActId(act.id)}
            onSetDefault={() => handleSetDefault(act.id)}
            isSettingDefault={setDefaultMutation.isPending}
          />
        ))}
      </div>

      {/* Act Configuration Tabs */}
      {activeActId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {actConfig?.act?.name ?? 'Loading...'} - Configuration
            </CardTitle>
            <CardDescription>
              Fee schedules, tolerance settings, and demerit point schedules for this legal framework.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {configLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : actConfig ? (
              <Tabs defaultValue="fee-schedules">
                <TabsList className="mb-4 flex w-full flex-wrap gap-1">
                  <TabsTrigger value="fee-schedules" className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" />
                    GVW/Axle Fees ({actConfig.feeSchedules.length})
                  </TabsTrigger>
                  <TabsTrigger value="axle-type-fees" className="flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5" />
                    Axle Type Fees ({actConfig.axleTypeFeeSchedules.length})
                  </TabsTrigger>
                  <TabsTrigger value="tolerances" className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Tolerances ({actConfig.toleranceSettings.length})
                  </TabsTrigger>
                  <TabsTrigger value="demerit-points" className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Demerit Points ({actConfig.demeritPointSchedules.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="fee-schedules">
                  <FeeScheduleTable schedules={actConfig.feeSchedules} />
                </TabsContent>
                <TabsContent value="axle-type-fees">
                  <AxleTypeFeeTable schedules={actConfig.axleTypeFeeSchedules} />
                </TabsContent>
                <TabsContent value="tolerances">
                  <ToleranceTable tolerances={actConfig.toleranceSettings} />
                </TabsContent>
                <TabsContent value="demerit-points">
                  <DemeritPointTable schedules={actConfig.demeritPointSchedules} />
                </TabsContent>
              </Tabs>
            ) : (
              <p className="text-sm text-muted-foreground">No configuration data available.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Act Definition Card
// ============================================================================

interface ActDefinitionCardProps {
  act: ActDefinitionDto;
  isSelected: boolean;
  canUpdate: boolean;
  onSelect: () => void;
  onSetDefault: () => void;
  isSettingDefault: boolean;
}

function ActDefinitionCard({
  act,
  isSelected,
  canUpdate,
  onSelect,
  onSetDefault,
  isSettingDefault,
}: ActDefinitionCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">{act.name}</CardTitle>
            <CardDescription className="mt-1 text-xs">{act.fullName}</CardDescription>
          </div>
          <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
            {act.isDefault && (
              <Badge variant="default" className="gap-1">
                <Star className="h-3 w-3" /> Default
              </Badge>
            )}
            <Badge variant={act.actType === 'EAC' ? 'secondary' : 'outline'}>
              {act.actType === 'EAC' ? 'EAC Regional' : 'National'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Code:</span>{' '}
            <span className="font-mono font-medium">{act.code}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Currency:</span>{' '}
            <Badge variant="outline" className="ml-1">
              {act.chargingCurrency}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Effective:</span>{' '}
            <span>{act.effectiveDate ? new Date(act.effectiveDate).getFullYear() : '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>{' '}
            <Badge variant={act.isActive ? 'default' : 'destructive'} className="ml-1">
              {act.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
        {act.description && (
          <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{act.description}</p>
        )}
        {canUpdate && !act.isDefault && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={(e) => {
              e.stopPropagation();
              onSetDefault();
            }}
            disabled={isSettingDefault}
          >
            <Star className="mr-1.5 h-3.5 w-3.5" />
            Set as Default
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Fee Schedule Table
// ============================================================================

function FeeScheduleTable({ schedules }: { schedules: AxleFeeScheduleDto[] }) {
  if (schedules.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No fee schedules configured.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Overload Range (kg)</TableHead>
            <TableHead className="text-right">Fee/kg (USD)</TableHead>
            <TableHead className="text-right">Flat Fee (USD)</TableHead>
            <TableHead className="text-right">Demerit Pts</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <Badge variant="outline">{s.feeType}</Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {s.overloadMinKg.toLocaleString()} - {s.overloadMaxKg ? s.overloadMaxKg.toLocaleString() : '∞'}
              </TableCell>
              <TableCell className="text-right font-mono">{s.feePerKgUsd.toFixed(2)}</TableCell>
              <TableCell className="text-right font-mono">{s.flatFeeUsd.toFixed(2)}</TableCell>
              <TableCell className="text-right">
                <Badge variant={s.demeritPoints > 3 ? 'destructive' : 'secondary'}>{s.demeritPoints}</Badge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                {s.penaltyDescription}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================================
// Axle Type Fee Table
// ============================================================================

function AxleTypeFeeTable({ schedules }: { schedules: AxleTypeOverloadFeeScheduleDto[] }) {
  if (schedules.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No axle type fee schedules configured.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Overload Range (kg)</TableHead>
            <TableHead className="text-right">Steering (USD)</TableHead>
            <TableHead className="text-right">Single Drive (USD)</TableHead>
            <TableHead className="text-right">Tandem (USD)</TableHead>
            <TableHead className="text-right">Tridem (USD)</TableHead>
            <TableHead className="text-right">Quad (USD)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-mono text-sm">
                {s.overloadMinKg.toLocaleString()} - {s.overloadMaxKg ? s.overloadMaxKg.toLocaleString() : '∞'}
              </TableCell>
              <TableCell className="text-right font-mono">{s.steeringAxleFeeUsd.toFixed(2)}</TableCell>
              <TableCell className="text-right font-mono">{s.singleDriveAxleFeeUsd.toFixed(2)}</TableCell>
              <TableCell className="text-right font-mono">{s.tandemAxleFeeUsd.toFixed(2)}</TableCell>
              <TableCell className="text-right font-mono">{s.tridemAxleFeeUsd.toFixed(2)}</TableCell>
              <TableCell className="text-right font-mono">{s.quadAxleFeeUsd.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================================
// Tolerance Table
// ============================================================================

function ToleranceTable({ tolerances }: { tolerances: ToleranceSettingDto[] }) {
  if (tolerances.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No tolerance settings configured.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Applies To</TableHead>
            <TableHead className="text-right">Tolerance %</TableHead>
            <TableHead className="text-right">Tolerance (kg)</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tolerances.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-mono text-xs">{t.code}</TableCell>
              <TableCell className="font-medium">{t.name}</TableCell>
              <TableCell>
                <Badge variant="outline">{t.appliesTo}</Badge>
              </TableCell>
              <TableCell className="text-right font-mono">{t.tolerancePercentage}%</TableCell>
              <TableCell className="text-right font-mono">
                {t.toleranceKg != null ? t.toleranceKg.toLocaleString() : '-'}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                {t.description ?? '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================================
// Demerit Point Table
// ============================================================================

function DemeritPointTable({ schedules }: { schedules: DemeritPointScheduleDto[] }) {
  if (schedules.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No demerit point schedules configured.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Violation Type</TableHead>
            <TableHead>Overload Range (kg)</TableHead>
            <TableHead className="text-right">Points</TableHead>
            <TableHead>Framework</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <Badge variant="outline">{s.violationType}</Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {s.overloadMinKg.toLocaleString()} - {s.overloadMaxKg ? s.overloadMaxKg.toLocaleString() : '∞'}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={s.points >= 5 ? 'destructive' : s.points >= 3 ? 'secondary' : 'outline'}>
                  {s.points}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{s.legalFramework}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
