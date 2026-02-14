'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useHasPermission } from '@/hooks/useAuth';
import {
  useCurrentExchangeRate,
  useRateHistory,
  useExchangeRateApiSettings,
  useSetManualRate,
  useFetchRatesNow,
} from '@/hooks/queries/useExchangeRateQueries';
import { ArrowRightLeft, Clock, DollarSign, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function ExchangeRateSettings() {
  const canUpdate = useHasPermission(['config.update']);
  const { data: currentRate, isLoading: rateLoading } = useCurrentExchangeRate();
  const { data: history, isLoading: historyLoading } = useRateHistory();
  const { data: apiSettings } = useExchangeRateApiSettings();
  const setManualMutation = useSetManualRate();
  const fetchNowMutation = useFetchRatesNow();

  const [manualRate, setManualRate] = useState('');

  const handleSetManualRate = async () => {
    const rate = parseFloat(manualRate);
    if (isNaN(rate) || rate <= 0) {
      toast.error('Please enter a valid rate');
      return;
    }
    try {
      await setManualMutation.mutateAsync({ rate });
      toast.success(`Exchange rate set to ${rate}`);
      setManualRate('');
    } catch {
      toast.error('Failed to set exchange rate');
    }
  };

  const handleFetchNow = async () => {
    try {
      await fetchNowMutation.mutateAsync();
      toast.success('Exchange rates fetched successfully');
    } catch {
      toast.error('Failed to fetch exchange rates');
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Rate Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Current Exchange Rate
          </CardTitle>
          <CardDescription>USD to KES conversion rate used for fee calculations</CardDescription>
        </CardHeader>
        <CardContent>
          {rateLoading ? (
            <Skeleton className="h-16 w-48" />
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold">{currentRate?.rate.toFixed(2)}</span>
                  <span className="text-sm text-muted-foreground">
                    <ArrowRightLeft className="inline h-3.5 w-3.5 mr-1" />
                    1 USD = {currentRate?.rate.toFixed(2)} KES
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{currentRate?.source ?? 'default'}</Badge>
                  <span>Effective: {currentRate?.effectiveDate}</span>
                  {currentRate?.lastUpdated && (
                    <span>
                      <Clock className="inline h-3 w-3 mr-0.5" />
                      {new Date(currentRate.lastUpdated).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {canUpdate && (
                <div className="flex items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Set Manual Rate</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 130.50"
                      value={manualRate}
                      onChange={(e) => setManualRate(e.target.value)}
                      className="w-32"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSetManualRate}
                    disabled={setManualMutation.isPending || !manualRate}
                  >
                    Set Rate
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Settings Card */}
      {apiSettings && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">API Provider</CardTitle>
                <CardDescription>{apiSettings.providerName}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {apiSettings.lastFetchStatus && (
                  <Badge
                    variant={apiSettings.lastFetchStatus === 'success' ? 'default' : 'destructive'}
                  >
                    {apiSettings.lastFetchStatus}
                  </Badge>
                )}
                {canUpdate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFetchNow}
                    disabled={fetchNowMutation.isPending}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${fetchNowMutation.isPending ? 'animate-spin' : ''}`} />
                    Fetch Now
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <span className="text-muted-foreground">Endpoint:</span>
                <p className="truncate font-mono text-xs">{apiSettings.apiEndpoint}</p>
              </div>
              <div>
                <span className="text-muted-foreground">API Key:</span>
                <p>{apiSettings.hasAccessKey ? '********' : 'Not configured'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Schedule:</span>
                <p>Daily at {apiSettings.fetchTime} UTC</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={apiSettings.isActive ? 'default' : 'secondary'}>
                  {apiSettings.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            {apiSettings.lastFetchError && (
              <p className="mt-2 text-xs text-destructive">
                Last error: {apiSettings.lastFetchError}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rate History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rate History (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <Skeleton className="h-32" />
          ) : history && history.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Pair</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.slice(0, 15).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{r.effectiveDate}</TableCell>
                      <TableCell className="text-sm">
                        {r.fromCurrency}/{r.toCurrency}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {r.rate.toFixed(4)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {r.source}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No rate history available. Set a manual rate or configure API sync.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
