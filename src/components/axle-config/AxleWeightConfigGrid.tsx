'use client';

import { Card } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AxleWeightReferenceForm } from '../forms/axle-config/AxleWeightReferenceForm';
import { AxleWeightReferenceTable } from './AxleWeightReferenceTable';
import {
  useAxleWeightReferences,
  useAxleConfigLookupData,
  useCreateAxleWeightReference,
  useUpdateAxleWeightReference,
  useDeleteAxleWeightReference,
} from '@/hooks/queries';

import type {
  AxleWeightReferenceResponse,
  CreateAxleWeightReferenceRequest,
  UpdateAxleWeightReferenceRequest,
} from '@/types/setup';

interface AxleWeightConfigGridProps {
  configurationId: string;
  axleNumber: number;
  gvwPermissibleKg: number;
  onWeightReferencesChange?: (references: AxleWeightReferenceResponse[]) => void;
}

interface WeightReferenceFormData {
  axlePosition: number;
  axleLegalWeightKg: number;
  axleGrouping: 'A' | 'B' | 'C' | 'D';
  axleGroupId: string;
  tyreTypeId?: string;
}

export function AxleWeightConfigGrid({
  configurationId,
  axleNumber,
  gvwPermissibleKg,
  onWeightReferencesChange,
}: AxleWeightConfigGridProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  // TanStack Query hooks
  const {
    data: weightReferences = [],
    isLoading: isLoadingReferences,
  } = useAxleWeightReferences(configurationId);

  const {
    data: lookupData,
    isLoading: isLoadingLookup,
  } = useAxleConfigLookupData(configurationId);

  // Mutations
  const createMutation = useCreateAxleWeightReference();
  const updateMutation = useUpdateAxleWeightReference();
  const deleteMutation = useDeleteAxleWeightReference();

  // Notify parent when weight references change
  useEffect(() => {
    if (weightReferences.length > 0) {
      onWeightReferencesChange?.(weightReferences);
    }
  }, [weightReferences, onWeightReferencesChange]);

  const onSubmit = async (data: WeightReferenceFormData) => {
    if (!data.axleGroupId) {
      toast.error('Axle Group is required');
      return;
    }

    try {
      if (editingId) {
        // Update existing
        const updatePayload: UpdateAxleWeightReferenceRequest = {
          axlePosition: data.axlePosition,
          axleLegalWeightKg: data.axleLegalWeightKg,
          axleGrouping: data.axleGrouping,
          axleGroupId: data.axleGroupId,
          tyreTypeId: data.tyreTypeId,
          isActive: true,
        };
        await updateMutation.mutateAsync({ id: editingId, payload: updatePayload });
        toast.success('Weight reference updated');
      } else {
        // Create new
        const createPayload: CreateAxleWeightReferenceRequest = {
          axleConfigurationId: configurationId,
          axlePosition: data.axlePosition,
          axleLegalWeightKg: data.axleLegalWeightKg,
          axleGrouping: data.axleGrouping,
          axleGroupId: data.axleGroupId,
          tyreTypeId: data.tyreTypeId,
        };
        await createMutation.mutateAsync(createPayload);
        toast.success('Weight reference created');
      }

      resetForm();
    } catch (error) {
      console.error('Failed to create/update weight reference:', error);
      toast.error(editingId ? 'Failed to update weight reference' : 'Failed to create weight reference');
    }
  };

  const resetForm = () => {
    setEditingId(null);
  };

  const startEdit = (reference: AxleWeightReferenceResponse) => {
    setEditingId(reference.id);
  };

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      toast.success('Weight reference deleted');
    } catch (error) {
      console.error('Failed to delete weight reference:', error);
      toast.error('Failed to delete weight reference');
    }
    setDeleteTarget(null);
  };

  const getAvailablePositions = () => {
    const usedPositions = weightReferences.map(r => r.axlePosition);
    return Array.from({ length: axleNumber }, (_, i) => i + 1).filter(pos => !usedPositions.includes(pos) || editingId);
  };

  const getEditingReference = () => {
    return weightReferences.find(ref => ref.id === editingId) || null;
  };

  // Loading state
  if (isLoadingLookup || !lookupData) {
    return <div className="text-center py-4">Loading lookup data...</div>;
  }

  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Weight References</h3>
            <p className="text-sm text-gray-600">
              Define permissible weights for each axle position
            </p>
          </div>
          <div className="text-sm text-gray-600">
            GVW Limit: <span className="font-semibold">{gvwPermissibleKg} kg</span>
          </div>
        </div>

        {/* Add/Edit Form */}
        <AxleWeightReferenceForm
          lookupData={lookupData}
          axleNumber={axleNumber}
          gvwPermissibleKg={gvwPermissibleKg}
          editingReference={getEditingReference()}
          availablePositions={getAvailablePositions()}
          onSubmit={onSubmit}
          onCancel={resetForm}
          isLoading={isLoading}
        />

        {/* Weight References Table */}
        <AxleWeightReferenceTable
          weightReferences={weightReferences}
          onEdit={startEdit}
          onDelete={handleDelete}
        />
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Weight Reference</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this weight reference? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
