'use client';

import { Card } from '@/components/ui/card';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AxleWeightReferenceForm } from '../forms/axle-config/AxleWeightReferenceForm';
import { AxleWeightReferenceTable } from './AxleWeightReferenceTable';

import type {
  AxleConfigurationLookupData,
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
  const [weightReferences, setWeightReferences] = useState<AxleWeightReferenceResponse[]>([]);
  const [lookupData, setLookupData] = useState<AxleConfigurationLookupData | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load existing weight references and lookup data
  useEffect(() => {
    loadWeightReferences();
    loadLookupData();
  }, [configurationId]);

  const loadWeightReferences = useCallback(async () => {
    try {
      const { fetchAxleWeightReferencesByConfiguration } = await import('@/lib/api/setup');
      const references = await fetchAxleWeightReferencesByConfiguration(configurationId);
      setWeightReferences(references);
      onWeightReferencesChange?.(references);
    } catch (error) {
      console.error('Failed to load weight references:', error);
      toast.error('Failed to load weight references');
    }
  }, [configurationId, onWeightReferencesChange]);

  const loadLookupData = useCallback(async () => {
    try {
      const { fetchAxleConfigurationLookupData } = await import('@/lib/api/setup');
      const data = await fetchAxleConfigurationLookupData(configurationId);
      setLookupData(data);
    } catch (error) {
      console.error('Failed to load lookup data:', error);
      toast.error('Failed to load lookup data');
    }
  }, [configurationId]);

  const onSubmit = async (data: WeightReferenceFormData) => {
    if (!data.axleGroupId) {
      toast.error('Axle Group is required');
      return;
    }

    setIsLoading(true);
    try {
      const { createAxleWeightReference, updateAxleWeightReference } = await import('@/lib/api/setup');

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
        await updateAxleWeightReference(editingId, updatePayload);
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
        await createAxleWeightReference(createPayload);
        toast.success('Weight reference created');
      }

      await loadWeightReferences();
      resetForm();
    } catch (error) {
      console.error('Failed to create/update weight reference:', error);
      toast.error(editingId ? 'Failed to update weight reference' : 'Failed to create weight reference');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
  };

  const startEdit = (reference: AxleWeightReferenceResponse) => {
    setEditingId(reference.id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this weight reference?')) return;

    try {
      const { deleteAxleWeightReference } = await import('@/lib/api/setup');
      await deleteAxleWeightReference(id);
      toast.success('Weight reference deleted');
      await loadWeightReferences();
    } catch (error) {
      console.error('Failed to delete weight reference:', error);
      toast.error('Failed to delete weight reference');
    }
  };

  const getAvailablePositions = () => {
    const usedPositions = weightReferences.map(r => r.axlePosition);
    return Array.from({ length: axleNumber }, (_, i) => i + 1).filter(pos => !usedPositions.includes(pos) || editingId);
  };

  const getEditingReference = () => {
    return weightReferences.find(ref => ref.id === editingId) || null;
  };

  if (!lookupData) {
    return <div className="text-center py-4">Loading lookup data...</div>;
  }

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
    </Card>
  );
}