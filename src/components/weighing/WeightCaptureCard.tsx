"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Scale } from 'lucide-react';

interface WeightCaptureCardProps {
  currentWeight: number;
  currentAxle: number;
  totalAxles: number;
  capturedAxles: number[];
  capturedWeights: number[];
  onCaptureAxle: () => void;
  scaleAStatus?: 'connected' | 'disconnected';
  scaleBStatus?: 'connected' | 'disconnected';
  weighingMode?: 'static' | 'dynamic';
  className?: string;
}

/**
 * WeightCaptureCard - Displays current weight and capture controls for mobile weighing
 *
 * Shows:
 * - Large digital weight display (yellow on black)
 * - Scale status indicators (A and B)
 * - Capture/Assign Axle button
 * - Weighing mode indicator (Static/Dynamic)
 */
export function WeightCaptureCard({
  currentWeight,
  currentAxle,
  totalAxles,
  capturedAxles,
  capturedWeights,
  onCaptureAxle,
  scaleAStatus = 'connected',
  scaleBStatus = 'connected',
  weighingMode = 'static',
  className,
}: WeightCaptureCardProps) {
  const allAxlesCaptured = capturedAxles.length === totalAxles;
  const isCurrentAxleCaptured = capturedAxles.includes(currentAxle);

  return (
    <Card className={cn('border-gray-200', className)}>
      <CardHeader className="py-3 px-4 bg-gray-900 border-b">
        <CardTitle className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
          <Scale className="h-4 w-4" />
          Axle Weight: [KG]
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 bg-gray-900">
        {/* Digital Weight Display */}
        <div className="bg-black rounded-lg p-6 mb-4">
          <div className="font-mono text-5xl md:text-6xl font-bold text-yellow-400 text-center tracking-wider">
            {currentWeight.toLocaleString()}
          </div>
        </div>

        {/* Scale Status Indicators */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-3 h-3 rounded-full',
                scaleAStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
              )}
            />
            <span className="text-xs text-gray-400">Scale A</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-3 h-3 rounded-full',
                scaleBStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
              )}
            />
            <span className="text-xs text-gray-400">Scale B</span>
          </div>
        </div>

        {/* Capture Button */}
        <div className="flex items-center justify-between gap-3">
          <div className="bg-black text-yellow-400 px-4 py-2 rounded font-mono text-xl font-bold">
            {currentWeight.toLocaleString()} [KG]
          </div>
          <Button
            onClick={onCaptureAxle}
            disabled={isCurrentAxleCaptured || allAxlesCaptured}
            className={cn(
              'font-bold px-6',
              isCurrentAxleCaptured || allAxlesCaptured
                ? 'bg-gray-500'
                : 'bg-green-600 hover:bg-green-700'
            )}
          >
            {allAxlesCaptured
              ? 'ALL CAPTURED'
              : isCurrentAxleCaptured
                ? `AXLE ${currentAxle} DONE`
                : `ASSIGN AXLE(${currentAxle})`}
          </Button>
          <div className="text-xs text-gray-400">
            {weighingMode === 'static' ? 'Static Weighing' : 'Dynamic Weighing'}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-4 pt-3 border-t border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Capture Progress</span>
            <span>{capturedAxles.length} / {totalAxles} axles</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: totalAxles }, (_, i) => i + 1).map((axleNum) => (
              <div
                key={axleNum}
                className={cn(
                  'flex-1 h-2 rounded-full transition-all',
                  capturedAxles.includes(axleNum)
                    ? 'bg-green-500'
                    : axleNum === currentAxle
                      ? 'bg-yellow-500'
                      : 'bg-gray-700'
                )}
              />
            ))}
          </div>
        </div>

        {/* Captured weights summary */}
        {capturedWeights.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-400 mb-2">Captured Weights:</div>
            <div className="flex flex-wrap gap-2">
              {capturedAxles.map((axleNum, idx) => (
                <div
                  key={axleNum}
                  className="bg-gray-800 text-green-400 px-2 py-1 rounded text-xs font-mono"
                >
                  A{axleNum}: {capturedWeights[idx]?.toLocaleString() || 0} kg
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WeightCaptureCard;
