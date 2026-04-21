'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getCurrentOrganization, updateCurrentCommercialSettings } from '@/lib/api/setup';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Info, Loader2, Save, Scale, CreditCard, Clock } from 'lucide-react';

interface CommercialSettingsTabProps {
  canEdit: boolean;
}

export function CommercialSettingsTab({ canEdit }: CommercialSettingsTabProps) {
  const queryClient = useQueryClient();
  const { data: org, isLoading } = useQuery({
    queryKey: ['organization', 'current'],
    queryFn: getCurrentOrganization,
  });

  const [feeKes, setFeeKes] = useState<string>('');
  const [tareExpiryDays, setTareExpiryDays] = useState<string>('');

  useEffect(() => {
    if (org) {
      setFeeKes(org.commercialWeighingFeeKes != null ? String(org.commercialWeighingFeeKes) : '');
      setTareExpiryDays(org.defaultTareExpiryDays != null ? String(org.defaultTareExpiryDays) : '');
    }
  }, [org]);

  const hasChanges =
    org != null &&
    (String(org.commercialWeighingFeeKes ?? '') !== feeKes ||
      String(org.defaultTareExpiryDays ?? '') !== tareExpiryDays);

  const updateMutation = useMutation({
    mutationFn: updateCurrentCommercialSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'current'] });
      toast.success('Commercial settings saved');
    },
    onError: () => toast.error('Failed to save commercial settings'),
  });

  const handleSave = () => {
    const feeValue = feeKes !== '' ? parseFloat(feeKes) : null;
    const expiryValue = tareExpiryDays !== '' ? parseInt(tareExpiryDays, 10) : null;

    if (feeValue !== null && (isNaN(feeValue) || feeValue < 0)) {
      toast.error('Weighing fee must be a non-negative number');
      return;
    }
    if (expiryValue !== null && (isNaN(expiryValue) || expiryValue < 0)) {
      toast.error('Tare expiry days must be a non-negative integer');
      return;
    }

    updateMutation.mutate({
      commercialWeighingFeeKes: feeValue,
      defaultTareExpiryDays: expiryValue,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const paymentGateway = org?.paymentGateway;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
        <Scale className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Commercial Weighing Configuration</p>
          <p>
            Configure billing and tare expiry settings for this commercial weighing station.
            Changes apply org-wide and affect all weighing sessions.
          </p>
        </div>
      </div>

      <Card className="p-6 space-y-6">
        {/* Weighing Fee */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="weighing-fee">Weighing fee (KES per session)</Label>
          </div>
          <Input
            id="weighing-fee"
            type="number"
            min="0"
            step="50"
            value={feeKes}
            onChange={(e) => setFeeKes(e.target.value)}
            disabled={!canEdit}
            placeholder="e.g. 500"
            className="max-w-[240px]"
          />
          <p className="text-xs text-muted-foreground">
            Flat fee charged per commercial weighing session. Set to 0 for no fee.
            Currently: <span className="font-medium">KES {org?.commercialWeighingFeeKes?.toLocaleString() ?? '—'}</span>
          </p>
        </div>

        {/* Tare Expiry */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="tare-expiry">Default tare expiry (days)</Label>
          </div>
          <Input
            id="tare-expiry"
            type="number"
            min="0"
            step="1"
            value={tareExpiryDays}
            onChange={(e) => setTareExpiryDays(e.target.value)}
            disabled={!canEdit}
            placeholder="e.g. 90"
            className="max-w-[240px]"
          />
          <p className="text-xs text-muted-foreground">
            Org-wide tare validity period. Vehicles without a custom expiry inherit this value.
            Set to 0 to never expire. Currently:{' '}
            <span className="font-medium">
              {org?.defaultTareExpiryDays != null ? `${org.defaultTareExpiryDays} days` : 'Not set (no expiry)'}
            </span>
          </p>
        </div>

        {/* Payment Gateway (read-only) */}
        {paymentGateway && (
          <div className="space-y-2">
            <Label>Payment gateway</Label>
            <div>
              <Badge variant="secondary" className="capitalize">{paymentGateway}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Payment gateway is configured at the platform level. Contact support to change.
            </p>
          </div>
        )}

        <div className="pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!canEdit || !hasChanges || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save changes
          </Button>
        </div>
      </Card>

      <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 p-4">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Tare weight expiry</p>
          <p className="text-xs leading-relaxed">
            When a vehicle&apos;s stored tare was measured more than the configured number of days ago,
            operators will be warned that the tare may be stale. Individual vehicles can override this
            value from the Tare Register if they require a different expiry period.
          </p>
        </div>
      </div>
    </div>
  );
}
