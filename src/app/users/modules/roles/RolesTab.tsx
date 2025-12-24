"use client";

import { fetchRoles } from '@/lib/api/setup';
import type { RoleDto } from '@/types/setup';
import { useQuery } from '@tanstack/react-query';

export default function RolesTab() {
  const { data: roles = [], isLoading } = useQuery<RoleDto[]>({ queryKey: ['roles'], queryFn: () => fetchRoles() });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Roles</h3>
      {isLoading ? (
        <div className="text-sm text-gray-500">Loading roles...</div>
      ) : roles.length === 0 ? (
        <div className="text-sm text-gray-500">No roles found.</div>
      ) : (
        <ul className="space-y-1">
          {roles.map((role) => (
            <li key={role.id} className="flex items-center justify-between">
              <span className="text-sm text-gray-800">{role.name}</span>
              <span className="text-xs text-gray-500">{role.isActive ? 'Active' : 'Inactive'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
