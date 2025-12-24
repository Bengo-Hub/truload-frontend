"use client";

import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';

export default function PermissionsTab() {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="text-sm text-gray-600 mb-3">
          Manage system permissions and map them to roles. Placeholder view — wire to backend permissions endpoints.
        </p>
        <div className="rounded-xl border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission Code</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(user?.permissions ?? []).length === 0 ? (
                <TableRow>
                  <TableCell className="text-gray-500">No permissions found for current user.</TableCell>
                </TableRow>
              ) : (
                user!.permissions!.map((perm) => (
                  <TableRow key={perm}>
                    <TableCell className="font-mono text-sm">{perm}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
