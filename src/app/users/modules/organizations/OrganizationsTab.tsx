"use client";

import { fetchOrganizations } from '@/lib/api/setup';
import type { OrganizationDto } from '@/types/setup';
import { useQuery } from '@tanstack/react-query';

export default function OrganizationsTab() {
  const { data: orgs = [], isLoading } = useQuery<OrganizationDto[]>({ queryKey: ['orgs'], queryFn: () => fetchOrganizations() });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Organizations</h3>
      {isLoading ? (
        <div className="text-sm text-gray-500">Loading organizations...</div>
      ) : orgs.length === 0 ? (
        <div className="text-sm text-gray-500">No organizations found.</div>
      ) : (
        <ul className="space-y-1">
          {orgs.map((org) => (
            <li key={org.id} className="flex items-center justify-between">
              <span className="text-sm text-gray-800">{org.name}</span>
              {org.contactEmail && <span className="text-xs text-gray-500">{org.contactEmail}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
