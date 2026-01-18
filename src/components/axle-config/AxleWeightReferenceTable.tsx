'use client';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import type { AxleWeightReferenceResponse } from '@/types/setup';

interface AxleWeightReferenceTableProps {
  weightReferences: AxleWeightReferenceResponse[];
  onEdit: (reference: AxleWeightReferenceResponse) => void;
  onDelete: (id: string) => void;
}

export function AxleWeightReferenceTable({
  weightReferences,
  onEdit,
  onDelete,
}: AxleWeightReferenceTableProps) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Position</TableHead>
            <TableHead>Grouping</TableHead>
            <TableHead>Axle Group</TableHead>
            <TableHead>Tyre Type</TableHead>
            <TableHead>Weight (kg)</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {weightReferences.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                No weight references defined yet
              </TableCell>
            </TableRow>
          ) : (
            weightReferences.map((ref) => (
              <TableRow key={ref.id}>
                <TableCell>Position {ref.axlePosition}</TableCell>
                <TableCell>{ref.axleGrouping}</TableCell>
                <TableCell>{ref.axleGroupCode} - {ref.axleGroupName}</TableCell>
                <TableCell>{ref.tyreTypeCode ? `${ref.tyreTypeCode} - ${ref.tyreTypeName}` : '-'}</TableCell>
                <TableCell>{ref.axleLegalWeightKg}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(ref)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    onClick={() => onDelete(ref.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}