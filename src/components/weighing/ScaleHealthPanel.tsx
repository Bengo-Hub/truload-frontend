"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { ScaleStatus } from '@/types/weighing';
import { Battery, Signal, Thermometer, Scale, Clock, AlertCircle, Wifi, WifiOff } from 'lucide-react';

export interface ScaleInfo {
  id: string;
  name: string;
  status: ScaleStatus;
  weight: number;
  temperature?: number;
  battery?: number;
  signalStrength?: number; // 0-100 for wireless scales
  capacity?: number; // Max weight capacity in kg
  lastReading?: Date;
  isActive: boolean;
  /** Indicator/Scale manufacturer (e.g., "Zedem", "Avery Weigh-Tronix", "Rice Lake") */
  make?: string;
  /** Indicator/Scale model (e.g., "ZM-400", "E1205") */
  model?: string;
  /** Sync type for weight data transfer (TCP, Serial, WebSocket, API) */
  syncType?: 'TCP' | 'Serial' | 'WebSocket' | 'API' | string;
}

interface ScaleHealthPanelProps {
  scales: ScaleInfo[];
  isConnected: boolean;
  onConnect: () => void;
  onToggleScale: (scaleId: string, active: boolean) => void;
  onChangeWeighingType?: () => void;
  weighingType?: 'mobile' | 'multideck';
  /**
   * Mode for display:
   * - 'scale': Shows "Scale Health" (for mobile scales via API/RF)
   * - 'indicator': Shows "Indicator Health" (for multideck via TCP/Serial/WebSocket)
   */
  displayMode?: 'scale' | 'indicator';
  /**
   * Connection type label (e.g., "TCP", "WebSocket", "API", "RF")
   */
  connectionType?: string;
  className?: string;
  /** Compact mode for inline display - shows only connection status */
  compact?: boolean;
  /** Show detailed scale cards (default: true in non-compact mode) */
  showDetailedCards?: boolean;
  /** Ultra-compact horizontal status bar showing make, sync, count, battery, temp, signal */
  ultraCompact?: boolean;
  /** Middleware sync status - shows sync bubble indicator */
  middlewareSynced?: boolean;
  /** Simulation mode active - shows "SIMULATED" badge instead of make/model */
  simulation?: boolean;
}

/**
 * ScaleHealthPanel - Compact scale/indicator connection status card
 *
 * For Mobile Weighing (displayMode='scale'):
 * - Shows scale health for portable scales
 * - Scales connect via API or RF signal
 *
 * For Multideck Weighing (displayMode='indicator'):
 * - Shows weight indicator health
 * - Indicator connects via TruConnect using TCP/Serial or WebSocket
 *
 * Redesigned for modern, compact appearance with:
 * - Icon, connection status, and action button in single row
 * - Optional detailed scale cards below
 */
export function ScaleHealthPanel({
  scales,
  isConnected,
  onConnect,
  onToggleScale,
  onChangeWeighingType,
  weighingType = 'mobile',
  displayMode = 'scale',
  connectionType,
  className,
  compact = false,
  showDetailedCards,
  ultraCompact = false,
  middlewareSynced = true,
  simulation = false,
}: ScaleHealthPanelProps) {
  // Derive display labels based on mode
  const isIndicatorMode = displayMode === 'indicator';
  const devicesLabel = isIndicatorMode ? 'Indicators' : 'Scales';

  // Show detailed cards by default in non-compact mode, unless explicitly set
  const shouldShowDetailedCards = showDetailedCards ?? (!compact && !ultraCompact);

  // Count connected scales
  const connectedCount = scales.filter(s => s.status === 'connected').length;
  const activeCount = scales.filter(s => s.isActive).length;
  const totalCount = scales.length;

  // Get primary indicator info (first one) for ultra-compact display
  const primaryIndicator = scales[0];

  // Ultra-compact horizontal status bar
  if (ultraCompact) {
    // For indicators (mains-powered): show connection quality and last reading time
    // For scales (battery-powered): show battery, signal, temperature
    const avgBattery = scales.length > 0
      ? Math.round(scales.reduce((sum, s) => sum + (s.battery ?? 0), 0) / scales.length)
      : 0;
    const avgSignal = scales.length > 0
      ? Math.round(scales.reduce((sum, s) => sum + (s.signalStrength ?? 100), 0) / scales.length)
      : 100;

    const getBatteryColor = (pct: number) => pct > 50 ? 'text-green-500' : pct > 20 ? 'text-yellow-500' : 'text-red-500';
    const getSignalColor = (pct: number) => pct > 70 ? 'text-green-500' : pct > 40 ? 'text-yellow-500' : 'text-red-500';

    // Format last reading time
    const formatLastReading = (date?: Date) => {
      if (!date) return 'N/A';
      const now = new Date();
      const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diff < 5) return 'Just now';
      if (diff < 60) return `${diff}s ago`;
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
      <Card className={cn(
        'shadow-sm border transition-colors',
        isConnected ? 'border-green-200 bg-gradient-to-r from-green-50/50 to-white' : 'border-red-200 bg-gradient-to-r from-red-50/50 to-white',
        className
      )}>
        <CardContent className="py-2.5 px-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Connection status + Make/Model */}
            <div className="flex items-center gap-3">
              {/* Sync status bubble */}
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  'w-2.5 h-2.5 rounded-full',
                  middlewareSynced && isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                )} />
                <span className={cn(
                  'text-[10px] font-medium uppercase tracking-wide',
                  middlewareSynced && isConnected ? 'text-green-600' : 'text-red-500'
                )}>
                  {middlewareSynced && isConnected ? 'Synced' : 'Offline'}
                </span>
              </div>

              {/* Make & Model (or Simulation badge) */}
              <div className="flex items-center gap-2">
                {simulation ? (
                  <>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 font-semibold text-xs rounded-md border border-amber-300 animate-pulse">
                      SIMULATED
                    </span>
                    <span className="text-gray-400 text-sm">|</span>
                    <span className="text-gray-600 text-sm">
                      {displayMode === 'indicator' ? 'Virtual Indicator' : 'Virtual Scale'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-gray-800 text-sm">
                      {primaryIndicator?.make || 'Unknown'} {primaryIndicator?.model || ''}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded font-medium',
                      isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    )}>
                      {primaryIndicator?.syncType || connectionType || 'TCP'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Center: Indicator/Scale count */}
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
              <Scale className="h-3.5 w-3.5 text-gray-600" />
              <span className="text-xs font-medium text-gray-700">
                {connectedCount}/{totalCount} {isIndicatorMode ? 'indicator' : 'scale'}{totalCount !== 1 ? 's' : ''} active
              </span>
            </div>

            {/* Right: Status info - different for indicators vs scales */}
            <div className="flex items-center gap-4">
              {isIndicatorMode ? (
                // Indicator mode: show connection quality and last reading
                <>
                  {/* Connection quality */}
                  <div className="flex items-center gap-1" title={`Signal Quality: ${avgSignal}%`}>
                    <Signal className={cn('h-4 w-4', getSignalColor(avgSignal))} />
                    <span className="text-xs text-gray-600">{avgSignal}%</span>
                  </div>

                  {/* Last reading time */}
                  <div className="flex items-center gap-1 text-xs text-gray-500" title="Last data received">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatLastReading(primaryIndicator?.lastReading)}</span>
                  </div>

                  {/* Current weight display */}
                  {primaryIndicator?.weight !== undefined && (
                    <div
                      className="text-sm font-bold tracking-wider bg-gray-900 px-3 py-1 rounded-md border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)]"
                      style={{ fontFamily: 'var(--font-orbitron), monospace', color: '#f59e0b' }}
                    >
                      {primaryIndicator.weight.toLocaleString()} kg
                    </div>
                  )}
                </>
              ) : (
                // Scale mode: show battery, signal, temperature
                <>
                  {/* Battery */}
                  <div className="flex items-center gap-1" title={`Battery: ${avgBattery}%`}>
                    <Battery className={cn('h-4 w-4', getBatteryColor(avgBattery))} />
                    <span className="text-xs text-gray-600">{avgBattery}%</span>
                  </div>

                  {/* Signal */}
                  <div className="flex items-center gap-1" title={`Signal: ${avgSignal}%`}>
                    <Signal className={cn('h-4 w-4', getSignalColor(avgSignal))} />
                    <span className="text-xs text-gray-600">{avgSignal}%</span>
                  </div>
                </>
              )}

              {/* Switch button */}
              {onChangeWeighingType && (
                <Button
                  onClick={onChangeWeighingType}
                  size="sm"
                  variant="ghost"
                  className="text-xs text-gray-500 hover:text-gray-700 h-7 px-2"
                >
                  Switch
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Compact Connection Status Card */}
      <Card className={cn(
        'shadow-sm transition-colors',
        isConnected ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'
      )}>
        <CardContent className={cn('flex items-center justify-between', compact ? 'p-3' : 'p-4')}>
          <div className="flex items-center gap-3">
            {/* Status Icon */}
            <div className={cn(
              'flex items-center justify-center rounded-lg',
              compact ? 'w-10 h-10' : 'w-12 h-12',
              isConnected ? 'bg-green-100' : 'bg-red-100'
            )}>
              {isConnected ? (
                <Wifi className={cn('text-green-600', compact ? 'h-5 w-5' : 'h-6 w-6')} />
              ) : (
                <WifiOff className={cn('text-red-500', compact ? 'h-5 w-5' : 'h-6 w-6')} />
              )}
            </div>

            {/* Status Text */}
            <div>
              <div className="flex items-center gap-2">
                <p className={cn(
                  'font-semibold text-gray-800',
                  compact ? 'text-sm' : 'text-base'
                )}>
                  {weighingType === 'mobile' ? 'Mobile Weighing' : 'Multideck Weighing'}
                </p>
                {/* Sync bubble */}
                <span className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                  middlewareSynced && isConnected
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-600'
                )}>
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    middlewareSynced && isConnected ? 'bg-green-500' : 'bg-red-500'
                  )} />
                  {middlewareSynced && isConnected ? 'Synced' : 'Offline'}
                </span>
              </div>
              <p className={cn(isConnected ? 'text-gray-500' : 'text-red-500', compact ? 'text-xs' : 'text-sm')}>
                {isConnected
                  ? `${connectedCount}/${totalCount} ${devicesLabel.toLowerCase()} active`
                  : 'Not connected'}
              </p>
            </div>
          </div>

          {/* Action Button */}
          {onChangeWeighingType && (
            <Button
              onClick={onChangeWeighingType}
              size={compact ? 'sm' : 'default'}
              variant="outline"
              className={cn(
                'border-gray-300 text-gray-600 hover:bg-gray-100',
                compact ? 'text-xs' : 'text-sm'
              )}
            >
              Switch to {weighingType === 'mobile' ? 'Multideck' : 'Mobile'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Detailed Scale Cards (optional) */}
      {shouldShowDetailedCards && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {scales.map((scale) => (
            <ScaleCard
              key={scale.id}
              scale={scale}
              onToggle={(active) => onToggleScale(scale.id, active)}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ScaleCardProps {
  scale: ScaleInfo;
  onToggle: (active: boolean) => void;
  compact?: boolean;
}

function ScaleCard({ scale, onToggle, compact = false }: ScaleCardProps) {
  const batteryPercent = scale.battery ?? 0;
  const batteryColor = batteryPercent > 50
    ? 'bg-green-500'
    : batteryPercent > 20
      ? 'bg-yellow-500'
      : 'bg-red-500';

  const signalStrength = scale.signalStrength ?? 0;
  const signalColor = signalStrength > 70
    ? 'text-green-500'
    : signalStrength > 40
      ? 'text-yellow-500'
      : 'text-red-500';

  const getStatusColor = (status: ScaleStatus) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-700';
      case 'disconnected':
        return 'bg-red-100 text-red-600 font-semibold';
      case 'error':
        return 'bg-red-100 text-red-600 font-semibold';
      case 'calibrating':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-red-100 text-red-600';
    }
  };

  const formatWeight = (weight: number) => {
    return weight.toLocaleString() + ' kg';
  };

  // Compact card variant
  if (compact) {
    return (
      <Card className={cn(
        'border rounded-lg transition-colors',
        scale.isActive && scale.status === 'connected'
          ? 'border-green-200 bg-green-50/30'
          : 'border-red-200 bg-red-50/30'
      )}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className={cn(
                'h-4 w-4',
                scale.status === 'connected' ? 'text-green-600' : 'text-red-500'
              )} />
              <span className="font-medium text-sm text-gray-800">{scale.name}</span>
              <span className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
                getStatusColor(scale.status)
              )}>
                {scale.status === 'error' && <AlertCircle className="h-2.5 w-2.5 mr-0.5" />}
                {scale.status.charAt(0).toUpperCase() + scale.status.slice(1)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Battery mini indicator */}
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Battery className="h-3 w-3" />
                <span>{batteryPercent}%</span>
              </div>
              <Switch
                checked={scale.isActive}
                onCheckedChange={onToggle}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full card variant (existing design)
  const formatTime = (date?: Date) => {
    if (!date) return 'N/A';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Card className={cn(
      'border-2 rounded-lg',
      scale.isActive ? 'border-green-500' : 'border-gray-200'
    )}>
      <CardContent className="p-4">
        {/* Header with name and toggle */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{scale.name}</h3>
            <span className={cn(
              'inline-block px-2 py-0.5 rounded text-xs font-medium',
              scale.isActive
                ? 'bg-gray-900 text-white'
                : 'bg-gray-200 text-gray-600'
            )}>
              {scale.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <Switch
            checked={scale.isActive}
            onCheckedChange={onToggle}
          />
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
            getStatusColor(scale.status)
          )}>
            {scale.status === 'error' && <AlertCircle className="h-3 w-3" />}
            {scale.status.charAt(0).toUpperCase() + scale.status.slice(1)}
          </span>
          {scale.capacity && (
            <span className="text-xs text-gray-500">
              Capacity: {formatWeight(scale.capacity)}
            </span>
          )}
        </div>

        {/* Current Weight Reading */}
        <div className="flex items-center gap-3 mb-3 p-3 bg-gray-900 rounded-lg border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.1)]">
          <Scale className="h-5 w-5 text-amber-400" />
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Current Reading</p>
            <p
              className="text-2xl font-bold tracking-wider tabular-nums"
              style={{ fontFamily: 'var(--font-orbitron), monospace', color: '#f59e0b', textShadow: '0 0 10px rgba(245,158,11,0.4)' }}
            >
              {formatWeight(scale.weight)}
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Battery indicator */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Battery className="h-3.5 w-3.5" />
              <span>Battery: {batteryPercent}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', batteryColor)}
                style={{ width: `${batteryPercent}%` }}
              />
            </div>
          </div>

          {/* Signal Strength (for wireless scales) */}
          {scale.signalStrength !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Signal className={cn("h-3.5 w-3.5", signalColor)} />
                <span>Signal: {signalStrength}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', signalColor.replace('text-', 'bg-'))}
                  style={{ width: `${signalStrength}%` }}
                />
              </div>
            </div>
          )}

          {/* Temperature */}
          {scale.temperature !== undefined && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Thermometer className="h-3.5 w-3.5 text-orange-500" />
              <span>{scale.temperature}°C</span>
            </div>
          )}

          {/* Last Reading Time */}
          {scale.lastReading && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Clock className="h-3.5 w-3.5 text-gray-500" />
              <span>{formatTime(scale.lastReading)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ScaleHealthPanel;
