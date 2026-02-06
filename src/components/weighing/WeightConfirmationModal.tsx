"use client";

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AlertTriangle, Scale } from 'lucide-react';

interface AxleGroup {
  group: string;
  permissible: number;
  tolerance: number;
  actual: number;
  overload: number;
  result: 'Legal' | 'Overload';
}

interface WeightConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  vehiclePlate: string;
  axleType: string;
  axleGroups: AxleGroup[];
  gvw: {
    permissible: number;
    tolerance: number;
    actual: number;
    overload: number;
    result: 'Legal' | 'Overload';
  };
  isLoading?: boolean;
}

/**
 * WeightConfirmationModal - Confirmation modal with compliance summary
 *
 * Shows axle group weights and compliance status before taking final weight.
 * Per FRD: Displays permissible weights, tolerance, actual weights, overload,
 * and result for each axle group plus GVW summary.
 */
export function WeightConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  vehiclePlate,
  axleType,
  axleGroups,
  gvw,
  isLoading = false,
}: WeightConfirmationModalProps) {
  const hasOverload = axleGroups.some(g => g.result === 'Overload') || gvw.result === 'Overload';

  const formatWeight = (weight: number) => {
    return weight.toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] md:max-w-[800px] lg:max-w-[900px]">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-center mb-2">
            <div className={cn(
              "p-3 rounded-full",
              hasOverload ? "bg-amber-100" : "bg-blue-100"
            )}>
              {hasOverload ? (
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              ) : (
                <Scale className="h-8 w-8 text-blue-600" />
              )}
            </div>
          </div>
          <DialogTitle className="text-center text-lg">
            Are you sure you want to Take Vehicle Weight for{' '}
            <span className="font-bold text-primary">{vehiclePlate}</span>?
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 -mx-4 sm:-mx-6 px-4 sm:px-6 py-1">
          {/* Axle Type Display */}
          <div className="flex items-center justify-center gap-2 py-2 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Axle Type:</span>
            <span className="font-mono font-semibold text-gray-900">{axleType}</span>
          </div>

          {/* Compliance Summary Table */}
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[550px]">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-700">Group</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-700">Permissible</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-700">Tolerance</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-700">Actual</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-700">Overload</th>
                  <th className="px-4 py-2.5 text-center font-medium text-gray-700">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {axleGroups.map((group, index) => (
                  <tr key={index} className={group.result === 'Overload' ? 'bg-red-50' : ''}>
                    <td className="px-4 py-2.5 font-medium">{group.group}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatWeight(group.permissible)}</td>
                    <td className="px-4 py-2.5 text-right">{group.tolerance}%</td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium">{formatWeight(group.actual)}</td>
                    <td className={cn(
                      "px-4 py-2.5 text-right font-mono font-medium",
                      group.overload > 0 ? "text-red-600" : "text-gray-600"
                    )}>
                      {group.overload > 0 ? `+${formatWeight(group.overload)}` : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium",
                        group.result === 'Legal'
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      )}>
                        {group.result}
                      </span>
                    </td>
                  </tr>
                ))}
                {/* GVW Summary Row */}
                <tr className={cn(
                  "font-semibold",
                  gvw.result === 'Overload' ? 'bg-red-100' : 'bg-gray-50'
                )}>
                  <td className="px-4 py-2.5">GVW</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatWeight(gvw.permissible)}</td>
                  <td className="px-4 py-2.5 text-right">{gvw.tolerance}%</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatWeight(gvw.actual)}</td>
                  <td className={cn(
                    "px-4 py-2.5 text-right font-mono",
                    gvw.overload > 0 ? "text-red-600" : "text-gray-600"
                  )}>
                    {gvw.overload > 0 ? `+${formatWeight(gvw.overload)}` : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium",
                      gvw.result === 'Legal'
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    )}>
                      {gvw.result}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Overload Warning */}
          {hasOverload && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Vehicle is overloaded</p>
                <p className="text-amber-700">
                  This vehicle exceeds weight limits. Proceeding will record an overload violation.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 flex gap-3 sm:gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "flex-1",
              hasOverload
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-green-600 hover:bg-green-700"
            )}
          >
            {isLoading ? 'Processing...' : 'Yes, Take Weight!'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default WeightConfirmationModal;
